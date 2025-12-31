import { v4 as uuidv4 } from 'uuid';
import { GAME_PHASES, CONFIG, EVENTS, WORD_LIST } from './constants.js';

export class Game {
    constructor(io, partyId) {
        this.io = io;
        this.partyId = partyId;
        this.players = [];
        this.phase = GAME_PHASES.LOBBY;
        this.hostId = null;

        // Configurable Game Settings
        this.settings = {
            matches: 3, // Default matches
            artistTime: 15,
            tricksterTime: 25,
            discussionTime: CONFIG.DEFAULT_DISCUSSION_TIME,
            votingTime: CONFIG.DEFAULT_VOTING_TIME
        };

        // Game State
        this.tricksterId = null;
        this.secretWord = null;
        this.tricksterOptions = null;
        this.currentMatch = 1;
        this.currentRound = 1;

        this.drawOrder = [];
        this.currentDrawerIndex = -1;
        this.timer = null;
        this.timeLeft = 0;

        this.submittedWords = [];
        this.votes = new Map();
        this.scores = new Map();
        this.skipVotes = new Set();

        this.usedSecretWords = new Set();
    }

    addPlayer(socket, name) {
        const trimmedName = name.trim();
        // Check for duplicate name (case-insensitive)
        const nameExists = this.players.some(p => p.name.toLowerCase() === trimmedName.toLowerCase() && p.isConnected);
        if (nameExists) {
            socket.emit(EVENTS.ERROR, { message: `Username '${trimmedName}' is already taken!` });
            return;
        }

        const player = {
            id: socket.id,
            name: trimmedName,
            socket,
            isConnected: true,
            score: 0
        };

        this.players.push(player);
        if (!this.hostId) this.hostId = player.id;

        socket.emit(EVENTS.UPDATE_STATE, this.getPublicState());
        socket.to(this.partyId).emit(EVENTS.UPDATE_STATE, this.getPublicState());

        this.setupPlayerListeners(socket);
    }

    reconnectPlayer(socket, oldId) {
        const playerIndex = this.players.findIndex(p => p.id === oldId);
        if (playerIndex === -1) return;

        const player = this.players[playerIndex];
        player.isConnected = true;
        player.socket = socket;

        // Update ID references
        const newId = socket.id;
        player.id = newId;

        // Update Host
        if (this.hostId === oldId) this.hostId = newId;

        // Update Trickster
        if (this.tricksterId === oldId) this.tricksterId = newId;

        // Update Draw Order
        this.drawOrder = this.drawOrder.map(id => id === oldId ? newId : id);

        // Update Votes (Values are target IDs, Keys are voter IDs)
        // 1. If they voted:
        if (this.votes.has(oldId)) {
            const vote = this.votes.get(oldId);
            this.votes.delete(oldId);
            this.votes.set(newId, vote);
        }
        // 2. If they were voted for:
        for (const [voter, target] of this.votes.entries()) {
            if (target === oldId) this.votes.set(voter, newId);
        }

        // Update Skip Votes
        if (this.skipVotes.has(oldId)) {
            this.skipVotes.delete(oldId);
            this.skipVotes.add(newId);
        }

        // Update Submitted Words
        this.submittedWords.forEach(w => {
            if (w.playerId === oldId) w.playerId = newId;
        });

        // Send latest state
        socket.emit(EVENTS.UPDATE_STATE, this.getPublicState());

        // Inform they need to wait for next round if in middle of one
        // Unless they are the current drawer?
        // If they are current drawer, they can continue!
        const isMyTurn = this.phase === GAME_PHASES.WORD_SUBMISSION && this.drawOrder[this.currentDrawerIndex] === newId;
        if (isMyTurn) {
            socket.emit('turn_start', { drawerId: newId });
            // Resend trickster options if needed? Valid point.
            if (newId === this.tricksterId && this.currentDrawerIndex === 0 && this.tricksterOptions) {
                socket.emit('trickster_turn_start', { options: this.tricksterOptions });
            }
        } else {
            // Re-send role info
            const isTrickster = newId === this.tricksterId;
            socket.emit('role_assigned', {
                role: isTrickster ? 'TRICKSTER' : 'ARTIST',
                word: isTrickster ? null : this.secretWord
            });
        }

        socket.to(this.partyId).emit(EVENTS.UPDATE_STATE, this.getPublicState());
        this.setupPlayerListeners(socket);
    }

