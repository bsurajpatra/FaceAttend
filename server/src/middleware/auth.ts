import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

export function verifyFacultyToken(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const token = authHeader.substring('Bearer '.length).trim();
    const payload = jwt.verify(token, env.jwtSecret) as { sub?: string };
    if (!payload?.sub) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized' });
  }
}


