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
    removeOnComplete: true, // Remove completed jobs immediately
    removeOnFail: false,
  }
});

interactiveQueue.on('error', (error) => {
  console.error('❌ Queue error:', error);
});

export const interactiveWorker = new Worker(
  'interactiveQueue',
  async (job) => {
    console.log(`🔄 Processing job ${job.id}`);
    
    const { data } = job;
    
    return { success: true, jobId: job.id };
  },
  {
    connection: redisConnection,
    concurrency: 1, 
    lockDuration: 60000, // 60 seconds - how long job can run before considered stalled
    lockRenewTime: 15000, // 15 seconds - renew lock every 15s while processing
    stalledInterval: 30000, // Check for stalled jobs every 30s
    maxStalledCount: 2, // Job fails after being stalled 2 times
    limiter: {
      max: 5, // Max 5 jobs per duration
      duration: 1000 // Per second
    }
  }
);

// Worker event listeners
interactiveWorker.on('error', (error) => {
  console.error('❌ Worker error:', error);
});

interactiveWorker.on('failed', (job, error) => {
  console.error(`❌ Job ${job?.id} failed:`, error);
  // Jobs automatically removed based on removeOnFail setting
});

interactiveWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed and removed from queue`);
});

interactiveWorker.on('stalled', (jobId) => {
  console.warn(`⚠️ Job ${jobId} stalled`);
});

interactiveWorker.on('active', (job) => {
  console.log(`▶️ Job ${job.id} is now active`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, closing worker...');
  await interactiveWorker.close();
  await interactiveQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, closing worker...');
  await interactiveWorker.close();
  await interactiveQueue.close();
  process.exit(0);
});