import { createApp } from './app';
import { connectToDatabase } from './config/db';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  await connectToDatabase();
  const app = createApp();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', error);
  process.exit(1);
});


