"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Save,
  Terminal,
  Plus,
  Trash2,
  File,
  Loader2,
  XCircle,
  Edit2,
  Check,
  X,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useParams, useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

interface FileItem {
  _id: string;
  filename: string;
  code: string;
}

export default function CodeEditor() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFile, setCurrentFile] = useState<FileItem | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [fileToDelete, setFileToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [output, setOutput] = useState<
    Array<{ text: string; type: string; id: number }>
  >([]);
  const [currentInput, setCurrentInput] = useState("");
  const [currentJobId, setCurrentJobId] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [terminalHeight, setTerminalHeight] = useState(256);
  const [isResizing, setIsResizing] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(
    null
  );

  const isRunningRef = useRef(false);
  const runningJobIdRef = useRef<string>("");

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    if (isRunning && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isRunning]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeRef.current) return;

      const delta = e.clientY - resizeRef.current.startY;
      const newHeight = Math.min(
        Math.max(resizeRef.current.startHeight + delta, 150),
        window.innerHeight - 300
      );
      setTerminalHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = {
      startY: e.clientY,
      startHeight: terminalHeight,
    };
  };

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  useEffect(() => {
    const newSocket = io(
      process.env.NEXT_PUBLIC_WS_URL || "wss://forge.api.ayushmaan.tech",
      {
        transports: ["websocket"],
        reconnection: true,
        withCredentials: true,
      }
    );

    newSocket.on("connect", () => {
      setIsConnected(true);
      setSocket(newSocket);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      isRunningRef.current = false;
      runningJobIdRef.current = "";
      setIsRunning(false);
      setCurrentJobId("");
    });

    newSocket.on("output", (data: { type: string; data: string }) => {
      addOutput(data.data, data.type);
    });

    newSocket.on("execution-complete", (data: { exitCode: number }) => {
      isRunningRef.current = false;
      runningJobIdRef.current = "";

      setIsRunning(false);
      setCurrentJobId("");
      addOutput(`\n[Process exited with code ${data.exitCode}]`, "info");
    });

    newSocket.on("rate-limit-exceeded", (data: { message: string }) => {
      isRunningRef.current = false;
      runningJobIdRef.current = "";
      setIsRunning(false);
      toast.error(data.message);
    });

    newSocket.on("concurrent-limit-exceeded", (data: { message: string }) => {
      isRunningRef.current = false;
      runningJobIdRef.current = "";
      setIsRunning(false);
      toast.error(data.message);
    });

    newSocket.on("execution-blocked", (data: { message: string }) => {
      isRunningRef.current = false;
      runningJobIdRef.current = "";
      setIsRunning(false);
      toast.error(data.message);
    });

    return () => {
      if (runningJobIdRef.current && newSocket.connected) {
        newSocket.emit("terminate", { jobId: runningJobIdRef.current });
      }
      newSocket.close();
    };
  }, []);

  const fetchFiles = async () => {
    try {
      setIsLoadingFiles(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/project/${projectId}`,
        { withCredentials: true }
      );
      if (response.data.success) {
        setFiles(response.data.project.files);
        if (response.data.project.files.length > 0) {
          selectFile(response.data.project.files[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const selectFile = (file: FileItem) => {
    setCurrentFile(file);
    setCode(file.code);
    const ext = file.filename.split(".").pop();
    const langMap: { [key: string]: string } = {
      py: "python",
      js: "javascript",
      cpp: "cpp",
      "c++": "cpp",
      c: "c",
      java: "java",
      go: "go",
      rb: "ruby",
      rs: "rust",
    };
    setLanguage(langMap[ext || "py"] || "python");
  };

  const createFile = async () => {
    if (!newFileName.trim()) return;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/project/create_file`,
        {
          projectId,
          filename: newFileName,
          code: "",
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        await fetchFiles();
        setIsCreatingFile(false);
        setNewFileName("");
        toast.success(`File created: ${newFileName}`);
      }
    } catch (error: any) {
      console.error("Failed to create file:", error);
      toast.error(error.response?.data?.message || "Failed to create file");
    }
  };

  const handleDeleteFile = (filename: string, id: string) => {
    setFileToDelete({ id, name: filename });
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;

    setIsDeleting(true);
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/project/delete_file`,
        {
          data: { projectId, filename: fileToDelete.name, id: fileToDelete.id },
          withCredentials: true,
        }
      );

      await fetchFiles();
      if (currentFile?.filename === fileToDelete.name) {
        setCurrentFile(null);
        setCode("");
      }
      toast.success(`File deleted: ${fileToDelete.name}`);
      setIsDeleteModalOpen(false);
      setFileToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete file:", error);
      toast.error(error.response?.data?.message || "Failed to delete file");
    } finally {
      setIsDeleting(false);
    }
  };

  const renameFile = async (
    oldFilename: string,
    newFilename: string,
    id: string
  ) => {
    if (!newFilename.trim() || oldFilename === newFilename) {
      setRenamingFileId(null);
      return;
    }

    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/project/rename_file`,
        { projectId, id, newFilename },
        { withCredentials: true }
      );
      await fetchFiles();
      setRenamingFileId(null);
      toast.success(`File renamed: ${oldFilename} → ${newFilename}`);
    } catch (error: any) {
      console.error("Failed to rename file:", error);
      toast.error(error.response?.data?.message || "Failed to rename file");
    }
  };

  const addOutput = (text: string, type: string = "stdout") => {
    setOutput((prev) => [
      ...prev,
      { text, type, id: Date.now() + Math.random() },
    ]);
  };

  const saveCode = async () => {
    if (!currentFile) return;

    setIsSaving(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/project/create_file`,
        {
          projectId,
          filename: currentFile.filename,
          code,
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success(`File saved: ${currentFile.filename}`);
      }
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.response?.data?.message || "Failed to save file");
    } finally {
      setIsSaving(false);
    }
  };

  const runCode = async () => {
    if (isRunningRef.current || !socket || !isConnected || !currentFile) {
      if (isRunningRef.current) {
        toast.error("Code is already running. Please wait...");
      }
      return;
    }

    isRunningRef.current = true;
    setIsRunning(true);

    setOutput([]);
    addOutput(`Running ${currentFile.filename}...\n`, "info");

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/interactive/start`,
        {
          projectId,
          filename: currentFile.filename,
          language,
          socketId: socket.id,
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        runningJobIdRef.current = response.data.jobId;
        setCurrentJobId(response.data.jobId);
      } else {
        isRunningRef.current = false;
        runningJobIdRef.current = "";
        setIsRunning(false);
        addOutput(`✗ Error: ${response.data.error}`, "error");
      }
    } catch (error: any) {
      isRunningRef.current = false;
      runningJobIdRef.current = "";
      setIsRunning(false);
      addOutput(`✗ Connection error: ${error.message}`, "error");
    }
  };

  const sendInput = () => {
    if (!currentInput.trim()) return;

    if (socket && currentJobId) {
      socket.emit("stdin", {
        jobId: currentJobId,
        data: currentInput,
      });
      addOutput(currentInput, "input");
      setCurrentInput("");
    }
  };

  const stopExecution = () => {
    if (socket && currentJobId) {
      socket.emit("terminate", { jobId: currentJobId });

      isRunningRef.current = false;
      runningJobIdRef.current = "";

      setIsRunning(false);
      setCurrentJobId("");
      addOutput("\n[Execution terminated]", "error");
    }
  };

  const getOutputColor = (type: string) => {
    switch (type) {
      case "stdout":
        return "text-green-400";
      case "stderr":
        return "text-red-400";
      case "error":
        return "text-red-500";
      case "success":
        return "text-green-500";
      case "info":
        return "text-blue-400";
      case "input":
        return "text-yellow-400";
      default:
        return "text-slate-300";
    }
  };

  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "rgba(15, 23, 42, 0.95)",
            color: "#e2e8f0",
            border: "1px solid rgba(148, 163, 184, 0.1)",
            backdropFilter: "blur(12px)",
          },
          success: {
            iconTheme: {
              primary: "#a855f7",
              secondary: "#0f172a",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#0f172a",
            },
          },
        }}
      />

      <div className="pt-16 md:pt-20 h-screen bg-black text-gray-50 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar */}
        <div className="w-full md:w-64 lg:w-72 bg-black border-b md:border-b-0 md:border-r border-slate-800 flex flex-col max-h-[40vh] md:max-h-none">
          <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest text-slate-500">
              Files
            </h2>
            <button
              onClick={() => router.push("/dashboard")}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500 hover:text-purple-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {isLoadingFiles ? (
              <div className="text-slate-500 text-sm p-4">Loading...</div>
            ) : files.length === 0 ? (
              <div className="text-slate-500 text-sm p-4">No files</div>
            ) : (
              <div className="space-y-px">
                {files.map((file) => (
                  <div
                    key={file._id}
                    className={`group border-b border-slate-800 transition-colors ${
                      currentFile?._id === file._id ? "bg-transparent" : ""
                    }`}
                  >
                    {renamingFileId === file._id ? (
                      <div
                        className="flex items-center gap-2 p-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter")
                              renameFile(file.filename, renameValue, file._id);
                            if (e.key === "Escape") setRenamingFileId(null);
                          }}
                          className="flex-1 px-0 py-1 bg-transparent border-b border-slate-800 focus:border-purple-500 focus:outline-none text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() =>
                            renameFile(file.filename, renameValue, file._id)
                          }
                          className="p-1 hover:text-green-400 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setRenamingFileId(null)}
                          className="p-1 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 flex items-center justify-between">
                        <div
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                          onClick={() => selectFile(file)}
                        >
                          <div
                            className={`w-1 h-1 rounded-full ${
                              currentFile?._id === file._id
                                ? "bg-purple-500"
                                : "bg-slate-700"
                            }`}
                          ></div>
                          <span
                            className={`text-sm truncate transition-colors ${
                              currentFile?._id === file._id
                                ? "text-purple-400"
                                : "text-slate-400 group-hover:text-slate-300"
                            }`}
                          >
                            {file.filename}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingFileId(file._id);
                              setRenameValue(file.filename);
                            }}
                            className="p-1"
                          >
                            <Edit2 className="w-3 h-3 text-slate-500 hover:text-blue-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(file.filename, file._id);
                            }}
                            className="p-1"
                          >
                            <Trash2 className="w-3 h-3 text-slate-500 hover:text-red-400" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-800">
            {isCreatingFile ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && createFile()}
                  placeholder="filename.py"
                  className="w-full px-0 py-2 bg-transparent border-b border-slate-800 focus:border-purple-500 focus:outline-none text-sm placeholder-slate-700"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsCreatingFile(false);
                      setNewFileName("");
                    }}
                    className="flex-1 px-4 py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createFile}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-sm transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingFile(true)}
                disabled={files.length >= 5}
                className="w-full flex items-center gap-2 px-4 py-2 border border-slate-700 hover:border-purple-500 hover:bg-purple-500/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-700 disabled:hover:bg-transparent"
                title={
                  files.length >= 5
                    ? "Maximum 5 files allowed"
                    : "Create new file"
                }
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">New</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Top Bar */}
          <div className="h-12 md:h-16 bg-black border-b border-slate-800 flex items-center justify-between px-4 md:px-6 gap-2 flex-shrink-0">
            <div className="flex items-center gap-3 md:gap-6 min-w-0 flex-1">
              <span className="text-xs md:text-sm text-slate-400 font-light truncate">
                {currentFile ? currentFile.filename : "No file selected"}
              </span>
              <div className="flex items-center gap-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="text-xs text-slate-600 hidden sm:inline">
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>

            <div className="flex gap-2 md:gap-3 flex-shrink-0">
              <button
                onClick={saveCode}
                disabled={isSaving || !currentFile}
                className="flex items-center gap-1 md:gap-2 px-3 md:px-5 py-2 border border-slate-700 hover:border-purple-500 hover:bg-purple-500/5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-700 disabled:hover:bg-transparent transition-all text-xs md:text-sm"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Save</span>
              </button>
              {isRunning ? (
                <button
                  onClick={stopExecution}
                  className="flex items-center gap-1 md:gap-2 px-3 md:px-5 py-2 bg-red-600 hover:bg-red-700 transition-colors text-xs md:text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Stop</span>
                </button>
              ) : (
                <button
                  onClick={runCode}
                  disabled={
                    !isConnected || !currentFile || isRunningRef.current
                  }
                  className="flex items-center gap-1 md:gap-2 px-3 md:px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-800 disabled:text-slate-600 transition-colors text-xs md:text-sm"
                >
                  <Play className="w-4 h-4" />
                  <span className="hidden sm:inline">Run</span>
                </button>
              )}
            </div>
          </div>

          {/* Editor and Terminal Container */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Editor */}
            <div className="flex-1 border-b border-slate-800 min-h-0 overflow-hidden">
              {currentFile ? (
                <Editor
                  height="100%"
                  language={language}
                  value={code}
                  onChange={(value) => setCode(value || "")}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: window.innerWidth > 768 },
                    fontSize: window.innerWidth < 768 ? 12 : 14,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    fontFamily:
                      "JetBrains Mono, Menlo, Monaco, Courier New, monospace",
                    wordWrap: window.innerWidth < 768 ? "on" : "off",
                  }}
                  beforeMount={(monaco) => {
                    monaco.editor.defineTheme("custom-dark", {
                      base: "vs-dark",
                      inherit: true,
                      rules: [],
                      colors: {
                        "editor.background": "#000000",
                      },
                    });
                  }}
                  onMount={(editor, monaco) => {
                    monaco.editor.setTheme("custom-dark");
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center p-4">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto border-2 border-dashed border-slate-800 flex items-center justify-center">
                      <File className="w-8 h-8 text-slate-700" />
                    </div>
                    <p className="text-slate-500 text-sm">
                      Select a file to start editing
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Terminal */}
            <div
              style={{
                height:
                  window.innerWidth < 768 ? "200px" : `${terminalHeight}px`,
              }}
              className="bg-black flex flex-col border-t border-slate-800 min-h-[150px] flex-shrink-0"
            >
              <div
                onMouseDown={startResize}
                className={`h-1 bg-slate-800 hover:bg-purple-500 cursor-ns-resize transition-colors hidden md:block ${
                  isResizing ? "bg-purple-500" : ""
                }`}
              />

              <div className="h-10 bg-black border-b border-slate-800 px-4 md:px-6 flex items-center gap-2 flex-shrink-0">
                <Terminal className="w-3 h-3 text-slate-600" />
                <span className="text-xs text-slate-600 uppercase tracking-wider">
                  Terminal
                </span>
              </div>

              <div
                ref={terminalRef}
                className="flex-1 p-4 md:p-6 font-mono text-xs overflow-y-auto overflow-x-auto"
              >
                {output.length === 0 ? (
                  <div className="text-slate-600">Ready to run...</div>
                ) : (
                  output.map((item) => (
                    <div
                      key={item.id}
                      className={`${getOutputColor(
                        item.type
                      )} whitespace-pre-wrap break-words`}
                    >
                      {item.type === "input" && "> "}
                      {item.text}
                    </div>
                  ))
                )}
              </div>

              <div className="bg-black p-3 flex gap-2 md:gap-3 border-t border-slate-800 flex-shrink-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendInput()}
                  disabled={!isRunning}
                  placeholder={isRunning ? "Type input..." : "Run code first"}
                  className="flex-1 px-0 py-2 bg-transparent border-b border-slate-800 focus:border-purple-500 focus:outline-none text-xs md:text-sm disabled:opacity-50 placeholder-slate-700 min-w-0"
                />
                <button
                  onClick={sendInput}
                  disabled={!isRunning || !currentInput.trim()}
                  className="px-3 md:px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-800 disabled:text-slate-600 transition-colors text-xs md:text-sm flex-shrink-0"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isDeleteModalOpen && fileToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full rounded-xl max-w-md bg-black border border-slate-800">
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-lg font-light">Delete File</h3>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-400 text-sm">
                Are you sure you want to delete{" "}
                <span className="text-slate-200 font-medium">
                  "{fileToDelete.name}"
                </span>
                ? This action cannot be undone.
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setFileToDelete(null);
                  }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 text-sm text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:text-red-400 text-sm transition-colors"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
