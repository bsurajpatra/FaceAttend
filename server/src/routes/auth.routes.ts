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
    logoutDevice
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


