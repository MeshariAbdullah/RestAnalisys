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
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

export function rateLimit(opts: {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${opts.keyPrefix ?? "rl"}:${getClientKey(req)}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + opts.windowMs });
      res.setHeader("X-RateLimit-Limit", opts.maxRequests);
      res.setHeader("X-RateLimit-Remaining", opts.maxRequests - 1);
      next();
      return;
    }

    entry.count++;
    const remaining = Math.max(0, opts.maxRequests - entry.count);

    res.setHeader("X-RateLimit-Limit", opts.maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > opts.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      res.status(429).json({
        error: "Too many requests",
        code: "RATE_LIMITED",
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
  keyPrefix: "api",
});

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
