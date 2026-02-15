import { Queue, Worker } from 'bullmq';

const redisConnection = {
  host: process.env.REDIS_HOST || "redis",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null, 
  lazyConnect: false
};

export const interactiveQueue = new Queue('interactiveQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: true, 
    removeOnFail: false,
  }
});

interactiveQueue.on('error', (error) => {
  console.error(' Queue error:', error);
});

export const interactiveWorker = new Worker(
  'interactiveQueue',
  async (job) => {
    console.log(` Processing job ${job.id}`);
    
    const { data } = job;
    
    return { success: true, jobId: job.id };
  },
  {
    connection: redisConnection,
    concurrency: 1, 
    lockDuration: 60000, 
    lockRenewTime: 15000, 
    stalledInterval: 30000, 
    maxStalledCount: 2, 
    limiter: {
      max: 5, 
      duration: 1000 
    }
  }
);

interactiveWorker.on('error', (error) => {
  console.error(' Worker error:', error);
});

interactiveWorker.on('failed', (job, error) => {
  console.error(` Job ${job?.id} failed:`, error);
});

interactiveWorker.on('completed', (job) => {
  console.log(` Job ${job.id} completed and removed from queue`);
});

interactiveWorker.on('stalled', (jobId) => {
  console.warn(` Job ${jobId} stalled`);
});

interactiveWorker.on('active', (job) => {
  console.log(` Job ${job.id} is now active`);
});

process.on('SIGTERM', async () => {
  console.log(' SIGTERM received, closing worker...');
  await interactiveWorker.close();
  await interactiveQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log(' SIGINT received, closing worker...');
  await interactiveWorker.close();
  await interactiveQueue.close();
  process.exit(0);
});