import { exec } from "child_process";
import { writeFile, unlink, mkdir, rm } from "fs/promises";
import { randomBytes } from "crypto";
import { join } from "path";
import { tmpdir } from "os";
import { promisify } from "util";
import {
  getDockerConfig,
  getFileExtension,
  getJavaClassName,
} from "./dockerConfig.js";

const execAsync = promisify(exec);

interface ExecutionResult {
  stdout: string;
  stderr: string;
  error?: string;
}

let dockerFailureCount = 0;
const MAX_DOCKER_FAILURES = 5;

let activeNonInteractiveExecutions = 0;
const MAX_NON_INTERACTIVE_EXECUTIONS = 1;

const checkSystemMemory = async (): Promise<boolean> => {
  try {
    const { stdout } = await execAsync(
      "free -m | grep Mem | awk '{print ($3/$2) * 100.0}'"
    );
    const memoryUsagePercent = parseFloat(stdout.trim());

    if (memoryUsagePercent > 75) {
      console.error(
        `💾 Memory usage critical: ${memoryUsagePercent.toFixed(1)}%`
      );
      return false;
    }
    return true;
  } catch (error) {
    return true;
  }
};

const checkDiskSpace = async (): Promise<boolean> => {
  try {
    const { stdout } = await execAsync(
      "df -h /var/lib/docker | tail -1 | awk '{print $5}' | sed 's/%//'"
    );
    const usage = parseInt(stdout.trim());

    if (usage > 85) {
      console.error(`💾 Disk usage critical: ${usage}%`);
      return false;
    }
    return true;
  } catch (error) {
    return true;
  }
};

const checkDockerHealth = async (): Promise<boolean> => {
  try {
    await execAsync("docker ps", { timeout: 5000 });
    dockerFailureCount = 0;
    return true;
  } catch (error) {
    dockerFailureCount++;
    console.error(
      `❌ Docker health check failed (${dockerFailureCount}/${MAX_DOCKER_FAILURES})`
    );
    return false;
  }
};

const runDocker = async (
  language: string,
  code: string,
  input?: string,
  filename?: string
): Promise<ExecutionResult> => {
  while (activeNonInteractiveExecutions >= MAX_NON_INTERACTIVE_EXECUTIONS) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  activeNonInteractiveExecutions++;
  console.log(
    `🚀 Non-interactive executions: ${activeNonInteractiveExecutions}/${MAX_NON_INTERACTIVE_EXECUTIONS}`
  );

  try {
    if (dockerFailureCount >= MAX_DOCKER_FAILURES) {
      return {
        stdout: "",
        stderr:
          "Code execution service temporarily unavailable. Please try again in a few minutes.",
        error: "Service unavailable",
      };
    }

    const hasMemory = await checkSystemMemory();
    if (!hasMemory) {
      return {
        stdout: "",
        stderr:
          "Server memory capacity exceeded. Please try again in a few moments.",
        error: "Memory exhausted",
      };
    }

    const hasSpace = await checkDiskSpace();
    if (!hasSpace) {
      return {
        stdout: "",
        stderr: "Server capacity exceeded. Please try again in a few minutes.",
        error: "Capacity exceeded",
      };
    }

    const config = getDockerConfig(language);
    if (!config) {
      return {
        stdout: "",
        stderr: "Invalid language specified",
        error: "Invalid language",
      };
    }

    if (!code || code.length > 50000) {
      return {
        stdout: "",
        stderr: "Code must be between 1 and 50000 characters",
        error: "Invalid code length",
      };
    }

    const tempId = randomBytes(16).toString("hex");
    const tempDir = tmpdir();
    const ext = getFileExtension(language);

    let actualFileName: string;
    let containerFileName: string;
    let command: string;

    if (language.toLowerCase() === "java") {
      const javaClassName = getJavaClassName(code);
      if (javaClassName) {
        actualFileName = `${javaClassName}.java`;
        containerFileName = actualFileName;

        command = `javac /app/${containerFileName} -d /tmp && java -cp /tmp ${javaClassName}`;
      } else {

        return {
          stdout: "",
          stderr:
            "Could not find public class declaration in Java code. Make sure your code contains 'public class ClassName'",
          error: "Invalid Java code",
        };
      }
    } else {
      if (filename) {
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
        actualFileName = `${nameWithoutExt}.${ext}`;
      } else {
        actualFileName = `main.${ext}`;
      }
      containerFileName = actualFileName;

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
        return {
          stdout: "",
          stderr: `Unsupported language: ${language}`,
          error: "Unsupported language",
        };
      }
    }

    const tempDirPath = join(tempDir, tempId);
    const tempFile = join(tempDirPath, actualFileName);

    try {
      await mkdir(tempDirPath, { recursive: true });
      await writeFile(tempFile, code, "utf8");

      console.log(`📝 Running: ${language} - ${actualFileName}`);

      const hostMountPath = tempDirPath.replace(/\\/g, "/");

      const dockerCmd = `docker run --rm -i --pull=never --network none --memory="${config.memory}" --memory-swap="${config.memory}" --cpus="${config.cpus}" --pids-limit=${config.pidsLimit} --ulimit nofile=100:100 -v "${hostMountPath}:/app:ro" ${config.image} sh -c "${command}"`;

      return await new Promise<ExecutionResult>((resolve) => {
        const process = exec(
          dockerCmd,
          {
            timeout: 10000,
            maxBuffer: 512 * 1024, // 512KB
            killSignal: "SIGKILL",
          },
          async (error, stdout, stderr) => {
            await unlink(tempFile).catch(() => {});
            await rm(tempDirPath, { recursive: true, force: true }).catch(
              () => {}
            );

            if (error) {
              if (
                error.message.includes("docker") ||
                error.message.includes("Docker")
              ) {
                dockerFailureCount++;
              }

              if (error.killed) {
                resolve({
                  stdout: stdout?.toString() ?? "",
                  stderr: "Execution timeout (10s limit exceeded)",
                  error: "Timeout",
                });
              } else {
                resolve({
                  stdout: stdout?.toString() ?? "",
                  stderr: stderr?.toString() ?? error.message,
                  error: error.message,
                });
              }
            } else {
              dockerFailureCount = 0;

              resolve({
                stdout: stdout?.toString() ?? "",
                stderr: stderr?.toString() ?? "",
              });
            }
          }
        );

        if (input && process.stdin) {
          process.stdin.write(input);
          process.stdin.end();
        }
      });
    } catch (err: any) {
      await unlink(tempFile).catch(() => {});
      await rm(tempDirPath, { recursive: true, force: true }).catch(() => {});

      return {
        stdout: "",
        stderr: err.message ?? "Unknown error",
        error: err.message,
      };
    }
  } finally {
    activeNonInteractiveExecutions--;
  }
};

export const getDockerStatus = () => ({
  failureCount: dockerFailureCount,
  isHealthy: dockerFailureCount < MAX_DOCKER_FAILURES,
  activeNonInteractiveExecutions,
  maxNonInteractive: MAX_NON_INTERACTIVE_EXECUTIONS,
});

export default runDocker;
