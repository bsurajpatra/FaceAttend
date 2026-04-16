import { Router } from 'express';
import {
    login,
    logout,
    register,
    getProfile,
    updateProfile,
    changePassword,
    getFacultySubjects,
    getDevices,
    revokeDevice,
    trustDevice,
    logoutDevice,
    forgotPassword,
    resetPassword,
    verifyOTP,
    resendOTP,
    verify2FA,
    toggle2FA,
    verify2FAToggle,
    resend2FA,
    verifyEmailChangeOTP,
    resendEmailChangeOTP
} from '../controllers/auth.controller';
import { getAuditLogs } from '../controllers/audit.controller';
import { verifyFacultyToken } from '../middleware/auth';

import { rateLimit } from 'express-rate-limit';

export const authRouter = Router();

// Rate limiting: 10 attempts per 15 minutes for sensitive auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: 'Too many login attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

authRouter.post('/register', authLimiter, register);
authRouter.post('/login', authLimiter, login);
authRouter.post('/logout', verifyFacultyToken, logout);
authRouter.get('/profile', verifyFacultyToken, getProfile);
authRouter.put('/profile', verifyFacultyToken, updateProfile);
authRouter.post('/change-password', verifyFacultyToken, authLimiter, changePassword);
authRouter.get('/subjects', verifyFacultyToken, getFacultySubjects);

// Device management
authRouter.get('/devices', verifyFacultyToken, getDevices);
authRouter.delete('/devices/:deviceId', verifyFacultyToken, revokeDevice);
authRouter.post('/devices/trust', verifyFacultyToken, trustDevice);
authRouter.post('/devices/logout', verifyFacultyToken, logoutDevice);
authRouter.get('/audit-logs', verifyFacultyToken, getAuditLogs);
authRouter.post('/forgot-password', authLimiter, forgotPassword);
authRouter.post('/reset-password', authLimiter, resetPassword);
authRouter.post('/verify-otp', authLimiter, verifyOTP);
authRouter.post('/resend-otp', authLimiter, resendOTP);
authRouter.post('/verify-2fa', authLimiter, verify2FA);
authRouter.post('/toggle-2fa', verifyFacultyToken, toggle2FA);
authRouter.post('/verify-2fa-toggle', verifyFacultyToken, verify2FAToggle);
authRouter.post('/resend-2fa', authLimiter, resend2FA);
authRouter.post('/verify-email-change', verifyFacultyToken, verifyEmailChangeOTP);
authRouter.post('/resend-email-change', verifyFacultyToken, resendEmailChangeOTP);


