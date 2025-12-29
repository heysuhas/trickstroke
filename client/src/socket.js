import { io } from 'socket.io-client';

// Use environment variable/window location or hardcoded local for MVP
const URL = 'http://localhost:3000';

export const socket = io(URL, {
    autoConnect: false
});
