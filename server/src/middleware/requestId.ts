import { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

export interface TracedRequest extends Request {
  requestId?: string;
}

export function requestIdMiddleware(req: TracedRequest, res: Response, next: NextFunction): void {
  const id = (req.headers["x-request-id"] as string) || randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}

export function requestLogger(req: TracedRequest, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    console[level === "error" ? "error" : "log"](
      `[${level}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms rid=${req.requestId}`
    );
  });
  next();
}
