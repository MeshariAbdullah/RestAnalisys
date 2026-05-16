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
}, CLEANUP_INTERVAL_MS);

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

function getClientKey(req: Request, prefix: string): string {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.ip ??
    "unknown";
  return `${prefix}:${ip}`;
}

export function rateLimit(opts: RateLimitOptions) {
  const { windowMs, maxRequests, keyPrefix = "global" } = opts;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = getClientKey(req, keyPrefix);
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

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  maxRequests: 100,
  keyPrefix: "api",
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  maxRequests: 15,
  keyPrefix: "auth",
});

export const strictLimiter = rateLimit({
  windowMs: 60_000,
  maxRequests: 10,
  keyPrefix: "strict",
});
