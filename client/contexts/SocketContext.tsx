
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    isTrusted: boolean | null;
    setIsTrusted: (val: boolean | null) => void;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false, isTrusted: null, setIsTrusted: () => { } });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isTrusted, setIsTrusted] = useState<boolean | null>(null);

    // Initial load from storage
    useEffect(() => {
        AsyncStorage.getItem('isTrusted').then(val => {
            if (val !== null) setIsTrusted(val === 'true');
        });
    }, []);

    useEffect(() => {
        let newSocket: Socket | null = null;

        const connect = async () => {
            const token = await AsyncStorage.getItem('token');
            const userStr = await AsyncStorage.getItem('user');

            if (!token || !userStr) return;

            const user = JSON.parse(userStr);
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3000'; // Fallback
            const socketUrl = apiUrl.split(',')[0].trim();

            console.log('Connecting to socket:', socketUrl);

            newSocket = io(socketUrl, {
                transports: ['websocket'],
                auth: { token }
            });

            newSocket.on('connect', () => {
                console.log('Socket connected');
                setIsConnected(true);
                newSocket?.emit('join_room', `faculty_${user.id}`);
            });

            newSocket.on('disconnect', () => {
                console.log('Socket disconnected');
                setIsConnected(false);
            });

            newSocket.on('devices_updated', async (data: { devices: any[] }) => {
                console.log('Socket: Global devices_updated event received');
                const { getDeviceId } = await import('@/utils/device');
                const deviceId = await getDeviceId();
                const currentDevice = data.devices.find((d: any) => d.deviceId === deviceId);

                const newStatus = currentDevice ? currentDevice.isTrusted : false;
                setIsTrusted(newStatus);
                await AsyncStorage.setItem('isTrusted', String(newStatus));
            });

            setSocket(newSocket);
        };

        connect();

        return () => {
            if (newSocket) newSocket.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected, isTrusted, setIsTrusted }}>
            {children}
        </SocketContext.Provider>
    );
};
