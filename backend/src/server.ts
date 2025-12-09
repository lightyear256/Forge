import dotenv from 'dotenv';
dotenv.config();




import express from 'express';
import { createServer } from "http";
import { Server } from "socket.io";
import { exec } from "child_process";
import { promisify } from "util";
import { userRouter } from './routes/userRoute.js';
import { connectDB } from './config/db.js';
import { projectRouter } from './routes/projectRoute.js';
import { interactiveRouter } from "./routes/interactiveRoute.js";
import { setupInteractiveWorker } from "./worker/interactiveWorker.js";
import { dockerMaintenance, setupDockerMonitoring } from './utils/dockerMaintainence.js';
import cookieParser from "cookie-parser";
import cors from 'cors';

const execAsync = promisify(exec);

const userExecutionCount = new Map<string, { count: number, resetTime: number }>();
const MAX_EXECUTIONS_PER_MINUTE = 10;
const RATE_LIMIT_WINDOW = 60000;

const socketExecutingStatus = new Map<string, boolean>();

const cleanupAllContainers = async () => {
  try {
    console.log(' Cleaning up all exec- containers...');
    
    const { stdout: allContainers } = await execAsync(
      'docker ps -a --filter "name=exec-" --format "{{.Names}}"',
      { timeout: 10000 }
    );
    
    const containerNames = allContainers.trim().split('\n').filter(name => name);
    
    if (containerNames.length === 0) {
      console.log(' No containers to clean up');
      return;
    }
    
    console.log(`Found ${containerNames.length} containers to clean up`);
    
    for (const name of containerNames) {
      try {
        await execAsync(`docker kill -s SIGKILL ${name}`, { timeout: 5000 });
        console.log(` Killed ${name}`);
      } catch (e) {
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    for (const name of containerNames) {
      try {
        await execAsync(`docker rm -f ${name}`, { timeout: 5000 });
        console.log(` Removed ${name}`);
      } catch (e) {
        console.error(`Failed to remove ${name}:`, e);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    const { stdout: remaining } = await execAsync(
      'docker ps -a --filter "name=exec-" --format "{{.Names}}"',
      { timeout: 5000 }
    );
    
    const remainingContainers = remaining.trim().split('\n').filter(name => name);
    
    if (remainingContainers.length > 0) {
      console.error(` ${remainingContainers.length} containers still remain:`, remainingContainers);
    } else {
      console.log(' All containers successfully cleaned up');
    }
    
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

const initializeServer = async () => {
  console.log(' Initializing server...');

  const health = await dockerMaintenance.checkHealth();
  if (!health.healthy) {
    console.error(' Docker is not healthy:', health.message);
    console.log(' Attempting to continue anyway...');
  } else {
    console.log(' Docker is healthy');
  }

  await cleanupAllContainers();
  await dockerMaintenance.fullCleanup();

  console.log(' Initial Docker stats:');
  await dockerMaintenance.getDiskUsage();
  await dockerMaintenance.logStats();
};

await initializeServer();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" },
  maxHttpBufferSize: 1e6,
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://13.126.199.238",
    "http://forge.ayushmaan.tech",
    "http://forge.api.ayushmaan.tech"
  ],
  credentials: true
}));

app.use(cookieParser());

connectDB();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/user', userRouter);
app.use('/project', projectRouter);
app.use("/interactive", interactiveRouter);

app.get("/", (req, res) => {
  res.send("server running");
});

app.get('/health', async (req, res) => {
  const dockerHealth = await dockerMaintenance.checkHealth();
  const stats = await dockerMaintenance.logStats();
  const stuck = await dockerMaintenance.getStuckContainers();

  res.json({
    status: dockerHealth.healthy ? 'healthy' : 'unhealthy',
    docker: dockerHealth,
    stats,
    stuckContainers: stuck,
    activeProcesses: activeProcesses.size,
    rateLimits: userExecutionCount.size
  });
});

app.post('/admin/cleanup', async (req, res) => {
  console.log(' Manual cleanup triggered');
  await cleanupAllContainers();
  const result = await dockerMaintenance.fullCleanup();
  res.json({ success: result, message: 'Cleanup completed' });
});

app.post('/admin/emergency-cleanup', async (req, res) => {
  console.log(' Emergency cleanup triggered');
  const result = await dockerMaintenance.emergencyCleanup();
  res.json({ success: result, message: 'Emergency cleanup completed' });
});

const { worker, activeProcesses } = await setupInteractiveWorker(io);

setupDockerMonitoring();

const checkRateLimit = (userId: string): { allowed: boolean, remaining: number } => {
  const now = Date.now();
  const userLimit = userExecutionCount.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    userExecutionCount.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return { allowed: true, remaining: MAX_EXECUTIONS_PER_MINUTE - 1 };
  }

  if (userLimit.count >= MAX_EXECUTIONS_PER_MINUTE) {
    return { allowed: false, remaining: 0 };
  }

  userLimit.count++;
  return { allowed: true, remaining: MAX_EXECUTIONS_PER_MINUTE - userLimit.count };
};

const isSocketExecuting = (socketId: string): boolean => {
  return socketExecutingStatus.get(socketId) === true;
};

const setSocketExecuting = (socketId: string, status: boolean) => {
  socketExecutingStatus.set(socketId, status);
  console.log(`Socket ${socketId} executing status: ${status}`);
};

const cleanupSocketContainers = async (socketId: string) => {
  console.log(` Cleaning up containers for socket ${socketId}`);
  
  const containersToClean: string[] = [];
  
  for (const [jobId, processInfo] of activeProcesses.entries()) {
    if (processInfo.socketId === socketId) {
      containersToClean.push(processInfo.containerId);
      
      try {
        await execAsync(`docker kill -s SIGKILL ${processInfo.containerId}`, { timeout: 5000 });
      } catch (e) {
      }
      
      if (processInfo.process) {
        try {
          if (processInfo.process.stdin) processInfo.process.stdin.destroy();
          if (processInfo.process.stdout) processInfo.process.stdout.destroy();
          if (processInfo.process.stderr) processInfo.process.stderr.destroy();
          processInfo.process.kill('SIGKILL');
        } catch (e) {
        }
      }
      
      activeProcesses.delete(jobId);
    }
  }
  
  if (containersToClean.length > 0) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    for (const container of containersToClean) {
      try {
        await execAsync(`docker rm -f ${container}`, { timeout: 5000 });
        console.log(` Cleaned up ${container}`);
      } catch (e) {
        console.error(`Failed to clean ${container}:`, e);
      }
    }
  }
};

