import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setUnauthHandler } from '../api/http';

const isTokenExpired = (token: string): boolean => {
    try {
        const payloadBase64 = token.split('.')[1];
        if (!payloadBase64) return true;
        
        let decodedJson;
        if (typeof atob === 'function') {
            decodedJson = atob(payloadBase64);
        } else {
            const Buffer = require('buffer').Buffer;
            decodedJson = Buffer.from(payloadBase64, 'base64').toString('ascii');
        }
        
        const payload = JSON.parse(decodedJson);
        if (payload.exp) {
            const currentTime = Math.floor(Date.now() / 1000);
            return payload.exp < currentTime;
        }
        return false;
    } catch (e) {
        return true;
    }
};

interface User {
    id: string;
    name: string;
    username: string;
}

interface AuthContextType {
    isLoggedIn: boolean;
    user: User | null;
    isLoading: boolean;
    login: (user: User, token: string, isTrusted: boolean) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadAuthState = async () => {
            try {
                const savedUser = await AsyncStorage.getItem('user');
                const savedToken = await AsyncStorage.getItem('token');
                if (savedUser && savedToken) {
                    if (isTokenExpired(savedToken)) {
                        await AsyncStorage.removeItem('user');
                        await AsyncStorage.removeItem('token');
                        await AsyncStorage.removeItem('isTrusted');
                    } else {
                        setUser(JSON.parse(savedUser));
                        setIsLoggedIn(true);
                    }
                }
            } catch (e) {
                console.error('Failed to load auth state', e);
            } finally {
                setIsLoading(false);
            }
        };
        
        setUnauthHandler(() => {
            logout();
        });
        
        loadAuthState();
    }, []);

    const login = async (user: User, token: string, isTrusted: boolean) => {
        await AsyncStorage.setItem('user', JSON.stringify(user));
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('isTrusted', String(isTrusted));
        setUser(user);
        setIsLoggedIn(true);
    };

    const logout = async () => {
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('isTrusted');
        setUser(null);
        setIsLoggedIn(false);
    };

    return (
        <AuthContext.Provider value={{ isLoggedIn, user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
