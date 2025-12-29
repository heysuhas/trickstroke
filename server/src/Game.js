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
            rounds: CONFIG.DEFAULT_ROUNDS,
            turnTime: CONFIG.DEFAULT_TURN_TIME,
            discussionTime: CONFIG.DEFAULT_DISCUSSION_TIME,
            votingTime: CONFIG.DEFAULT_VOTING_TIME
        };

        // Game State
        this.tricksterId = null;
        this.secretWord = null;
        this.tricksterOptions = null;
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

    removePlayer(socketId) {
        const index = this.players.findIndex(p => p.id === socketId);
        if (index !== -1) {
            if (this.phase === GAME_PHASES.LOBBY) {
                // In Lobby, fully remove the player so they can rejoin or name can be reused
                this.players.splice(index, 1);

                // If Host left, assign new host if anyone remains
                if (this.hostId === socketId && this.players.length > 0) {
                    this.hostId = this.players[0].id;
                }
            } else {
                // In Game, just mark disconnected to preserve game state/turns
                this.players[index].isConnected = false;
                if (this.hostId === socketId) {
                    const nextHost = this.players.find(p => p.isConnected && p.id !== socketId);
                    if (nextHost) this.hostId = nextHost.id;
                }
            }

            this.broadcastState();

            if (this.phase === GAME_PHASES.WORD_SUBMISSION) {
                const currentDrawer = this.drawOrder[this.currentDrawerIndex];
                if (socketId === currentDrawer) {
                    clearTimeout(this.timer);
                    this.nextTurn();
                }
            }
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
        return {
            partyId: this.partyId,
            players: this.players.map(p => ({
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
            currentRound: this.currentRound,
            skipVotesCount: this.skipVotes.size,
            settings: this.settings // Send settings to client if needed
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
        if (config.rounds) this.settings.rounds = parseInt(config.rounds);
        if (config.turnTime) this.settings.turnTime = parseInt(config.turnTime);
        if (config.discussionTime) this.settings.discussionTime = parseInt(config.discussionTime);

        this.currentRound = 1;
        this.usedSecretWords.clear();
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
        this.submittedWords = [];
        this.votes.clear();
        this.skipVotes.clear();

        const tricksterIndex = Math.floor(Math.random() * this.players.length);
        this.tricksterId = this.players[tricksterIndex].id;

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
        this.startTimer(this.settings.turnTime, () => {
            this.nextTurn();
        });
    }

    handleWordSubmission(socketId, word) {
        const currentDrawer = this.drawOrder[this.currentDrawerIndex];
        if (socketId !== currentDrawer || this.phase !== GAME_PHASES.WORD_SUBMISSION) return;

        const cleanWord = word.trim().toLowerCase();
        const cleanSecret = this.secretWord.toLowerCase();

        // VALDATION: Check for exact match OR containing/contained secret word
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

        clearTimeout(this.timer);
        this.nextTurn();
    }

    startDiscussion() {
        this.phase = GAME_PHASES.DISCUSSION;
        this.skipVotes.clear();
        clearTimeout(this.timer);
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
            clearTimeout(this.timer);
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

        // SCORING LOGIC
        // Tie = Trickster Scapes (Wins Round) ? Or No One Wins?
        // Let's say Tie -> No one dies -> Trickster wins round points -> +50
        // If caught -> Artists +100
        // If not caught (wrong person) -> Trickster +200

        let winner = '';
        if (isTie) {
            winner = 'TRICKSTER (TIE)';
            // Trickster gets partial points for surviving via tie?
            const trickster = this.players.find(p => p.id === this.tricksterId);
            if (trickster) trickster.score += 50;
        } else {
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

        // Decide Next Phase
        if (this.currentRound < this.settings.rounds) {
            // Intermission Phase
            this.phase = GAME_PHASES.LEADERBOARD;
            this.currentRound++;

            // Broadcast Result + Leaderboard
            // We attach resultData to the state update or send separate event?
            // Let's rely on update_state having lastResult
            this.io.to(this.partyId).emit('round_end', resultData);
            this.broadcastState(); // State has scores

            setTimeout(() => {
                this.startRound();
            }, 8000); // 8 seconds to view leaderboard
        } else {
            // Final Game Over
            this.phase = GAME_PHASES.GAME_OVER;
            this.io.to(this.partyId).emit('game_over', resultData); // Final result
            this.broadcastState();

            setTimeout(() => {
                this.phase = GAME_PHASES.LOBBY;
                this.players.forEach(p => p.score = 0); // Reset scores
                this.broadcastState();
            }, 15000); // 15 seconds to view final winner
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
