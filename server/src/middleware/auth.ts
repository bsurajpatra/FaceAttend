import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import redisClient from '../config/redis';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

export async function verifyFacultyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  // console.log('🔐 Auth middleware - verifying token');
  
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const token = authHeader.substring('Bearer '.length).trim();
    
    // 1. Verify JWT signature
    const payload = jwt.verify(token, env.jwtSecret) as { sub?: string };
    if (!payload?.sub) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    const userId = payload.sub;

    // 2. Check Redis for active session
    // This allows for immediate logout/invalidation without DB hit
    const activeToken = await redisClient.get(`session:${userId}`);
    
    if (!activeToken) {
      console.log(`❌ Session not found in Redis for user: ${userId}`);
      res.status(401).json({ message: 'Session expired or logged out' });
      return;
    }

    if (activeToken !== token) {
      console.log(`❌ Token mismatch in Redis for user: ${userId}`);
      res.status(401).json({ message: 'Another session is active. Please login again.' });
      return;
    }

    // console.log('✅ Session verified via Redis, faculty ID:', userId);
    req.userId = userId;
    next();
  } catch (error) {
    console.log('❌ Token verification failed:', error);
    res.status(401).json({ message: 'Unauthorized' });
  }
}
