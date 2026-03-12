import { Queue } from "bullmq";

const redisConnection = {
  host: process.env.REDIS_HOST || "redis",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
  lazyConnect: false,
};

export const interactiveQueue = new Queue("interactiveQueue", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

interactiveQueue.on("error", (error) => {
  console.error(" Queue error:", error);
});

process.on("SIGTERM", async () => {
  console.log(" SIGTERM received, closing queue...");
  await interactiveQueue.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log(" SIGINT received, closing queue...");
  await interactiveQueue.close();
  process.exit(0);
});
