import { Worker } from "bullmq";
import { spawn, ChildProcess } from "child_process";
import { randomBytes } from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
import { getDockerConfig, getFileExtension, getJavaClassName } from "../utils/dockerConfig.js";

const execAsync = promisify(exec);

const activeProcesses = new Map<string, { 
  process: ChildProcess; 
  containerId: string;
  socketId: string;
}>();

const MAX_OUTPUT_SIZE = 512 * 1024; 
const MAX_OUTPUT_LINES = 5000;     
const EXECUTION_TIMEOUT = 30000;

let dockerFailureCount = 0;
const MAX_DOCKER_FAILURES = 5;

const checkSystemMemory = async (): Promise<boolean> => {
  try {
    const { stdout } = await execAsync("free -m | grep Mem | awk '{print ($3/$2) * 100.0}'");
    const memoryUsagePercent = parseFloat(stdout.trim());
    
    if (memoryUsagePercent > 75) {
      console.error(` Memory usage critical: ${memoryUsagePercent.toFixed(1)}%`);
      return false;
    }
    return true;
  } catch (error) {
    return true;
  }
};

const forceCleanupContainer = async (containerName: string, maxRetries: number = 3): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(` Cleanup attempt ${attempt}/${maxRetries} for: ${containerName}`);
      
      try {
        await execAsync(`docker kill -s SIGKILL ${containerName}`, { timeout: 10000 });
      } catch (e) {}
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await execAsync(`docker rm -f ${containerName}`, { timeout: 10000 });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      const { stdout } = await execAsync(
        `docker ps -a --filter "name=^${containerName}$" --format "{{.Names}}"`, 
        { timeout: 5000 }
      );
      
      if (stdout.trim() !== containerName) {
        console.log(` Container ${containerName} successfully cleaned up`);
        return true;
      }
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(` Failed to cleanup ${containerName}`);
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
};

