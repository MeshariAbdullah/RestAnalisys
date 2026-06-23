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
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = "Too many requests, please try again later",
    keyGenerator = (req) => (req.headers["x-forwarded-for"] as string) ?? req.ip ?? "unknown",
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    let entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 1, resetAt: now + windowMs };
      store.set(key, entry);
    } else {
      entry.count++;
    }

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - entry.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > maxRequests) {
      res.status(429).json({ error: message, code: "RATE_LIMITED", retryAfter: Math.ceil((entry.resetAt - now) / 1000) });
      return;
    }

    next();
  };
}

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  maxRequests: 100,
  message: "Too many API requests — limit is 100 per minute",
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  maxRequests: 10,
  message: "Too many login attempts — try again in 15 minutes",
});

export const paymentLimiter = rateLimit({
  windowMs: 60_000,
  maxRequests: 5,
  message: "Too many payment attempts — try again in a minute",
});
