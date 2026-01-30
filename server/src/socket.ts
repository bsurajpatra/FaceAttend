
import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

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

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on('join_room', (room) => {
            console.log(`Socket ${socket.id} joined room: ${room}`);
            socket.join(room);
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