    removePlayer(socketId) {
        const index = this.players.findIndex(p => p.id === socketId);
        if (index === -1) return;

        console.log(`Player ${this.players[index].name} disconnected`);

        if (this.phase === GAME_PHASES.LOBBY) {
            this.players.splice(index, 1);
            if (this.hostId === socketId && this.players.length > 0) {
                this.hostId = this.players[0].id; // Assign new host
            }
        } else {
            // IN GAME
            const player = this.players[index];
            player.isConnected = false;

            // 1. Trickster Disconnected?
            if (socketId === this.tricksterId && this.phase !== GAME_PHASES.GAME_OVER && this.phase !== GAME_PHASES.LEADERBOARD) {
                this.handleTricksterDisconnect(player.name);
                return; // Match ends, so no need to check other things
            }

            // 2. Voting Phase?
            if (this.phase === GAME_PHASES.VOTING || this.phase === GAME_PHASES.DISCUSSION) {
                // Re-check if we have enough votes/skips now that connected count changed
                const connectedCount = this.players.filter(p => p.isConnected).length;
                if (this.phase === GAME_PHASES.VOTING && this.votes.size >= connectedCount) {
                    clearInterval(this.timer);
                    this.finalizeVotes();
                } else if (this.phase === GAME_PHASES.DISCUSSION && this.skipVotes.size >= connectedCount) {
                    this.startVoting();
                }
            }

            // 3. Active Drawer Disconnected?
            if (this.phase === GAME_PHASES.WORD_SUBMISSION) {
                const currentDrawer = this.drawOrder[this.currentDrawerIndex];
                if (socketId === currentDrawer) {
                    clearInterval(this.timer);
                    this.nextTurn();
                }
            }

            // If Host left, reassign
            if (this.hostId === socketId) {
                const nextHost = this.players.find(p => p.isConnected && p.id !== socketId);
                if (nextHost) this.hostId = nextHost.id;
            }
        }

        this.broadcastState();
    }

    handleTricksterDisconnect(name) {
        // MATCH ENDS PREMATURELY -> ARTISTS WIN? OR DRAW?
        // Let's give it to Artists for now, or just generic "Trickster Left"
        console.log("Trickster disconnected, ending match.");

        const resultData = {
            winner: 'ARTISTS (TRICKSTER LEFT)',
            tricksterId: this.tricksterId,
            votedOutId: null,
            secretWord: this.secretWord,
            votes: {}
        };

        // Give remaining artists points?
        this.players.forEach(p => {
            if (p.id !== this.tricksterId && p.isConnected) p.score += 100;
        });

        this.io.to(this.partyId).emit('round_end', resultData);
        // Show Leaderboard then Next Match
        this.phase = GAME_PHASES.LEADERBOARD;
        this.broadcastState();

        if (this.currentMatch < this.settings.matches) {
            this.currentMatch++;
            setTimeout(() => this.startMatch(), 6000);
        } else {
            // Game Over
            this.phase = GAME_PHASES.GAME_OVER;
            this.io.to(this.partyId).emit('game_over', resultData);
            this.broadcastState();
            setTimeout(() => {
                this.phase = GAME_PHASES.LOBBY;
                this.players.forEach(p => p.score = 0);
                this.broadcastState();
            }, 10000);
        }
    }

    setupPlayerListeners(socket) {
        socket.on(EVENTS.START_GAME, (config) => {
            if (socket.id === this.hostId && this.phase === GAME_PHASES.LOBBY) {
                this.startGame(config);
            }
        });

        socket.on(EVENTS.SUBMIT_WORD, (word) => this.handleWordSubmission(socket.id, word));
        socket.on(EVENTS.SEND_CHAT, (msg) => this.handleChat(socket.id, msg));
        socket.on(EVENTS.SUBMIT_VOTE, (targetId) => this.handleVote(socket.id, targetId));
        socket.on(EVENTS.VOTE_SKIP, () => this.handleSkipVote(socket.id));
        socket.on('trickster_pick_word', () => { });
    }

    getPublicState() {
        // Filter out disconnected players so they don't appear in lists
        const connectedPlayers = this.players.filter(p => p.isConnected);

        return {
            partyId: this.partyId,
            players: connectedPlayers.map(p => ({
                id: p.id,
                name: p.name,
                isConnected: p.isConnected,
                isHost: p.id === this.hostId,
                score: p.score
            })),
            phase: this.phase,
            currentDrawerId: this.drawOrder[this.currentDrawerIndex] || null,
            timeLeft: this.timeLeft,
            submittedWords: this.submittedWords,
            currentMatch: this.currentMatch,
            currentRound: this.currentRound,
            skipVotesCount: this.skipVotes.size,
            settings: this.settings
        };
    }

    broadcastState() {
        this.io.to(this.partyId).emit(EVENTS.UPDATE_STATE, this.getPublicState());
    }

