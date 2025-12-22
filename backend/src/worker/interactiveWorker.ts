import { Worker } from "bullmq";
import { spawn, ChildProcess } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { randomBytes } from "crypto";
import { join } from "path";
import { tmpdir } from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Docker configuration for each language
const getDockerConfig = (language: string) => {
  const configs: Record<string, { image: string; pidsLimit: number }> = {
    python: {
      image: 'python:3.11-alpine',
      pidsLimit: 50
    },
    javascript: {
      image: 'node:20-alpine',
      pidsLimit: 50
    },
    java: {
      image: 'eclipse-temurin:17-alpine',
      pidsLimit: 50
    },
    cpp: {
      image: 'frolvlad/alpine-gxx',
      pidsLimit: 50
    },
    c: {
      image: 'frolvlad/alpine-gxx',
      pidsLimit: 50
    },
    go: {
      image: 'golang:1.21-alpine',
      pidsLimit: 50
    },
    ruby: {
      image: 'ruby:3.2-alpine',
      pidsLimit: 50
    },
    rust: {
      image: 'rust:alpine',
      pidsLimit: 50
    }
  };

  return configs[language.toLowerCase()];
};

const getFileExtension = (language: string): string => {
  const extensions: Record<string, string> = {
    python: 'py',
    javascript: 'js',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    go: 'go',
    ruby: 'rb',
    rust: 'rs'
  };
  return extensions[language.toLowerCase()] || 'txt';
};

const getJavaClassName = (code: string): string | null => {
  const match = code.match(/public\s+class\s+(\w+)/);
  return match?.[1] ?? null;
};

const activeProcesses = new Map<string, { 
  process: ChildProcess; 
  containerId: string;
  tempFile: string;
  socketId: string;
}>();

const MAX_OUTPUT_SIZE = 1024 * 1024;
const MAX_OUTPUT_LINES = 10000;
const EXECUTION_TIMEOUT = 30000;

let dockerFailureCount = 0;
const MAX_DOCKER_FAILURES = 5;

const normalizePathForDocker = (filePath: string): string => {
  // For Docker Desktop on Windows, convert backslashes to forward slashes
  // but keep the drive letter (C:/path/to/file format)
  if (process.platform === 'win32') {
    return filePath.replace(/\\/g, '/');
  }
  return filePath;
};

