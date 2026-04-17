import { Queue } from 'bullmq';
import { env } from '../config/env';

// Connection options for Redis
const connection = {
  url: env.redisUrl
};

// Create the attendance processing queue
export const attendanceQueue = new Queue('attendance-processing', { 
  connection: {
    url: env.redisUrl
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

attendanceQueue.on('error', (err) => {
  console.error('📦 BullMQ: Queue Error:', err.message);
});

console.log('📦 BullMQ: Attendance Queue initialized');
