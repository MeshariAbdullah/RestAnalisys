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

export function rateLimit(opts: {
  name: string;
  windowMs: number;
  max: number;
  keyFn?: (req: Request) => string;
}) {
  const store = getStore(opts.name);
  const keyFn = opts.keyFn ?? ((req: Request) => req.ip ?? "unknown");

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyFn(req);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }

    entry.count++;
    if (entry.count > opts.max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      res.status(429).json({
        error: "Too many requests",
        code: "RATE_LIMITED",
        retryAfter,
      });
      return;
    }

    next();
  };
}

export const authLimiter = rateLimit({
  name: "auth",
  windowMs: 15 * 60 * 1000,
  max: 20,
});

export const apiLimiter = rateLimit({
  name: "api",
  windowMs: 60 * 1000,
  max: 100,
});
