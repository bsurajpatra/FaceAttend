import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSecureItem, setSecureItem, removeSecureItem } from '@/utils/secure-storage';
import { setUnauthHandler } from '../api/http';
import { logEvent } from '../utils/audit-logger';


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
                const savedUser = await getSecureItem('user');
                const savedToken = await getSecureItem('token');
                if (savedUser && savedToken) {
                    // Token is treated opaquely and validated purely server-side.
                    // If it is expired/invalid, our global 401 HTTP interceptor will trigger logout().
                    setUser(JSON.parse(savedUser));
                    setIsLoggedIn(true);
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
        await setSecureItem('user', JSON.stringify(user));
        await setSecureItem('token', token);
        await setSecureItem('isTrusted', String(isTrusted));
        await logEvent('Auth', `User logged in: ${user.username}`);
        setUser(user);
        setIsLoggedIn(true);
    };

    const logout = async () => {
        await removeSecureItem('user');
        await removeSecureItem('token');
        await removeSecureItem('isTrusted');
        await logEvent('Auth', `User logged out`);
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
