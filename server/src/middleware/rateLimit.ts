import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

function getStore(prefix: string): Map<string, RateLimitEntry> {
  let store = stores.get(prefix);
  if (!store) {
    store = new Map();
    stores.set(prefix, store);
  }
  return store;
}

export function rateLimit(opts: RateLimitOptions) {
  const prefix = opts.keyPrefix ?? "default";
  const store = getStore(prefix);

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, opts.windowMs).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
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
        error: "Too many requests, please try again later",
        retryAfterMs: entry.resetAt - now,
      });
      return;
    }

    next();
  };
}

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  keyPrefix: "auth",
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyPrefix: "api",
});
