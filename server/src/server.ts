import { createApp } from './app';
import { connectToDatabase } from './config/db';
import { env } from './config/env';

import { createServer } from 'http';
import { initSocket } from './socket';

async function bootstrap(): Promise<void> {
  await connectToDatabase();
  const app = createApp();
  const httpServer = createServer(app);

  // Initialize Socket.io
  initSocket(httpServer);

  // Start background sync jobs
  const { startAttendanceSyncJob } = require('./services/attendanceSync');
  startAttendanceSyncJob();

  // Start BullMQ Worker
  require('./queues/attendance.worker');

  const server = httpServer.listen(env.port, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on all interfaces at port ${env.port}`);
  });

  // Graceful shutdown to clear port blocks on Windows restarts
  const shutdown = () => {
    console.log('Shutting down server, releasing port...');
    server.close(() => {
      console.log('Port released.');
      process.exit(0);
    });
    // Force exit if hanging (e.g., active BullMQ/Redis connections)
    setTimeout(() => process.exit(1), 3000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('SIGUSR2', shutdown);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', error);
  process.exit(1);
});


