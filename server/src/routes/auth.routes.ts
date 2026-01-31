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
    resend2FA,
    verifyEmailChangeOTP
} from '../controllers/auth.controller';
import { getAuditLogs } from '../controllers/audit.controller';
import { verifyFacultyToken } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', verifyFacultyToken, logout);
authRouter.get('/profile', verifyFacultyToken, getProfile);
authRouter.put('/profile', verifyFacultyToken, updateProfile);
authRouter.post('/change-password', verifyFacultyToken, changePassword);
authRouter.get('/subjects', verifyFacultyToken, getFacultySubjects);

// Device management
authRouter.get('/devices', verifyFacultyToken, getDevices);
authRouter.delete('/devices/:deviceId', verifyFacultyToken, revokeDevice);
authRouter.post('/devices/trust', verifyFacultyToken, trustDevice);
authRouter.post('/devices/logout', verifyFacultyToken, logoutDevice);
authRouter.get('/audit-logs', verifyFacultyToken, getAuditLogs);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/verify-otp', verifyOTP);
authRouter.post('/resend-otp', resendOTP);
authRouter.post('/verify-2fa', verify2FA);
authRouter.post('/toggle-2fa', verifyFacultyToken, toggle2FA);
authRouter.post('/resend-2fa', resend2FA);
authRouter.post('/verify-email-change', verifyFacultyToken, verifyEmailChangeOTP);


