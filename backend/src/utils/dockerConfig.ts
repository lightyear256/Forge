export interface DockerConfig {
  fileName: string;
  image: string;
  command: string;
  pidsLimit: number;
  memory: string;
  cpus: string;
}

export const getDockerConfig = (language: string): DockerConfig | null => {
  // CRITICAL: Memory limits optimized for t3.micro
  // Total should not exceed ~700MB for all containers combined
  const configs: Record<string, DockerConfig> = {
    python: {
      fileName: "main.py",
      image: "python:3.11-alpine",
      command: "python3 -u /app/main.py",
      pidsLimit: 50,
      memory: "100m",  // Reduced from 128m
      cpus: "0.4"      // Reduced from 0.5
    },
    javascript: {
      fileName: "main.js",
      image: "node:20-alpine",
      command: "node /app/main.js",
      pidsLimit: 50,
      memory: "100m",
      cpus: "0.4"
    },
    cpp: {
      fileName: "main.cpp",
      image: "frolvlad/alpine-gxx",
      command: "g++ -O2 -o /tmp/prog /app/main.cpp && /tmp/prog",
      pidsLimit: 50,
      memory: "120m",  // Compilation needs slightly more
      cpus: "0.4"
    },
    c: {
      fileName: "main.c",
      image: "frolvlad/alpine-gxx",
      command: "gcc -O2 -o /tmp/prog /app/main.c && /tmp/prog",
      pidsLimit: 50,
      memory: "120m",
      cpus: "0.4"
    },
    java: {
      fileName: "Main.java",
      image: "eclipse-temurin:17-alpine",
      command: "javac /app/Main.java -d /tmp && java -cp /tmp Main",
      pidsLimit: 50,
      memory: "150m",  // Java needs more
      cpus: "0.4"
    },
    go: {
      fileName: "main.go",
      image: "golang:1.21-alpine",
      command: "go run /app/main.go",
      pidsLimit: 50,
      memory: "120m",
      cpus: "0.4"
    },
    ruby: {
      fileName: "main.rb",
      image: "ruby:3.2-alpine",
      command: "ruby /app/main.rb",
      pidsLimit: 50,
      memory: "100m",
      cpus: "0.4"
    },
    rust: {
      fileName: "main.rs",
      image: "rust:alpine",
      command: "rustc /app/main.rs -o /tmp/prog && /tmp/prog",
      pidsLimit: 50,
      memory: "150m",  // Rust compilation needs more
      cpus: "0.4"
    }
  };

  const normalizedLang = language.toLowerCase().replace("c++", "cpp");
  return configs[normalizedLang] || null;
};

export const getFileExtension = (language: string): string => {
  const extensions: Record<string, string> = {
    python: "py",
    javascript: "js",
    cpp: "cpp",
    c: "c",
    java: "java",
    go: "go",
    ruby: "rb",
    rust: "rs"
  };
  
  return extensions[language.toLowerCase().replace("c++", "cpp")] || "txt";
};

export const getJavaClassName = (code: string): string | null => {
  const match = code.match(/public\s+class\s+(\w+)/) as any;
  return match ? match[1] : null;
};