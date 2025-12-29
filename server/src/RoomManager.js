import { v4 as uuidv4 } from 'uuid';
import { Game } from './Game.js';
import { EVENTS } from './constants.js';

export class RoomManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map(); // partyId -> Game instance
        this.playerMap = new Map(); // socketId -> partyId
    }

    handleConnection(socket) {
        socket.on(EVENTS.CREATE_PARTY, (data) => this.createParty(socket, data));
        socket.on(EVENTS.JOIN_PARTY, (data) => this.joinParty(socket, data));
    }

    handleDisconnect(socket) {
        const partyId = this.playerMap.get(socket.id);
        if (partyId) {
            const game = this.rooms.get(partyId);
            if (game) {
                game.removePlayer(socket.id);
                if (game.players.length === 0) {
                    this.rooms.delete(partyId);
                }
            }
            this.playerMap.delete(socket.id);
        }
    }

    createParty(socket, { playerName }) {
        console.log('Creating party for:', playerName);
        const partyId = uuidv4().slice(0, 6).toUpperCase();
        const game = new Game(this.io, partyId);

        this.rooms.set(partyId, game);

        this.joinParty(socket, { partyId, playerName });
    }

    joinParty(socket, { partyId, playerName }) {
        console.log('Joining party:', partyId, 'Player:', playerName);
        const game = this.rooms.get(partyId);
        if (!game) {
            socket.emit(EVENTS.ERROR, { message: 'Party not found' });
            return;
        }

        if (game.hasStarted) {
            // Handle reconnect logic here if needed, for now just block join
            // Or if simple MVP, just error
            socket.emit(EVENTS.ERROR, { message: 'Game already in progress' });
            return;
        }

        // Join the socket room
        socket.join(partyId);
        this.playerMap.set(socket.id, partyId);

        // Add player to game state
        game.addPlayer(socket, playerName);
    }
}
