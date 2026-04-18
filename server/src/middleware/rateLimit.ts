/**
 * Simple in-memory rate limiter. For production, swap to a Redis-backed
 * solution (e.g. rate-limiter-flexible with ioredis) for multi-instance
 * consistency.
 */

import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL_MS = 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, CLEANUP_INTERVAL_MS).unref();

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => req.ip ?? "unknown",
    message = "Too many requests, please try again later",
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    let entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - entry.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > maxRequests) {
      res.status(429).json({
        error: message,
        code: "RATE_LIMITED",
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
      return;
    }

    next();
  };
}

export const globalLimiter = rateLimit({
  windowMs: 60_000,
  maxRequests: 100,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  maxRequests: 20,
  message: "Too many authentication attempts, please try again in 15 minutes",
});

export const apiWriteLimiter = rateLimit({
  windowMs: 60_000,
  maxRequests: 30,
  message: "Write rate limit exceeded",
});
