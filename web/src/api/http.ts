import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL;
if (!rawApiUrl) {
    throw new Error('VITE_API_URL is not defined in the environment');
}
const API_URL = rawApiUrl.split(',')[0].trim();

export const http = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

http.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

http.interceptors.response.use(
    (response) => response,
    (error) => {
        const errorMsg = error.response?.data?.message?.toLowerCase() || '';
        const isAuthError = error.response?.status === 401;

        // Don't auto-logout if the error message is about credentials (incorrect old password)
        // This allows individual components to handle user-facing credential errors with status 401 or 400.
        const isCredentialMismatch = errorMsg.includes('password') || errorMsg.includes('credentials') || errorMsg.includes('otp') || errorMsg.includes('code');

        if (isAuthError && !isCredentialMismatch) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);
