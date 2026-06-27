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
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
}

export function rateLimit(opts: { windowMs: number; max: number; message?: string }) {
  const { windowMs, max, message = "Too many requests, please try again later" } = opts;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = getClientKey(req);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", max - 1);
      next();
      return;
    }

    entry.count++;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.status(429).json({ error: message, retryAfterSeconds: retryAfter });
      return;
    }

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", max - entry.count);
    next();
  };
}

export const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 15,
  message: "Too many authentication attempts, please try again in 15 minutes",
});

export const strictLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: "Rate limit exceeded for this action",
});
