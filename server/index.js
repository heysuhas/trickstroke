import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './src/RoomManager.js';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all for MVP
        methods: ["GET", "POST"]
    }
});

const roomManager = new RoomManager(io);

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    roomManager.handleConnection(socket);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        roomManager.handleDisconnect(socket);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
