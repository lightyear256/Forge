import { exec } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { randomBytes } from "crypto";
import { join } from "path";
import { tmpdir } from "os";
import { promisify } from "util";
import { getDockerConfig, getFileExtension, getJavaClassName } from "../utils/dockerConfig.js";

const execAsync = promisify(exec);

interface ExecutionResult {
  stdout: string;
  stderr: string;
  error?: string;
}

let dockerFailureCount = 0;
const MAX_DOCKER_FAILURES = 5;

const checkDiskSpace = async (): Promise<boolean> => {
  try {
    const { stdout } = await execAsync("df -h /var/lib/docker | tail -1 | awk '{print $5}' | sed 's/%//'");
    const usage = parseInt(stdout.trim());
    
    if (usage > 85) {
      console.error(` Disk usage critical: ${usage}%`);
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
    console.error(`Docker health check failed (${dockerFailureCount}/${MAX_DOCKER_FAILURES})`);
    return false;
  }
};

const runDocker = async (
  language: string,
  code: string,
  input?: string,
  filename?: string
): Promise<ExecutionResult> => {
  if (dockerFailureCount >= MAX_DOCKER_FAILURES) {
    return {
      stdout: "",
      stderr: "Code execution service temporarily unavailable. Please try again in a few minutes.",
      error: "Service unavailable"
    };
  }

  const hasSpace = await checkDiskSpace();
  if (!hasSpace) {
    return {
      stdout: "",
      stderr: "Server capacity exceeded. Please try again in a few minutes.",
      error: "Capacity exceeded"
    };
  }

  const config = getDockerConfig(language);
  if (!config) {
    return {
      stdout: "",
      stderr: "Invalid language specified",
      error: "Invalid language"
    };
  }

  if (!code || code.length > 50000) {
    return {
      stdout: "",
      stderr: "Code must be between 1 and 50000 characters",
      error: "Invalid code length"
    };
  }

  const tempId = randomBytes(16).toString("hex");
  const tempDir = tmpdir();
  const ext = getFileExtension(language);
  
 const baseFilename = filename ? filename.replace(/\.[^/.]+$/, '') : tempId;
let fileName = `${baseFilename}.${ext}`;
let actualFileName = `${tempId}.${ext}`;
let className = tempId;
  
  if (language.toLowerCase() === "java") {
    const javaClassName = getJavaClassName(code);
    if (javaClassName) {
      fileName = `${javaClassName}.java`;
      actualFileName = `${tempId}.java`;
      className = javaClassName;
    } else {
      return {
        stdout: "",
        stderr: "Could not find public class declaration in Java code. Make sure your code contains 'public class ClassName'",
        error: "Invalid Java code"
      };
    }
  }
  
  const tempFile = join(tempDir, actualFileName);

  try {
    await writeFile(tempFile, code, "utf8");

    // let command = config.command;
    let command: string;

if (language.toLowerCase() === "java") {
  command = `javac /app/${fileName} -d /tmp && java -cp /tmp ${className}`;
} else if (language.toLowerCase() === "python") {
  command = `python3 -u /app/${fileName}`;
} else if (language.toLowerCase() === "javascript") {
  command = `node /app/${fileName}`;
} else if (language.toLowerCase() === "cpp") {
  command = `g++ -O2 /app/${fileName} -o /tmp/code && /tmp/code`;
} else if (language.toLowerCase() === "c") {
  command = `gcc -O2 /app/${fileName} -o /tmp/code && /tmp/code`;
} else if (language.toLowerCase() === "go") {
  command = `go run /app/${fileName}`;
} else if (language.toLowerCase() === "ruby") {
  command = `ruby /app/${fileName}`;
} else if (language.toLowerCase() === "rust") {
  command = `rustc /app/${fileName} -o /tmp/code && /tmp/code`;
} else {
  return {
    stdout: "",
    stderr: `Unsupported language: ${language}`,
    error: "Unsupported language"
  };
}
    const dockerCmd = `docker run --rm -i --pull=never --network none --memory="${config.memory}" --cpus="${config.cpus}" --pids-limit=${config.pidsLimit} -v "${tempFile}:/app/${fileName}:ro" ${config.image} sh -c "${command}"`;

    return await new Promise<ExecutionResult>((resolve) => {
      const process = exec(
        dockerCmd,
        {
          timeout: 10000,
          maxBuffer: 1024 * 1024,
        },
        (error, stdout, stderr) => {
          unlink(tempFile).catch(() => {});

          if (error) {
            if (error.message.includes('docker') || error.message.includes('Docker')) {
              dockerFailureCount++;
            }

            if (error.killed) {
              resolve({
                stdout: stdout?.toString() ?? "",
                stderr: "Execution timeout (10s limit exceeded)",
                error: "Timeout"
              });
            } else {
              resolve({
                stdout: stdout?.toString() ?? "",
                stderr: stderr?.toString() ?? error.message,
                error: error.message
              });
            }
          } else {
            dockerFailureCount = 0;
            
            resolve({
              stdout: stdout?.toString() ?? "",
              stderr: stderr?.toString() ?? ""
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
    if (tempFile) {
      await unlink(tempFile).catch(() => {});
    }
    return {
      stdout: "",
      stderr: err.message ?? "Unknown error",
      error: err.message
    };
  }
};

export const getDockerStatus = () => ({
  failureCount: dockerFailureCount,
  isHealthy: dockerFailureCount < MAX_DOCKER_FAILURES
});

export default runDocker;