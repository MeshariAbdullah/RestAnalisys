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

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyGenerator } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator
      ? keyGenerator(req)
      : (req.headers["x-forwarded-for"] as string) ?? req.ip ?? "unknown";

    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    entry.count++;
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      res.status(429).json({
        error: "Too many requests",
        retryAfterSeconds: retryAfter,
      });
      return;
    }

    next();
  };
}

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  maxRequests: 100,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  maxRequests: 10,
  keyGenerator: (req) =>
    `auth:${(req.headers["x-forwarded-for"] as string) ?? req.ip ?? "unknown"}`,
});

export const strictLimiter = rateLimit({
  windowMs: 60_000,
  maxRequests: 5,
  keyGenerator: (req) =>
    `strict:${(req.headers["x-forwarded-for"] as string) ?? req.ip ?? "unknown"}`,
});