    startGame(config = {}) {
        if (this.players.length < CONFIG.MIN_PLAYERS) {
            this.io.to(this.hostId).emit(EVENTS.ERROR, { message: `Need at least ${CONFIG.MIN_PLAYERS} players to start!` });
            return;
        }

        // Apply Config
        if (config.matches) this.settings.matches = parseInt(config.matches);
        if (config.artistTime) this.settings.artistTime = parseInt(config.artistTime);
        if (config.tricksterTime) this.settings.tricksterTime = parseInt(config.tricksterTime);
        if (config.discussionTime) this.settings.discussionTime = parseInt(config.discussionTime);

        this.currentMatch = 1;
        this.usedSecretWords.clear();
        this.startMatch();
    }

    startMatch() {
        // MATCH START: Pick New Trickster, Reset Round Count
        this.currentRound = 1;
        const tricksterIndex = Math.floor(Math.random() * this.players.length);
        this.tricksterId = this.players[tricksterIndex].id;

        this.startRound();
    }

    getUniqueWord() {
        const available = WORD_LIST.filter(w => !this.usedSecretWords.has(w));
        if (available.length === 0) {
            this.usedSecretWords.clear();
            return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
        }
        return available[Math.floor(Math.random() * available.length)];
    }

    startRound() {
        // ROUND START: New Word, Reshuffle Turn Order, Keep Same Trickster
        this.submittedWords = [];
        this.votes.clear();
        this.skipVotes.clear();

        const word = this.getUniqueWord();
        this.secretWord = word;
        this.usedSecretWords.add(word);

        this.drawOrder = this.players.map(p => p.id).sort(() => Math.random() - 0.5);

        this.players.forEach(p => {
            const isTrickster = p.id === this.tricksterId;
            const roleData = {
                role: isTrickster ? 'TRICKSTER' : 'ARTIST',
                word: isTrickster ? null : this.secretWord
            };
            p.socket.emit('role_assigned', roleData);
        });

        this.phase = GAME_PHASES.ROLE_ASSIGNMENT;
        this.broadcastState();

        setTimeout(() => this.startWordSubmissionPhase(), 3000);
    }

    startWordSubmissionPhase() {
        this.phase = GAME_PHASES.WORD_SUBMISSION;
        this.currentDrawerIndex = -1;
        this.nextTurn();
    }

    nextTurn() {
        this.currentDrawerIndex++;

        if (this.currentDrawerIndex >= this.drawOrder.length) {
            this.startDiscussion();
            return;
        }

        const drawerId = this.drawOrder[this.currentDrawerIndex];

        const drawer = this.players.find(p => p.id === drawerId);
        if (!drawer || !drawer.isConnected) {
            this.nextTurn();
            return;
        }

        const isTrickster = drawerId === this.tricksterId;
        const turnDuration = isTrickster ? this.settings.tricksterTime : this.settings.artistTime;

        if (this.currentDrawerIndex === 0 && isTrickster) {
            const options = [this.secretWord];
            while (options.length < 4) {
                const rand = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
                if (!options.includes(rand)) options.push(rand);
            }
            this.tricksterOptions = options.sort(() => Math.random() - 0.5);

            this.io.to(drawerId).emit('trickster_turn_start', { options: this.tricksterOptions });
        } else {
            this.io.to(this.partyId).emit('turn_start', { drawerId });
        }

        this.broadcastState();
        this.startTimer(turnDuration, () => {
            this.nextTurn();
        });
    }

    handleWordSubmission(socketId, word) {
        const currentDrawer = this.drawOrder[this.currentDrawerIndex];
        // Allow submission if it's their turn
        if (socketId !== currentDrawer || this.phase !== GAME_PHASES.WORD_SUBMISSION) return;

        const cleanWord = word.trim().toLowerCase();
        const cleanSecret = this.secretWord.toLowerCase();

        // VALDATION: Check for exact match OR containing/contained secret word
        // Exceptions for Trickster? No, Trickster also forbidden from saying secret word usually?
        // Actually, Trickster WANTS to blend in. If they say the secret word, they are essentially proving they know it (if 1st turn, suspicious. if later, normal).
        // But game rules usually forbid artists from saying it. Trickster can?
        // Let's keep rule for everyone for now to prevent easy "I am innocent" proofs.
        if (cleanWord === cleanSecret || cleanWord.includes(cleanSecret) || cleanSecret.includes(cleanWord)) {
            this.io.to(socketId).emit(EVENTS.ERROR, { message: `Too close to the secret word!` });
            return;
        }

        const alreadyUsed = this.submittedWords.some(w => w.word.toLowerCase() === cleanWord);
        if (alreadyUsed) {
            this.io.to(socketId).emit(EVENTS.ERROR, { message: `Word already used!` });
            return;
        }

        const player = this.players.find(p => p.id === socketId);
        this.submittedWords.push({
            playerId: socketId,
            name: player.name,
            word: word.trim()
        });

        clearInterval(this.timer);
        this.nextTurn();
    }

