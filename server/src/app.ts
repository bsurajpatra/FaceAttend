import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { authRouter } from './routes/auth.routes';
import { env } from './config/env';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const allowed = new Set(env.corsOrigins);
      if (allowed.has(origin)) return callback(null, true);

      if (env.allowLan8081) {
        const lan8081 = /^http:\/\/(10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)[0-9.]+:8081$/;
        if (lan8081.test(origin)) return callback(null, true);
      }

      callback(new Error('CORS not allowed for origin: ' + origin));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ message: 'Not Found' });
  });

  return app;
}


