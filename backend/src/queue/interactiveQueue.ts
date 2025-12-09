import { Queue } from 'bullmq';

export const interactiveQueue = new Queue('interactiveQueue', {
  connection: { 
    host: process.env.REDIS_HOST || "redis", 
    port: parseInt(process.env.REDIS_PORT || "6379")
  }
});