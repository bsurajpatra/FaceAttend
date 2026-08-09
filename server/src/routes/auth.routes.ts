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

import { authRateLimiter } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validateRequest';
import {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyOTPSchema,
    changePasswordSchema
} from '../utils/schemas';

export const authRouter = Router();

authRouter.post('/register', validateRequest(registerSchema), authRateLimiter, register);
authRouter.post('/login', validateRequest(loginSchema), authRateLimiter, login);
authRouter.post('/logout', verifyFacultyToken, logout);
authRouter.get('/profile', verifyFacultyToken, getProfile);
authRouter.put('/profile', verifyFacultyToken, updateProfile);
authRouter.post('/change-password', verifyFacultyToken, validateRequest(changePasswordSchema), authRateLimiter, changePassword);
authRouter.get('/subjects', verifyFacultyToken, getFacultySubjects);

// Device management
authRouter.get('/devices', verifyFacultyToken, getDevices);
authRouter.delete('/devices/:deviceId', verifyFacultyToken, revokeDevice);
authRouter.post('/devices/trust', verifyFacultyToken, trustDevice);
authRouter.post('/devices/logout', verifyFacultyToken, logoutDevice);
authRouter.get('/audit-logs', verifyFacultyToken, getAuditLogs);
authRouter.post('/forgot-password', validateRequest(forgotPasswordSchema), authRateLimiter, forgotPassword);
authRouter.post('/reset-password', validateRequest(resetPasswordSchema), authRateLimiter, resetPassword);
authRouter.post('/verify-otp', validateRequest(verifyOTPSchema), authRateLimiter, verifyOTP);
authRouter.post('/resend-otp', authRateLimiter, resendOTP);
authRouter.post('/verify-2fa', authRateLimiter, verify2FA);
authRouter.post('/toggle-2fa', verifyFacultyToken, toggle2FA);
authRouter.post('/verify-2fa-toggle', verifyFacultyToken, verify2FAToggle);
authRouter.post('/resend-2fa', authRateLimiter, resend2FA);
authRouter.post('/verify-email-change', verifyFacultyToken, verifyEmailChangeOTP);
authRouter.post('/resend-email-change', verifyFacultyToken, resendEmailChangeOTP);