io.on("connection", (socket) => {
  console.log(" Client connected:", socket.id);
  
  setSocketExecuting(socket.id, false);

  socket.on("stdin", ({ jobId, data }) => {
    const processInfo = activeProcesses.get(jobId);
    if (processInfo && processInfo.process && processInfo.process.stdin) {
      try {
        if (data.length > 1000) {
          socket.emit("output", {
            type: "error",
            data: "[Input too large, max 1000 characters]"
          });
          return;
        }
        processInfo.process.stdin.write(data + "\n");
      } catch (error) {
        console.error(`Failed to write stdin for job ${jobId}:`, error);
      }
    }
  });

  socket.on("start-execution", ({ userId }) => {
    console.log(` Execution request from socket ${socket.id}`);
    
    if (isSocketExecuting(socket.id)) {
      console.log(` Socket ${socket.id} already executing - blocking request`);
      socket.emit("execution-blocked", {
        message: "Already executing. Please wait for current execution to finish."
      });
      return;
    }

    const rateLimit = checkRateLimit(userId || socket.id);
    if (!rateLimit.allowed) {
      console.log(` Rate limit exceeded for ${userId || socket.id}`);
      socket.emit("rate-limit-exceeded", {
        message: `Rate limit exceeded. Maximum ${MAX_EXECUTIONS_PER_MINUTE} executions per minute.`,
        remaining: rateLimit.remaining
      });
      return;
    }

    setSocketExecuting(socket.id, true);
    
    console.log(` Execution allowed for socket ${socket.id}`);
    socket.emit("execution-allowed", {
      remaining: rateLimit.remaining
    });
  });

  socket.on("execution-completed", ({ jobId }) => {
    console.log(` Execution completed: ${jobId}`);
    
    setSocketExecuting(socket.id, false);
    
    if (activeProcesses.has(jobId)) {
      activeProcesses.delete(jobId);
    }
  });

  socket.on("terminate", async ({ jobId }) => {
    const processInfo = activeProcesses.get(jobId);
    if (processInfo) {
      try {
        console.log(` Terminating job ${jobId}`);
        
        if (processInfo.containerId) {
          await execAsync(`docker kill -s SIGKILL ${processInfo.containerId}`, { timeout: 5000 });
          await new Promise(resolve => setTimeout(resolve, 1000));
          await execAsync(`docker rm -f ${processInfo.containerId}`, { timeout: 5000 });
        }
        
        if (processInfo.process) {
          try {
            if (processInfo.process.stdin) processInfo.process.stdin.destroy();
            if (processInfo.process.stdout) processInfo.process.stdout.destroy();
            if (processInfo.process.stderr) processInfo.process.stderr.destroy();
            processInfo.process.kill('SIGKILL');
          } catch (e) {
          }
        }
        
        activeProcesses.delete(jobId);
        
        setSocketExecuting(socket.id, false);
        
        socket.emit("output", {
          type: "error",
          data: "\n[Execution terminated by user]"
        });
        
        socket.emit("execution-complete", { exitCode: -1 });
      } catch (error) {
        console.error(`Failed to terminate job ${jobId}:`, error);
      }
    }
  });

  socket.on("disconnect", async () => {
    console.log(" Client disconnected:", socket.id);
    
    setSocketExecuting(socket.id, false);
    socketExecutingStatus.delete(socket.id);
    
    await cleanupSocketContainers(socket.id);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [userId, limit] of userExecutionCount.entries()) {
    if (now > limit.resetTime) {
      userExecutionCount.delete(userId);
    }
  }
}, 60000);

setInterval(async () => {
  await cleanupAllContainers();
}, 180000);

setInterval(async () => {
  console.log(' Running scheduled Docker cleanup...');
  await dockerMaintenance.fullCleanup();
  await dockerMaintenance.getDiskUsage();
}, 3600000);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
  console.log(` Rate limit: ${MAX_EXECUTIONS_PER_MINUTE} executions/minute`);
  console.log(` Strict execution control enabled`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  console.log(` Cleanup endpoint: POST http://localhost:${PORT}/admin/cleanup`);
});

