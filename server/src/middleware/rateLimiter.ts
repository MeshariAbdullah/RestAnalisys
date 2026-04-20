import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(name: string): Map<string, RateLimitEntry> {
  if (!stores.has(name)) stores.set(name, new Map());
  return stores.get(name)!;
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  name: string;
  keyFn?: (req: Request) => string;
}

export function rateLimit(opts: RateLimitOptions) {
  const store = getStore(opts.name);

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, opts.windowMs);

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = opts.keyFn
      ? opts.keyFn(req)
      : (req.headers["x-forwarded-for"] as string) ?? req.ip ?? "unknown";

    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + opts.windowMs });
      res.setHeader("X-RateLimit-Limit", opts.maxRequests);
      res.setHeader("X-RateLimit-Remaining", opts.maxRequests - 1);
      return next();
    }

    entry.count++;

    if (entry.count > opts.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      res.setHeader("X-RateLimit-Limit", opts.maxRequests);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.status(429).json({
        error: "Too many requests",
        code: "RATE_LIMITED",
        retryAfterSeconds: retryAfter,
      });
      return;
    }

    res.setHeader("X-RateLimit-Limit", opts.maxRequests);
    res.setHeader("X-RateLimit-Remaining", opts.maxRequests - entry.count);
    next();
  };
}

export const authRateLimit = rateLimit({
  name: "auth",
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
});

export const apiRateLimit = rateLimit({
  name: "api",
  windowMs: 60 * 1000,
  maxRequests: 100,
});
