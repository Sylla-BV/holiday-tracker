'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Download } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  details?: any;
}

export function DebugConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const originalConsole = useRef({
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  });

  useEffect(() => {
    // Override console methods to capture logs
    const captureLog = (type: LogEntry['type']) => (...args: any[]) => {
      const timestamp = new Date().toISOString();
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => [...prev, { timestamp, type, message, details: args }]);
      
      // Call original console method
      originalConsole.current[type](...args);
    };

    console.log = captureLog('log');
    console.error = captureLog('error');
    console.warn = captureLog('warn');
    console.info = captureLog('info');

    // Listen for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const timestamp = new Date().toISOString();
      setLogs(prev => [...prev, {
        timestamp,
        type: 'error',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        details: event.reason
      }]);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      // Restore original console methods
      console.log = originalConsole.current.log;
      console.error = originalConsole.current.error;
      console.warn = originalConsole.current.warn;
      console.info = originalConsole.current.info;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const clearLogs = () => setLogs([]);
  
  const downloadLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vacation-app-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return 'text-red-600';
      case 'warn': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  if (!isVisible) {
    return (
      <Button
        className="fixed bottom-4 right-4 z-50"
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
      >
        Debug Console ({logs.filter(l => l.type === 'error').length} errors)
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-[600px] max-h-[400px] z-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Debug Console</CardTitle>
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={downloadLogs}>
              <Download className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={clearLogs}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsVisible(false)}>
              Hide
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[300px] overflow-y-auto p-4 font-mono text-xs space-y-1">
          {logs.length === 0 ? (
            <p className="text-gray-500">No logs captured yet...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`${getLogColor(log.type)} break-all`}>
                <span className="text-gray-400">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>{' '}
                <span className="font-semibold">{log.type.toUpperCase()}:</span>{' '}
                {log.message}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}