const shutdown = async () => {
  console.log('\n Shutting down gracefully...');
  
  try {
    await worker.pause();
    console.log('  Worker paused');
  } catch (e) {
    console.error('Failed to pause worker:', e);
  }
  
  httpServer.close();
  
  console.log(' Cleaning up all active processes...');
  
  for (const [jobId, processInfo] of activeProcesses.entries()) {
    try {
      if (processInfo.containerId) {
        await execAsync(`docker kill -s SIGKILL ${processInfo.containerId}`, { timeout: 5000 });
        await execAsync(`docker rm -f ${processInfo.containerId}`, { timeout: 5000 });
      }
      if (processInfo.process) {
        try {
          if (processInfo.process.stdin) processInfo.process.stdin.destroy();
          if (processInfo.process.stdout) processInfo.process.stdout.destroy();
          if (processInfo.process.stderr) processInfo.process.stderr.destroy();
          processInfo.process.kill('SIGKILL');
        } catch (e) {
        }
      }
    } catch (error) {
      console.error(`Cleanup error for job ${jobId}:`, error);
    }
  }
  
  await cleanupAllContainers();
  
  console.log(' Running emergency cleanup...');
  await dockerMaintenance.emergencyCleanup();
  
  try {
    await worker.close();
    console.log(' Worker closed');
  } catch (e) {
    console.error('Failed to close worker:', e);
  }
  
  console.log(' Shutdown complete');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('uncaughtException', async (error) => {
  console.error(' Uncaught Exception:', error);
  await dockerMaintenance.emergencyCleanup();
  await shutdown();
});

process.on('unhandledRejection', async (error) => {
  console.error(' Unhandled Rejection:', error);
  await dockerMaintenance.emergencyCleanup();
  await shutdown();
});

export { io, httpServer, app };