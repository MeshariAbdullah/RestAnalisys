/**
 * Simple in-memory rate limiter. Suitable for single-instance deployments.
 * For multi-instance, swap to a Redis-backed store.
 */

import type { Request, Response, NextFunction } from "express";

interface RateEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 5 * 60 * 1000).unref();

interface RateLimitOpts {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export function rateLimit(opts: RateLimitOpts) {
  const { windowMs, maxRequests, keyPrefix = "rl" } = opts;

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
    const key = `${keyPrefix}:${ip}`;
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
        error: "Too many requests",
        retryAfterMs: entry.resetAt - now,
      });
      return;
    }

    next();
  };
}

export const globalLimiter = rateLimit({
  windowMs: 60_000,
  maxRequests: 100,
  keyPrefix: "global",
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  maxRequests: 10,
  keyPrefix: "auth",
});

export const strictLimiter = rateLimit({
  windowMs: 60_000,
  maxRequests: 5,
  keyPrefix: "strict",
});