    startDiscussion() {
        this.phase = GAME_PHASES.DISCUSSION;
        this.skipVotes.clear();
        clearInterval(this.timer);
        this.broadcastState();
        this.startTimer(this.settings.discussionTime, () => this.startVoting());
    }

    handleSkipVote(socketId) {
        if (this.phase !== GAME_PHASES.DISCUSSION) return;
        this.skipVotes.add(socketId);

        const connectedCount = this.players.filter(p => p.isConnected).length;
        if (this.skipVotes.size >= connectedCount) {
            this.startVoting();
        } else {
            this.broadcastState();
        }
    }

    handleChat(socketId, msg) {
        const player = this.players.find(p => p.id === socketId);
        if (player && (this.phase === GAME_PHASES.DISCUSSION || this.phase === GAME_PHASES.LOBBY)) {
            this.io.to(this.partyId).emit(EVENTS.NEW_CHAT, {
                sender: player.name,
                text: msg,
                id: uuidv4()
            });
        }
    }

    startVoting() {
        this.phase = GAME_PHASES.VOTING;
        this.broadcastState();
        this.startTimer(this.settings.votingTime, () => this.finalizeVotes());
    }

    handleVote(socketId, targetId) {
        if (this.phase !== GAME_PHASES.VOTING) return;
        this.votes.set(socketId, targetId);
        const connectedCount = this.players.filter(p => p.isConnected).length;
        if (this.votes.size >= connectedCount) {
            clearInterval(this.timer);
            this.finalizeVotes();
        }
    }

    finalizeVotes() {
        const voteCounts = {};
        for (const target of this.votes.values()) {
            voteCounts[target] = (voteCounts[target] || 0) + 1;
        }

        let maxVotes = 0;
        let votedOutId = null;
        let isTie = false;

        for (const [pid, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) {
                maxVotes = count;
                votedOutId = pid;
                isTie = false;
            } else if (count === maxVotes) {
                isTie = true;
            }
        }

        let winner = '';
        let matchEnded = false;

        if (votedOutId === 'SKIP') {
            // SKIP VOTED -> NEXT ROUND, SAME MATCH
            winner = 'NO ONE (SKIPPED)';
            const trickster = this.players.find(p => p.id === this.tricksterId);
            if (trickster) trickster.score += 50;
            votedOutId = null;
            matchEnded = false; // Continue Match
        } else if (isTie) {
            // TIE -> TRICKSTER SURVIVES BUT MATCH ENDS? 
            // OR TIE -> NO ONE DIES -> NEXT ROUND? 
            // Usually Tie = Trickster Wins Round/Match. Let's say Tie ends Match favoring Trickster.
            winner = 'TRICKSTER (TIE)';
            const trickster = this.players.find(p => p.id === this.tricksterId);
            if (trickster) trickster.score += 50;
            matchEnded = true;
        } else {
            // ELIMINATION -> MATCH ENDS
            matchEnded = true;
            if (votedOutId === this.tricksterId) {
                winner = 'ARTISTS';
                this.players.forEach(p => {
                    if (p.id !== this.tricksterId) p.score += 100;
                });
            } else {
                winner = 'TRICKSTER';
                const trickster = this.players.find(p => p.id === this.tricksterId);
                if (trickster) trickster.score += 200;
            }
        }

        const resultData = {
            winner,
            tricksterId: this.tricksterId,
            votedOutId: votedOutId,
            secretWord: this.secretWord,
            votes: Object.fromEntries(this.votes)
        };

        // Broadcast Round Result
        // Broadcast Round Result
        this.io.to(this.partyId).emit('round_end', resultData);

        // Show Leaderboard regardless of outcome
        this.phase = GAME_PHASES.LEADERBOARD;
        this.broadcastState();

        if (!matchEnded) {
            // NEXT ROUND (SAME MATCH)
            this.currentRound++;
            setTimeout(() => {
                this.startRound();
            }, 6000);
        } else {
            // MATCH ENDED -> CHECK IF GAME OVER
            if (this.currentMatch < this.settings.matches) {
                // NEXT MATCH
                this.currentMatch++;
                setTimeout(() => {
                    this.startMatch();
                }, 8000);
            } else {
                // GAME OVER
                this.phase = GAME_PHASES.GAME_OVER;
                this.io.to(this.partyId).emit('game_over', resultData);
                this.broadcastState();

                setTimeout(() => {
                    this.phase = GAME_PHASES.LOBBY;
                    this.players.forEach(p => p.score = 0);
                    this.broadcastState();
                }, 15000);
            }
        }
    }

    startTimer(seconds, callback) {
        this.timeLeft = seconds;
        if (this.timer) clearInterval(this.timer);

        this.timer = setInterval(() => {
            this.timeLeft--;
            if (this.timeLeft % 5 === 0) {
                this.broadcastState();
            }

            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                if (callback) callback();
            }
        }, 1000);
    }
}
