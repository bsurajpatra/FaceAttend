import { AuditLog } from '../models/AuditLog';
import { Request } from 'express';

interface LogOptions {
    action: string;
    details: string;
    req?: Request;
    facultyId?: string;
    platform?: 'Web' | 'Mobile';
    deviceId?: string;
    deviceName?: string;
}

export async function createAuditLog(options: LogOptions) {
    try {
        const { action, details, req, facultyId, platform, deviceId, deviceName } = options;

        const fId = facultyId || (req as any)?.userId;
        if (!fId) return;

        // Try to guess details from request if not provided
        const userPlatform = platform ||
            req?.headers['x-platform'] as 'Web' | 'Mobile' ||
            (req?.body?.deviceId || req?.headers['x-device-id'] ? 'Mobile' : 'Web');
        const remoteIp = req?.ip || req?.socket.remoteAddress;

        const newLog = await AuditLog.create({
            facultyId: fId,
            action,
            details,
            platform: userPlatform,
            deviceId: deviceId || req?.body?.deviceId || req?.headers['x-device-id'],
            deviceName: deviceName || req?.body?.deviceName || req?.headers['x-device-name'],
            ipAddress: remoteIp,
            timestamp: new Date()
        });

        // Push via Socket.io
        try {
            const { getIO } = await import('../socket');
            const io = getIO();
            io.to(`faculty_${fId}`).emit('new_audit_log', { log: newLog });
        } catch (socketErr) {
            console.warn('Socket emission failed for new audit log:', socketErr);
        }
    } catch (error) {
        console.error('Failed to create audit log:', error);
    }
}
