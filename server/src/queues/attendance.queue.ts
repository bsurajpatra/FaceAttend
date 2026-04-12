import { Queue } from 'bullmq';
import { env } from '../config/env';

// Connection options for Redis
const connection = {
  url: env.redisUrl
};

// Create the attendance processing queue
export const attendanceQueue = new Queue('attendance-processing', { 
  connection: {
    host: '127.0.0.1', // BullMQ usually prefers host/port for internal reasons in some configs
    port: 6379
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

console.log('📦 BullMQ: Attendance Queue initialized');
