import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

export function verifyFacultyToken(req: Request, res: Response, next: NextFunction): void {
  console.log('🔐 Auth middleware - verifying token');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('Authorization header:', req.header('Authorization') ? 'Present' : 'Missing');
  
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid authorization header');
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const token = authHeader.substring('Bearer '.length).trim();
    console.log('Token length:', token.length);
    
    const payload = jwt.verify(token, env.jwtSecret) as { sub?: string };
    if (!payload?.sub) {
      console.log('❌ Invalid token payload');
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    console.log('✅ Token verified, faculty ID:', payload.sub);
    req.userId = payload.sub;
    next();
  } catch (error) {
    console.log('❌ Token verification failed:', error);
    res.status(401).json({ message: 'Unauthorized' });
  }
}


