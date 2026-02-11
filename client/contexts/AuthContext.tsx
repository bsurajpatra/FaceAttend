import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
                    setUser(JSON.parse(savedUser));
                    setIsLoggedIn(true);
                }
            } catch (e) {
                console.error('Failed to load auth state', e);
            } finally {
                setIsLoading(false);
            }
        };
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