const checkDiskSpace = async (): Promise<boolean> => {
  try {
    const { stdout } = await execAsync("df -h /var/lib/docker | tail -1 | awk '{print $5}' | sed 's/%//'");
    const usage = parseInt(stdout.trim());
    
    if (isNaN(usage)) {
      console.error('Failed to parse disk usage, failing open');
      return true; 
    }
    
    console.log(` Disk usage: ${usage}%`);
    
    if (usage > 85) {
      console.error(` Disk usage critical: ${usage}%`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(' Disk check error:', error);
    return true; 
  }
};

const checkDockerHealth = async (): Promise<boolean> => {
  try {
    await execAsync('docker ps', { timeout: 5000 });
    dockerFailureCount = 0;
    return true;
  } catch (error) {
    dockerFailureCount++;
    return false;
  }
};

export const setupInteractiveWorker = async (io: any) => {
  console.log('️ Initializing interactive worker for t3.micro...');
  
  const worker = new Worker(
    "interactiveQueue",
    async (job) => {
      const { code, language, socketId, filename } = job.data;
      const jobId = job.id as string;

      let outputSize = 0;
      let outputLines = 0;
      let isTerminated = false;
      let timeoutHandle: NodeJS.Timeout | null = null;
      let containerName = '';
      let docker: ChildProcess | null = null;

      console.log(` Starting job ${jobId} (${language})`);

      try {
        if (dockerFailureCount >= MAX_DOCKER_FAILURES) {
          throw new Error("Code execution service temporarily unavailable");
        }
        
        const hasMemory = await checkSystemMemory();
        if (!hasMemory) {
          throw new Error("Server memory capacity exceeded. Please try again in a moment.");
        }
        
        const hasSpace = await checkDiskSpace();
        if (!hasSpace) {
          throw new Error("Server capacity exceeded");
        }

        const config = getDockerConfig(language);
        if (!config) {
          throw new Error(`Unsupported language: ${language}`);
        }

        const tempId = randomBytes(16).toString("hex");
        containerName = `exec-${tempId}`;
        
        const ext = getFileExtension(language);
        
        let actualFileName: string;
        let command: string;
        
        if (language.toLowerCase() === "java") {
          const javaClassName = getJavaClassName(code);
          if (javaClassName) {
            actualFileName = `${javaClassName}.java`;
            command = `javac /app/${actualFileName} -d /tmp && java -cp /tmp ${javaClassName}`;
          } else {
            throw new Error("Could not find public class declaration in Java code");
          }
        } else {
          if (filename) {
            const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
            actualFileName = `${nameWithoutExt}.${ext}`;
          } else {
            actualFileName = `main.${ext}`;
          }
          
          if (language.toLowerCase() === "python") {
            command = `python3 -u /app/${actualFileName}`;
          } else if (language.toLowerCase() === "javascript") {
            command = `node /app/${actualFileName}`;
          } else if (language.toLowerCase() === "cpp") {
            command = `g++ -O2 /app/${actualFileName} -o /tmp/code && /tmp/code`;
          } else if (language.toLowerCase() === "c") {
            command = `gcc -O2 /app/${actualFileName} -o /tmp/code && /tmp/code`;
          } else if (language.toLowerCase() === "go") {
            command = `go run /app/${actualFileName}`;
          } else if (language.toLowerCase() === "ruby") {
            command = `ruby /app/${actualFileName}`;
          } else if (language.toLowerCase() === "rust") {
            command = `rustc /app/${actualFileName} -o /tmp/code && /tmp/code`;
          } else {
            throw new Error(`Unsupported language: ${language}`);
          }
        }
        
        const setupAndRun = `mkdir -p /app && cat > /app/${actualFileName} && timeout 32 ${command}`;
        
        const dockerCmd = [
          "run", 
          "--rm",
          "-i",
          "--pull=never",
          `--name=${containerName}`,
          "--network", "none",
          `--memory=${config.memory}`,
          `--memory-swap=${config.memory}`, 
          `--cpus=${config.cpus}`,
          `--pids-limit=${config.pidsLimit}`,
          "--ulimit", "nofile=100:100",
          config.image,
          "sh", "-c", `${setupAndRun} || exit 124`
        ];

        console.log(` Spawning: ${containerName} (mem: ${config.memory}, cpu: ${config.cpus})`);
        
        docker = spawn("docker", dockerCmd, {
          stdio: ['pipe', 'pipe', 'pipe'],
          detached: false
        });

        activeProcesses.set(jobId, { 
          process: docker, 
          containerId: containerName,
          socketId
        });

        io.to(socketId).emit("execution-started", { jobId });

        if (docker.stdin) {
          docker.stdin.write(code);
          docker.stdin.end();
        }

        const terminateExecution = async (reason: string, exitCode: number = -1) => {
          if (isTerminated) return;
          isTerminated = true;

          console.log(` Terminating ${jobId}: ${reason}`);

          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }

          await forceCleanupContainer(containerName);

          if (docker) {
            try {
              if (docker.stdin && !docker.stdin.destroyed) docker.stdin.destroy();
              if (docker.stdout && !docker.stdout.destroyed) docker.stdout.destroy();
              if (docker.stderr && !docker.stderr.destroyed) docker.stderr.destroy();
              if (!docker.killed) docker.kill('SIGKILL');
            } catch (e) {}
          }

          activeProcesses.delete(jobId);
          
          io.to(socketId).emit("output", {
            type: "error",
            data: `\n[${reason}]`
          });
          
          io.to(socketId).emit("execution-complete", { exitCode });
          io.to(socketId).emit("execution-completed", { jobId });
        };

        docker.on("error", async (error) => {
          dockerFailureCount++;
          if (!isTerminated) {
            await terminateExecution(`Error: ${error.message}`, -1);
          }
        });

        if (docker.stdout) {
          docker.stdout.on("data", (data) => {
            if (isTerminated) return;

            const chunk = data.toString();
            outputSize += Buffer.byteLength(chunk);
            outputLines += (chunk.match(/\n/g) || []).length;

            if (outputSize > MAX_OUTPUT_SIZE || outputLines > MAX_OUTPUT_LINES) {
              terminateExecution("Output limit exceeded", 137);
              return;
            }

            io.to(socketId).emit("output", {
              type: "stdout",
              data: chunk
            });
          });
        }

        if (docker.stderr) {
          docker.stderr.on("data", (data) => {
            if (isTerminated) return;

            const chunk = data.toString();
            outputSize += Buffer.byteLength(chunk);

            if (outputSize > MAX_OUTPUT_SIZE) {
              terminateExecution("Output limit exceeded", 137);
              return;
            }

            io.to(socketId).emit("output", {
              type: "stderr",
              data: chunk
            });
          });
        }

        docker.on("close", async (code) => {
          if (isTerminated) return;
          isTerminated = true;

          console.log(` Job ${jobId} exited: ${code}`);

          if (timeoutHandle) clearTimeout(timeoutHandle);

          try {
            if (docker) {
              if (docker.stdin && !docker.stdin.destroyed) docker.stdin.destroy();
              if (docker.stdout && !docker.stdout.destroyed) docker.stdout.destroy();
              if (docker.stderr && !docker.stderr.destroyed) docker.stderr.destroy();
            }
          } catch (e) {}

          activeProcesses.delete(jobId);
          
          await forceCleanupContainer(containerName);
          
          if (code === 124) {
            io.to(socketId).emit("output", {
              type: "error",
              data: "\n[Execution timeout (30 seconds)]"
            });
          }
          
          io.to(socketId).emit("execution-complete", { exitCode: code });
          io.to(socketId).emit("execution-completed", { jobId });
        });

        timeoutHandle = setTimeout(async () => {
          if (!isTerminated) {
            await terminateExecution("Execution timeout (30 seconds)", 124);
          }
        }, EXECUTION_TIMEOUT);

      } catch (error: any) {
        console.error(` Job ${jobId} error:`, error);
        
        if (containerName) {
          await forceCleanupContainer(containerName);
        }
        
        io.to(socketId).emit("output", {
          type: "error",
          data: `Error: ${error.message}`
        });
        
        io.to(socketId).emit("execution-complete", { exitCode: -1 });
        io.to(socketId).emit("execution-completed", { jobId });
      }

      return { success: true };
    },
    { 
      connection: { 
        host: process.env.REDIS_HOST ?? "redis",
        port: parseInt(process.env.REDIS_PORT || "6379")
      },
      concurrency: 1,  
      limiter: {
        max: 5,        
        duration: 60000
      }
    }
  );

  worker.on('failed', async (job, err) => {
    console.error(` Job ${job?.id} failed:`, err);
    
    if (job?.id) {
      const processInfo = activeProcesses.get(job.id as string);
      if (processInfo) {
        await forceCleanupContainer(processInfo.containerId);
        activeProcesses.delete(job.id as string);
      }
    }
  });

  setInterval(async () => {
    try {
      const { stdout } = await execAsync(
        'docker ps -a --filter "name=exec-" --format "{{.Names}}"', 
        { timeout: 10000 }
      );
      
      const containers = stdout.trim().split('\n').filter(line => line);
      
      for (const name of containers) {
        const isTracked = Array.from(activeProcesses.values())
          .some(p => p.containerId === name);
        
        if (!isTracked) {
          console.log(` Cleaning orphan: ${name}`);
          await forceCleanupContainer(name);
        }
      }
    } catch (error) {}
  }, 30000);

  setInterval(async () => {
    const isHealthy = await checkDockerHealth();
    
    if (!isHealthy && dockerFailureCount >= MAX_DOCKER_FAILURES) {
      console.error(' Docker unhealthy! Pausing worker...');
      await worker.pause();
      
      setTimeout(async () => {
        if (await checkDockerHealth()) {
          console.log(' Docker recovered');
          await worker.resume();
        }
      }, 60000);
    }
  }, 30000);

  console.log(' Interactive worker initialized (concurrency: 1)');

  return { worker, activeProcesses };
};