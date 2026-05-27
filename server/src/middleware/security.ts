import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";

export const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
});

export function requestId(req: Request, _res: Response, next: NextFunction): void {
  req.headers["x-request-id"] =
    (req.headers["x-request-id"] as string) ?? crypto.randomUUID();
  next();
}

export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later", code: "RATE_LIMIT" },
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? req.headers["x-forwarded-for"] as string ?? "unknown",
  message: { error: "Too many authentication attempts", code: "AUTH_RATE_LIMIT" },
});

export const sensitiveRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded for this action", code: "SENSITIVE_RATE_LIMIT" },
});
