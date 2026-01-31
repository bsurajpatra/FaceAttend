import { Request, Response, NextFunction } from 'express';
import { Faculty } from '../models/Faculty';

export async function verifyTrustedDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const userId = req.userId;
        const deviceId = req.header('X-Device-Id');

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        if (!deviceId) {
            res.status(403).json({
                message: 'Attendance operations are restricted to trusted devices only.',
                code: 'DEVICE_NOT_TRUSTED'
            });
            return;
        }

        const faculty = await Faculty.findById(userId);
        if (!faculty) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const device = faculty.devices.find(d => d.deviceId === deviceId);
        if (!device || !device.isTrusted) {
            res.status(403).json({
                message: 'This device is not trusted. Attendance operations are blocked.',
                code: 'DEVICE_NOT_TRUSTED'
            });
            return;
        }

        next();
    } catch (error) {
        console.error('Device trust verification error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
