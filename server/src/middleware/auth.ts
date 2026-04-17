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

    // 2. Check Redis for active session (only if Redis is available)
    // This allows for immediate logout/invalidation without DB hit
    let isMember = true; // Assume true if Redis is down (graceful degradation)
    
    if (redisClient.isOpen) {
      try {
        const isMemberResult = await redisClient.sIsMember(`session:${userId}`, token);
        isMember = Boolean(isMemberResult);
      } catch (e: any) {
        if (e.message && e.message.includes('WRONGTYPE')) {
          // Fallback for legacy string session
          const legacyToken = await redisClient.get(`session:${userId}`);
          if (legacyToken) {
            if (legacyToken === token) {
              isMember = true;
              // Migrate string to set
              await redisClient.del(`session:${userId}`);
              await redisClient.sAdd(`session:${userId}`, token);
              await redisClient.expire(`session:${userId}`, 604800);
              console.log(`🔄 Seamlessly migrated legacy string session to set for user: ${userId}`);
            } else {
              isMember = false;
              console.log(`❌ Legacy session token mismatch for user: ${userId}`);
            }
          } else {
            isMember = false;
          }
        } else {
          console.warn('⚠️ Redis session check failed, falling back to JWT only:', e.message);
          isMember = true; // Fallback
        }
      }
    } else {
      console.warn('⚠️ Redis unavailable, proceeding with JWT-only auth for user:', userId);
    }
    
    if (!isMember) {
      console.log(`❌ Session not found or token mismatch in Redis for user: ${userId}`);
      res.status(401).json({ message: 'Session expired or logged out. Please login again.' });
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
