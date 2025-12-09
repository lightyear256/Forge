"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Play, Save, Terminal as TerminalIcon, XCircle, Loader2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

export default function CodeEditor() {
  const [code, setCode] = useState('');
  
  const [language, setLanguage] = useState('python');
  const [filename, setFilename] = useState('main.py');
  const [projectId, setProjectId] = useState('');
  const [token, setToken] = useState('');
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [output, setOutput] = useState<Array<{text: string, type: string, id: number}>>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentJobId, setCurrentJobId] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    const newSocket = io('http://localhost:5000', {
      transports: ['websocket'],
      reconnection: true
    });
    
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
      setSocket(newSocket);
      addOutput(`✓ Connected to server`, 'success');
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
      addOutput(`✗ Disconnected from server`, 'error');
    });

    newSocket.on('output', (data: {type: string, data: string}) => {
      addOutput(data.data, data.type);
    });

    newSocket.on('execution-complete', (data: {exitCode: number}) => {
      setIsRunning(false);
      setCurrentJobId('');
      addOutput(`\n[Process exited with code ${data.exitCode}]`, 'info');
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const addOutput = (text: string, type: string = 'stdout') => {
    setOutput(prev => [...prev, { text, type, id: Date.now() + Math.random() }]);
  };

  const saveCode = async () => {
    if (!projectId || !filename) {
      alert('Please enter Project ID and Filename');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:5000/project/create_file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          filename,
          code
        })
      });

      const result = await response.json();
      
      if (result.success) {
        addOutput(`✓ File saved successfully: ${filename}`, 'success');
      } else {
        addOutput(`✗ Save failed: ${result.message || 'Unknown error'}`, 'error');
      }
    } catch (error: any) {
      addOutput(`✗ Save error: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const runCode = async () => {
    if (!socket || !isConnected) {
      alert('Socket not connected! Please wait...');
      return;
    }

    if (!projectId || !filename) {
      alert('Please enter Project ID and Filename');
      return;
    }

    setOutput([]);
    setIsRunning(true);
    addOutput(`Running ${filename}...\n`, 'info');

    try {
      const response = await fetch('http://localhost:5000/interactive/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          filename,
          language,
          socketId: socket.id
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrentJobId(result.jobId);
        addOutput(`Job started: ${result.jobId}\n`, 'info');
      } else {
        setIsRunning(false);
        addOutput(`✗ Error: ${result.error}`, 'error');
      }
    } catch (error: any) {
      setIsRunning(false);
      addOutput(`✗ Connection error: ${error.message}`, 'error');
    }
  };

  const sendInput = () => {
    if (!currentInput.trim()) return;
    
    if (socket && currentJobId) {
      socket.emit('stdin', { 
        jobId: currentJobId, 
        data: currentInput 
      });
      addOutput(currentInput, 'input');
      setCurrentInput('');
    }
  };

  const stopExecution = () => {
    if (socket && currentJobId) {
      socket.emit('terminate', { jobId: currentJobId });
      setIsRunning(false);
      setCurrentJobId('');
      addOutput('\n[Execution terminated by user]', 'error');
    }
  };

  const getOutputColor = (type: string) => {
    switch (type) {
      case 'stdout': return 'text-green-400';
      case 'stderr': return 'text-red-400';
      case 'error': return 'text-red-500';
      case 'success': return 'text-green-500';
      case 'info': return 'text-blue-400';
      case 'input': return 'text-yellow-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <TerminalIcon className="w-8 h-8" />
          Interactive Code Editor
        </h1>

        <div className="bg-gray-800 rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Project ID"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 outline-none"
          />
          <input
            type="text"
            placeholder="Filename (e.g., main.py)"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 outline-none"
          />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 outline-none"
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="cpp">C++</option>
            <option value="c">C</option>
            <option value="java">Java</option>
            <option value="go">Go</option>
          </select>
          <input
            type="password"
            placeholder="Auth Token (optional)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="bg-gray-800 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={saveCode}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded transition"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
            <button
              onClick={runCode}
              disabled={isRunning || !isConnected}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded transition"
            >
              <Play className="w-4 h-4" />
              Run
            </button>
            {isRunning && (
              <button
                onClick={stopExecution}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
              >
                <XCircle className="w-4 h-4" />
                Stop
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="bg-gray-700 px-4 py-2 font-semibold">Code Editor</div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-96 p-4 bg-gray-900 text-gray-100 font-mono text-sm resize-none focus:outline-none"
              placeholder="Write your code here..."
              spellCheck={false}
            />
          </div>

          <div className="bg-gray-800 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-gray-700 px-4 py-2 font-semibold flex items-center gap-2">
              <TerminalIcon className="w-4 h-4" />
              Terminal
            </div>
            <div
              ref={terminalRef}
              className="flex-1 p-4 bg-black font-mono text-sm overflow-y-auto h-80"
            >
              {output.length === 0 ? (
                <div className="text-gray-500">Output will appear here...</div>
              ) : (
                output.map((item) => (
                  <div key={item.id} className={`${getOutputColor(item.type)} whitespace-pre-wrap`}>
                    {item.type === 'input' && '> '}
                    {item.text}
                  </div>
                ))
              )}
            </div>
            
            <div className="bg-gray-900 p-3 flex gap-2 border-t border-gray-700">
              <input
                ref={inputRef}
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendInput()}
                disabled={!isRunning}
                placeholder={isRunning ? "Type input and press Enter..." : "Run code to enable input"}
                className="flex-1 px-3 py-2 bg-gray-800 rounded border border-gray-600 focus:border-green-500 outline-none disabled:opacity-50"
              />
              <button
                onClick={sendInput}
                disabled={!isRunning || !currentInput.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded transition"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h3 className="font-semibold mb-2">📝 Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
            <li>Enter your Project ID and filename</li>
            <li>Write your code in the editor</li>
            <li>Click "Save" to save code to backend</li>
            <li>Click "Run" to execute code</li>
            <li>When program asks for input, type in terminal and press Enter</li>
            <li>Use "Stop" button to terminate execution</li>
          </ol>
        </div>
      </div>
    </div>
  );
}