import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from './config/env';

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: '*', // Allow all origins for now
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Authorization'],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    // Authentication Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            console.log('❌ Socket connection refused: No token provided');
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const payload = jwt.verify(token, env.jwtSecret) as { sub: string };
            socket.data.userId = payload.sub;
            next();
        } catch (err) {
            console.log('❌ Socket connection refused: Invalid token');
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const deviceId = (socket.handshake.query.deviceId || socket.handshake.auth.deviceId) as string;
        socket.data.deviceId = deviceId;
        console.log(`Socket connected: ${socket.id} (User: ${socket.data.userId}, Device: ${deviceId || 'Unknown'})`);

        socket.on('join_room', (room) => {
            // Only allow users to join their own rooms (safety check)
            const expectedRoom = `faculty_${socket.data.userId}`;
            if (room === expectedRoom || room === 'global' || room.startsWith('attendance_')) {
                console.log(`Socket ${socket.id} joined room: ${room}`);
                socket.join(room);
            } else {
                console.log(`⚠️ Socket ${socket.id} attempted to join unauthorized room: ${room}`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = (): SocketIOServer => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
