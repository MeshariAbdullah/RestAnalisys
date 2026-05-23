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
    const key = keyGenerator ? keyGenerator(req) : getClientIp(req);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
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
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      res.status(429).json({
        error: "Too many requests",
        retryAfterSeconds: retryAfter,
      });
      return;
    }

    next();
  };
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.ip ?? "unknown";
}

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  maxRequests: 100,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  maxRequests: 20,
  keyGenerator: (req) => `auth:${getClientIp(req)}`,
});

export const sensitiveActionLimiter = rateLimit({
  windowMs: 60_000,
  maxRequests: 10,
  keyGenerator: (req) => `sensitive:${getClientIp(req)}`,
});
