"use client";
import { useEffect, useState } from "react";
import { 
  Code2, 
  Container, 
  FolderGit2, 
  FileCode, 
  Shield, 
  Zap,
  Terminal,
  Box,
  Lock
} from "lucide-react";

export default function About() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const languages = [
    { name: "Python", icon: Terminal },
    { name: "C++", icon: Code2 },
    { name: "C", icon: Code2 },
    { name: "Java", icon: Code2 },
    { name: "JavaScript", icon: Code2 },
    { name: "Rust", icon: Code2 },
    { name: "Ruby", icon: Code2 },
  ];

  const features = [
    {
      icon: Container,
      title: "Docker Containerization",
      description: "Each code execution runs in an isolated Docker container for maximum security and reliability."
    },
    {
      icon: FolderGit2,
      title: "Project Management",
      description: "Organize your code with up to 3 projects per user, keeping your work structured and accessible."
    },
    {
      icon: FileCode,
      title: "File Organization",
      description: "Create and manage up to 5 files per project for proper code organization and modularity."
    },
    {
      icon: Shield,
      title: "Secure Execution",
      description: "Code runs in sandboxed environments, ensuring your system remains protected at all times."
    }
  ];

  return (
    <div className="pt-25 px-6 md:px-12 lg:px-20 min-h-screen w-full bg-black text-gray-50">
      <div className="max-w-7xl mx-auto space-y-24 py-12">
        
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-slate-800 rounded-full">
            <Box className="w-4 h-4 text-purple-500" />
            <span className="text-xs uppercase tracking-widest text-slate-500">
              About Forge
            </span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight">
            Online Code Editor
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-3xl font-light leading-relaxed">
            Forge is a powerful online code editor that supports multiple programming 
            languages with secure, containerized execution environments.
          </p>
        </div>

        <div className="space-y-8">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-sm uppercase tracking-widest text-slate-500 mb-1">
              Supported Languages
            </h2>
            <p className="text-3xl font-light">7 Languages</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-px bg-slate-800">
            {languages.map((lang, index) => {
              const Icon = lang.icon;
              return (
                <div
                  key={index}
                  className="bg-black p-6 hover:bg-slate-900/50 transition-colors group"
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-12 h-12 border border-slate-800 group-hover:border-purple-500 flex items-center justify-center transition-colors">
                      <Icon className="w-6 h-6 text-slate-600 group-hover:text-purple-500 transition-colors" />
                    </div>
                    <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">
                      {lang.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-8">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-sm uppercase tracking-widest text-slate-500 mb-1">
              Key Features
            </h2>
            <p className="text-3xl font-light">Built for Developers</p>
          </div>

          <div className="grid gap-px bg-slate-800">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-black p-8 hover:bg-slate-900/50 transition-colors group"
                >
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 border border-slate-800 group-hover:border-purple-500 flex items-center justify-center flex-shrink-0 transition-colors">
                      <Icon className="w-6 h-6 text-slate-600 group-hover:text-purple-500 transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-light group-hover:text-purple-400 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-slate-500 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-8">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-sm uppercase tracking-widest text-slate-500 mb-1">
              Usage Limits
            </h2>
            <p className="text-3xl font-light">Fair Usage Policy</p>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-slate-800">
            <div className="bg-black p-8 hover:bg-slate-900/50 transition-colors group">
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 border border-slate-800 group-hover:border-purple-500 flex items-center justify-center flex-shrink-0 transition-colors">
                  <FolderGit2 className="w-6 h-6 text-slate-600 group-hover:text-purple-500 transition-colors" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-light">3 Projects per User</h3>
                  <p className="text-slate-500">
                    Each user can create and manage up to three projects simultaneously.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-black p-8 hover:bg-slate-900/50 transition-colors group">
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 border border-slate-800 group-hover:border-purple-500 flex items-center justify-center flex-shrink-0 transition-colors">
                  <FileCode className="w-6 h-6 text-slate-600 group-hover:text-purple-500 transition-colors" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-light">5 Files per Project</h3>
                  <p className="text-slate-500">
                    Organize your code with up to five files within each project.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8 pb-12">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-sm uppercase tracking-widest text-slate-500 mb-1">
              Technology
            </h2>
            <p className="text-3xl font-light">How It Works</p>
          </div>

          <div className="bg-slate-900/30 border border-slate-800 p-8 md:p-12">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Container className="w-8 h-8 text-purple-500" />
                <h3 className="text-2xl font-light">Docker Containerization</h3>
              </div>
              <p className="text-slate-400 leading-relaxed max-w-3xl">
                Every code execution is isolated in its own Docker container, providing 
                a consistent and secure environment. This ensures that your code runs 
                reliably regardless of the underlying system, while maintaining complete 
                separation from other users and processes.
              </p>
              <div className="grid md:grid-cols-3 gap-4 pt-4">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-300">Isolated</p>
                    <p className="text-xs text-slate-500">Complete separation</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-300">Fast</p>
                    <p className="text-xs text-slate-500">Quick execution</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-300">Secure</p>
                    <p className="text-xs text-slate-500">Sandboxed environment</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}