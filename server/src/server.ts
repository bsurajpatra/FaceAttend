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

  httpServer.listen(env.port, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on all interfaces at port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', error);
  process.exit(1);
});


