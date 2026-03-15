export interface DockerConfig {
  image: string;
  pidsLimit: number;
  memory: string;
  cpus: string;
}

export const getDockerConfig = (language: string): DockerConfig | null => {
  const configs: Record<string, DockerConfig> = {
    python: {
      image: "python:3.11-alpine",
      pidsLimit: 50,
      memory: "100m",  
      cpus: "0.4"      
    },
    javascript: {
      image: "node:20-alpine",
      pidsLimit: 50,
      memory: "100m",
      cpus: "0.4"
    },
    cpp: {
      image: "frolvlad/alpine-gxx",
      pidsLimit: 50,
      memory: "120m",  
      cpus: "0.4"
    },
    c: {
      image: "frolvlad/alpine-gxx",
      pidsLimit: 50,
      memory: "120m",
      cpus: "0.4"
    },
    java: {
      image: "eclipse-temurin:17-alpine",
      pidsLimit: 50,
      memory: "150m",
      cpus: "0.4"
    },
    go: {
      image: "golang:1.21-alpine",
      pidsLimit: 50,
      memory: "120m",
      cpus: "0.4"
    },
    ruby: {
      image: "ruby:3.2-alpine",
      pidsLimit: 50,
      memory: "100m",
      cpus: "0.4"
    },
    rust: {
      image: "rust:alpine",
      pidsLimit: 50,
      memory: "150m",  
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