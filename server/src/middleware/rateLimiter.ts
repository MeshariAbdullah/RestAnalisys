import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}, 60_000);

function getClientKey(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
}

export function rateLimit(opts: { windowMs: number; maxRequests: number; keyPrefix?: string }) {
  const { windowMs, maxRequests, keyPrefix = "global" } = opts;

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientKey = `${keyPrefix}:${getClientKey(req)}`;
    const now = Date.now();
    let entry = buckets.get(clientKey);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(clientKey, entry);
    }

    entry.count++;

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - entry.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > maxRequests) {
      res.status(429).json({
        error: "Too many requests",
        retryAfterMs: entry.resetAt - now,
      });
      return;
    }

    next();
  };
}

export const globalLimiter = rateLimit({
  windowMs: 60_000,
  maxRequests: 100,
  keyPrefix: "api",
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  maxRequests: 20,
  keyPrefix: "auth",
});

export const strictLimiter = rateLimit({
  windowMs: 60_000,
  maxRequests: 10,
  keyPrefix: "strict",
});
