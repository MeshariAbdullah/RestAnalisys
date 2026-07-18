import { Request, Response, NextFunction } from "express";

interface RateBucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateBucket>();

const CLEANUP_INTERVAL = 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}, CLEANUP_INTERVAL).unref();

export function rateLimit({
  windowMs = 60_000,
  max = 60,
  keyFn,
}: {
  windowMs?: number;
  max?: number;
  keyFn?: (req: Request) => string;
} = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyFn ? keyFn(req) : (req.ip ?? "unknown");
    const now = Date.now();
    let bucket = store.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      store.set(key, bucket);
    }

    bucket.count++;

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.status(429).json({
        error: "Too many requests",
        retryAfterMs: bucket.resetAt - now,
      });
      return;
    }

    next();
  };
}

export const globalLimiter = rateLimit({ windowMs: 60_000, max: 100 });

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  keyFn: (req) => `auth:${req.ip ?? "unknown"}`,
});
