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

function getKey(req: Request, prefix: string): string {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  return `${prefix}:${ip}`;
}

export function rateLimit(opts: { windowMs: number; max: number; prefix?: string }) {
  const { windowMs, max, prefix = "global" } = opts;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = getKey(req, prefix);
    const now = Date.now();
    let entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 1, resetAt: now + windowMs };
      store.set(key, entry);
    } else {
      entry.count++;
    }

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - entry.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      res.status(429).json({
        error: "Too many requests",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfterMs: entry.resetAt - now,
      });
      return;
    }

    next();
  };
}

export const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, prefix: "auth" });
export const apiRateLimit = rateLimit({ windowMs: 60 * 1000, max: 100, prefix: "api" });
export const sensitiveRateLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, prefix: "sensitive" });
