import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { authRouter } from './routes/auth.routes';
import { timetableRouter } from './routes/timetable.routes';
import { env } from './config/env';
import { studentRouter } from './routes/student.routes';
import { attendanceRouter } from './routes/attendance.routes';
import { rateLimit } from 'express-rate-limit';

export function createApp(): Application {
  const app = express();

  // Global rate limiting: 1000 requests per 15 minutes
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { message: 'Too many requests, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(globalLimiter);
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*', // Allow all request headers (x-platform, x-device-id, x-device-name, Authorization, etc.)
    credentials: false, // Set to false when using origin: '*'
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/timetable', timetableRouter);
  app.use('/api/students', studentRouter);
  app.use('/api/attendance', attendanceRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ message: 'Not Found' });
  });

  return app;
}