const forceCleanupContainer = async (containerName: string, maxRetries: number = 3): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🧹 Cleanup attempt ${attempt}/${maxRetries} for: ${containerName}`);
      
      try {
        await execAsync(`docker kill -s SIGKILL ${containerName}`, { timeout: 10000 });
        console.log(`💀 Sent SIGKILL to ${containerName}`);
      } catch (e) {
        console.log(`⚠️ SIGKILL failed (container may be dead): ${containerName}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      for (let rmAttempt = 1; rmAttempt <= 3; rmAttempt++) {
        try {
          await execAsync(`docker rm -f ${containerName}`, { timeout: 10000 });
          console.log(`✅ Removed ${containerName} on attempt ${rmAttempt}`);
          break;
        } catch (e) {
          if (rmAttempt === 3) throw e;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      const exists = await containerExists(containerName);
      
      if (!exists) {
        console.log(`✅ Container ${containerName} successfully cleaned up`);
        return true;
      } else {
        console.log(`⚠️ Container ${containerName} still exists after cleanup attempt ${attempt}`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
    } catch (error) {
      console.error(`❌ Cleanup attempt ${attempt} failed for ${containerName}:`, error);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  const stillExists = await containerExists(containerName);
  if (stillExists) {
    console.error(`🚨 CRITICAL: Container ${containerName} still exists after ${maxRetries} attempts`);
    return false;
  }
  
  return true;
};

const containerExists = async (containerName: string): Promise<boolean> => {
  try {
    const { stdout } = await execAsync(
      `docker ps -a --filter "name=^${containerName}$" --format "{{.Names}}"`, 
      { timeout: 5000 }
    );
    const exists = stdout.trim() === containerName;
    return exists;
  } catch (error) {
    return false;
  }
};

const checkDiskSpace = async (): Promise<boolean> => {
  try {
    const { stdout } = await execAsync("df -h /var/lib/docker | tail -1 | awk '{print $5}' | sed 's/%//'");
    const usage = parseInt(stdout.trim());
    
    if (usage > 85) {
      console.error(`💾 Disk usage critical: ${usage}%`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to check disk space:', error);
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
    console.error(`❌ Docker health check failed (${dockerFailureCount}/${MAX_DOCKER_FAILURES})`);
    return false;
  }
};

const aggressiveDockerCleanup = async () => {
  try {
    console.log('🧹 Starting Docker cleanup...');
    
    await execAsync('docker ps -q --filter "name=exec-" | xargs -r docker stop', { timeout: 30000 }).catch(() => {});
    await execAsync('docker ps -aq --filter "name=exec-" | xargs -r docker rm -f', { timeout: 30000 }).catch(() => {});
    
    await execAsync('docker image prune -f --filter "until=24h"', { timeout: 30000 });
    await execAsync('docker container prune -f --filter "until=1h"', { timeout: 30000 });
    await execAsync('docker builder prune -af --filter "until=48h"', { timeout: 30000 });
    await execAsync('docker network prune -f', { timeout: 30000 });
    
    console.log('✅ Docker cleanup completed');
  } catch (error) {
    console.error('❌ Docker cleanup failed:', error);
  }
};

const cleanupOrphanedFiles = async () => {
  try {
    const tempDir = tmpdir();
    const extensions = ['py', 'js', 'java', 'cpp', 'c', 'go', 'rb', 'rs'];
    const findPattern = extensions.map(ext => `-name "*.${ext}"`).join(' -o ');
    
    const { stdout } = await execAsync(
      `find ${tempDir} \\( ${findPattern} \\) -mmin +60 2>/dev/null || true`,
      { timeout: 10000 }
    );
    
    const files = stdout.trim().split('\n').filter(f => f);
    
    if (files.length > 0) {
      console.log(`🗑️ Cleaning ${files.length} orphaned temp files`);
      for (const file of files) {
        await unlink(file).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Temp cleanup error:', error);
  }
};

export const setupInteractiveWorker = async (io: any) => {
  console.log('⚙️ Initializing interactive worker...');
  
  await cleanupOrphanedFiles();
  await aggressiveDockerCleanup();
  
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
      let tempFile = '';
      let docker: ChildProcess | null = null;

      console.log(`🚀 Starting job ${jobId} for socket ${socketId} (${language})`);
      console.log(`📄 Original filename: ${filename}`);

      try {
        if (dockerFailureCount >= MAX_DOCKER_FAILURES) {
          throw new Error("Code execution service temporarily unavailable. Please try again in a few minutes.");
        }
        
        const hasSpace = await checkDiskSpace();
        if (!hasSpace) {
          throw new Error("Server capacity exceeded. Please try again in a few minutes.");
        }

        const config = getDockerConfig(language);
        if (!config) {
          throw new Error(`Unsupported language: ${language}`);
        }

        const tempId = randomBytes(16).toString("hex");
        const tempDir = tmpdir();
        containerName = `exec-${tempId}`;
        
        const ext = getFileExtension(language);
        
        // CRITICAL FIX: Determine the actual filename to use
        let actualFileName: string;
        let containerFileName: string;
        let command: string;
        
        // For Java, we MUST use the class name
        if (language.toLowerCase() === "java") {
          const javaClassName = getJavaClassName(code);
          if (javaClassName) {
            actualFileName = `${javaClassName}.java`;
            containerFileName = actualFileName;
            command = `cd /app && javac ${containerFileName} && java ${javaClassName}`;
          } else {
            throw new Error("Could not find public class declaration in Java code");
          }
        } else {
          // For other languages, use provided filename or default to main.*
          if (filename) {
            // Remove any existing extension and add the correct one
            const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
            actualFileName = `${nameWithoutExt}.${ext}`;
          } else {
            actualFileName = `main.${ext}`;
          }
          containerFileName = actualFileName;
          
          // Build language-specific commands
          if (language.toLowerCase() === "python") {
            command = `python3 -u /app/${containerFileName}`;
          } else if (language.toLowerCase() === "javascript") {
            command = `node /app/${containerFileName}`;
          } else if (language.toLowerCase() === "cpp") {
            command = `g++ -O2 /app/${containerFileName} -o /tmp/code && /tmp/code`;
          } else if (language.toLowerCase() === "c") {
            command = `gcc -O2 /app/${containerFileName} -o /tmp/code && /tmp/code`;
          } else if (language.toLowerCase() === "go") {
            command = `go run /app/${containerFileName}`;
          } else if (language.toLowerCase() === "ruby") {
            command = `ruby /app/${containerFileName}`;
          } else if (language.toLowerCase() === "rust") {
            command = `rustc /app/${containerFileName} -o /tmp/code && /tmp/code`;
          } else {
            throw new Error(`Unsupported language: ${language}`);
          }
        }
        
        // Create temp file on host with the SAME name we'll use in container
        // This is critical - the file must exist with this name
        tempFile = join(tempDir, `${tempId}_${actualFileName}`);
        await writeFile(tempFile, code, "utf8");

        const normalizedPath = normalizePathForDocker(tempFile);
        
        console.log(`📝 Actual filename: ${actualFileName}`);
        console.log(`📝 Container file: ${containerFileName}`);
        console.log(`🔧 Command: ${command}`);
        console.log(`📂 Host path: ${tempFile}`);
        console.log(`🐳 Container path: /app/${containerFileName}`);
        
        // Mount the actual host file to the container path
        const dockerCmd = [
          "run", 
          "--rm",
          "-i",
          "--pull=never",
          `--name=${containerName}`,
          "--network", "none",
          "--memory=512m",
          "--cpus=1.0",
          `--pids-limit=${config.pidsLimit}`,
          // This mounts: /tmp/abc123_hello.py -> /app/hello.py
          `-v`, `${normalizedPath}:/app/${containerFileName}:ro`,
          config.image,
          "sh", "-c", `timeout 32 ${command} || exit 124`  
        ];

        console.log(`🐳 Docker command: docker ${dockerCmd.join(' ')}`);
        console.log(`🐳 Spawning container: ${containerName}`);
        
        docker = spawn("docker", dockerCmd, {
          stdio: ['pipe', 'pipe', 'pipe'],
          detached: false
        });

        activeProcesses.set(jobId, { 
          process: docker, 
          containerId: containerName,
          tempFile,
          socketId
        });

        io.to(socketId).emit("execution-started", { jobId });

        const terminateExecution = async (reason: string, exitCode: number = -1) => {
          if (isTerminated) return;
          isTerminated = true;

          console.log(`⛔ Terminating job ${jobId}: ${reason}`);

          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = null;
          }

          try {
            console.log(`💀 Killing container ${containerName}`);
            const containerCleanedUp = await forceCleanupContainer(containerName);
            
            if (!containerCleanedUp) {
              console.error(`⚠️ Container ${containerName} cleanup incomplete`);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));

            if (docker) {
              try {
                if (docker.stdin && !docker.stdin.destroyed) {
                  docker.stdin.end();
                  docker.stdin.destroy();
                }
                if (docker.stdout && !docker.stdout.destroyed) docker.stdout.destroy();
                if (docker.stderr && !docker.stderr.destroyed) docker.stderr.destroy();

                if (!docker.killed) {
                  docker.kill('SIGKILL');
                }
              } catch (e) {
                console.log('Process already dead:', e);
              }
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            if (await containerExists(containerName)) {
              console.error(`⚠️ WARNING: Container ${containerName} still exists!`);
              await forceCleanupContainer(containerName, 2);
            }
            
          } catch (e) {
            console.error('Termination error:', e);
          }

          activeProcesses.delete(jobId);
          
          setTimeout(async () => {
            try {
              await unlink(tempFile);
            } catch (e) {}
          }, 2000);

          io.to(socketId).emit("output", {
            type: "error",
            data: `\n[${reason}]`
          });
          
          io.to(socketId).emit("execution-complete", { exitCode });
          io.to(socketId).emit("execution-completed", { jobId });
        };

        docker.on("error", async (error) => {
          console.error(`❌ Docker spawn error for ${jobId}:`, error);
          dockerFailureCount++;
          if (isTerminated) return;
          await terminateExecution(`Execution error: ${error.message}`, -1);
        });

        if (docker.stdout) {
          docker.stdout.on("data", (data) => {
            if (isTerminated) return;

            const chunk = data.toString();
            outputSize += Buffer.byteLength(chunk);
            outputLines += (chunk.match(/\n/g) || []).length;

            if (outputSize > MAX_OUTPUT_SIZE) {
              terminateExecution("Output limit exceeded (1MB max)", 137);
              return;
            }

            if (outputLines > MAX_OUTPUT_LINES) {
              terminateExecution("Output limit exceeded (10,000 lines max)", 137);
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
              terminateExecution("Output limit exceeded (1MB max)", 137);
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

          console.log(`✅ Job ${jobId} exited with code ${code}`);

          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = null;
          }

          try {
            if (docker) {
              if (docker.stdin && !docker.stdin.destroyed) {
                docker.stdin.end();
                docker.stdin.destroy();
              }
              if (docker.stdout && !docker.stdout.destroyed) docker.stdout.destroy();
              if (docker.stderr && !docker.stderr.destroyed) docker.stderr.destroy();
            }
          } catch (e) {}

          activeProcesses.delete(jobId);
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (await containerExists(containerName)) {
            console.log(`🧹 Container ${containerName} still exists after close, cleaning up...`);
            await forceCleanupContainer(containerName);
          }
          
          setTimeout(async () => {
            try {
              await unlink(tempFile);
            } catch (e) {}
          }, 2000);
          
          if (code === 124) {
            io.to(socketId).emit("output", {
              type: "error",
              data: "\n[Execution timeout (30 seconds max)]"
            });
          }
          
          io.to(socketId).emit("execution-complete", { exitCode: code });
          io.to(socketId).emit("execution-completed", { jobId });
        });

        timeoutHandle = setTimeout(async () => {
          if (!isTerminated) {
            console.log(`⏱️ Timeout triggered for ${jobId}`);
            await terminateExecution("Execution timeout (30 seconds max)", 124);
          }
        }, EXECUTION_TIMEOUT);

      } catch (error: any) {
        console.error(`❌ Job ${jobId} error:`, error);
        
        if (containerName) {
          await forceCleanupContainer(containerName);
        }
        
        if (tempFile) {
          setTimeout(async () => {
            try {
              await unlink(tempFile);
            } catch (e) {}
          }, 2000);
        }
        
        io.to(socketId).emit("output", {
          type: "error",
          data: `System error: ${error.message}`
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
      concurrency: 3,
      limiter: {
        max: 10,
        duration: 60000
      }
    }
  );

  worker.on('failed', async (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err);
    
    if (job?.id) {
      const processInfo = activeProcesses.get(job.id as string);
      if (processInfo) {
        await forceCleanupContainer(processInfo.containerId);
        activeProcesses.delete(job.id as string);
      }
    }
  });

  worker.on('error', (err) => {
    console.error('❌ Worker error:', err);
  });

  setInterval(async () => {
    try {
      const { stdout } = await execAsync(
        'docker ps -a --filter "name=exec-" --format "{{.Names}}\t{{.Status}}"', 
        { timeout: 10000 }
      );
      
      const containers = stdout.trim().split('\n').filter(line => line);
      
      if (containers.length > 0) {
        console.log(`🔍 Found ${containers.length} exec- containers`);
        
        for (const container of containers) {
          const [name, status] = container.split('\t');
          
          const isTracked = Array.from(activeProcesses.values())
            .some(p => p.containerId === name);
          
          if (!isTracked) {
            console.log(`🧹 Cleaning orphaned container: ${name} (${status})`);
            await forceCleanupContainer(name as string);
          }
        }
      }
    } catch (error) {
      console.error('Periodic cleanup error:', error);
    }
  }, 30000);

  setInterval(async () => {
    await aggressiveDockerCleanup();
  }, 3600000);

  setInterval(async () => {
    await cleanupOrphanedFiles();
  }, 1800000);

  setInterval(async () => {
    const isHealthy = await checkDockerHealth();
    
    if (!isHealthy && dockerFailureCount >= MAX_DOCKER_FAILURES) {
      console.error('🚨 Docker is unhealthy! Pausing worker...');
      await worker.pause();
      
      setTimeout(async () => {
        const recovered = await checkDockerHealth();
        if (recovered) {
          console.log('✅ Docker recovered, resuming worker');
          await worker.resume();
        } else {
          console.error('❌ Docker still unhealthy, will retry...');
        }
      }, 60000);
    }
  }, 30000);

  console.log('✅ Interactive worker initialized and running');

  return { worker, activeProcesses };
};