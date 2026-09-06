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

export function rateLimiter(opts: { windowMs: number; max: number; keyPrefix?: string }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const key = `${opts.keyPrefix ?? "rl"}:${ip}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + opts.windowMs };
      store.set(key, entry);
    }

    entry.count++;

    res.setHeader("X-RateLimit-Limit", opts.max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, opts.max - entry.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > opts.max) {
      res.status(429).json({ error: "Too many requests, please try again later" });
      return;
    }

    next();
  };
}

export const authLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  keyPrefix: "auth",
});

export const apiLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  keyPrefix: "api",
});
