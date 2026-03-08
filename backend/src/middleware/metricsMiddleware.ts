import type { Request, Response, NextFunction } from "express";
import client from "prom-client";

// Create a Registry
export const register = new client.Registry();

// Add default metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in milliseconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
  registers: [register],
});

export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

export const activeConnections = new client.Gauge({
  name: "active_connections",
  help: "Number of active connections",
  registers: [register],
});

export const dockerContainersTotal = new client.Gauge({
  name: "docker_containers_total",
  help: "Total number of Docker containers running",
  labelNames: ["status"],
  registers: [register],
});

export const codeExecutionsTotal = new client.Counter({
  name: "code_executions_total",
  help: "Total number of code executions",
  labelNames: ["language", "status"],
  registers: [register],
});

export const codeExecutionDuration = new client.Histogram({
  name: "code_execution_duration_ms",
  help: "Duration of code executions in milliseconds",
  labelNames: ["language"],
  buckets: [100, 500, 1000, 2000, 5000, 10000, 30000, 60000],
  registers: [register],
});

export const queueJobsTotal = new client.Counter({
  name: "queue_jobs_total",
  help: "Total number of queue jobs",
  labelNames: ["queue", "status"],
  registers: [register],
});

export const queueJobDuration = new client.Histogram({
  name: "queue_job_duration_ms",
  help: "Duration of queue jobs in milliseconds",
  labelNames: ["queue"],
  buckets: [100, 500, 1000, 2000, 5000, 10000, 30000, 60000],
  registers: [register],
});

// Middleware to track HTTP requests
export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Skip metrics endpoint itself
  if (req.path === "/metrics") {
    return next();
  }

  const start = Date.now();
  activeConnections.inc();

  // Capture the original end function
  const originalEnd = res.end;

  // Override the end function
  res.end = function (this: Response, ...args: any[]): Response {
    const duration = Date.now() - start;
    const route = req.route?.path || req.path || "unknown";
    const method = req.method;
    const statusCode = res.statusCode.toString();

    // Record metrics
    httpRequestDuration.labels(method, route, statusCode).observe(duration);
    httpRequestsTotal.labels(method, route, statusCode).inc();
    activeConnections.dec();

    // Call the original end function
    return originalEnd.apply(this, args as any);
  };

  next();
};

// Metrics endpoint handler
export const metricsHandler = async (req: Request, res: Response) => {
  try {
    res.set("Content-Type", register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error);
  }
};

// Helper function to track code execution
export const trackCodeExecution = (
  language: string,
  status: "success" | "error",
  duration: number,
) => {
  codeExecutionsTotal.labels(language, status).inc();
  codeExecutionDuration.labels(language).observe(duration);
};

// Helper function to track queue jobs
export const trackQueueJob = (
  queue: string,
  status: "completed" | "failed",
  duration: number,
) => {
  queueJobsTotal.labels(queue, status).inc();
  queueJobDuration.labels(queue).observe(duration);
};

// Helper function to update Docker container metrics
export const updateDockerMetrics = (running: number, stopped: number) => {
  dockerContainersTotal.labels("running").set(running);
  dockerContainersTotal.labels("stopped").set(stopped);
};
