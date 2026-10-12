/**
 * Simple in-memory rate limiter. In production, use Redis-backed
 * rate limiting (e.g. express-rate-limit with ioredis store).
 */

import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 60_000);

export function rateLimit(opts: {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = (req.headers["x-forwarded-for"] as string) ?? req.ip ?? "unknown";
    const key = `${opts.keyPrefix ?? "rl"}:${ip}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + opts.windowMs };
      store.set(key, entry);
    }

    entry.count++;

    res.setHeader("X-RateLimit-Limit", opts.maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, opts.maxRequests - entry.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > opts.maxRequests) {
      res.status(429).json({
        error: "Too many requests",
        retryAfterMs: entry.resetAt - now,
      });
      return;
    }

    next();
  };
}

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  keyPrefix: "auth",
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyPrefix: "api",
});
