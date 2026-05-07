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

function getClientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.ip;
  return ip ?? "unknown";
}

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
  keyFn?: (req: Request) => string;
}

export function rateLimit(opts: RateLimitOptions = {}) {
  const {
    windowMs = 60_000,
    maxRequests = 60,
    keyPrefix = "global",
    keyFn = getClientKey,
  } = opts;

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientKey = `${keyPrefix}:${keyFn(req)}`;
    const now = Date.now();
    const entry = store.get(clientKey);

    if (!entry || entry.resetAt <= now) {
      store.set(clientKey, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", maxRequests - 1);
      next();
      return;
    }

    entry.count++;
    const remaining = Math.max(0, maxRequests - entry.count);
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
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

export const globalLimiter = rateLimit({ windowMs: 60_000, maxRequests: 100 });

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  maxRequests: 10,
  keyPrefix: "auth",
});

export const uploadLimiter = rateLimit({
  windowMs: 60_000,
  maxRequests: 20,
  keyPrefix: "upload",
});
