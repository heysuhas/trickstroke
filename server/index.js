import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { RoomManager } from "./src/RoomManager.js";

const app = express();

/**
 * CORS configuration
 * Replace with your Vercel domain after deployment
 */
const FRONTEND_URL = process.env.FRONTEND_URL || "*";

app.use(cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST"]
}));

/**
 * Health check (important for Render)
 */
app.get("/", (req, res) => {
    res.status(200).send("Server is running");
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: FRONTEND_URL,
        methods: ["GET", "POST"]
    }
});

const roomManager = new RoomManager(io);

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    roomManager.handleConnection(socket);

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        roomManager.handleDisconnect(socket);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
