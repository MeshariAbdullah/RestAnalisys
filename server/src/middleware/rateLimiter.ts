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
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.ip;
  return ip ?? "unknown";
}

export function rateLimit(opts: {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const prefix = opts.keyPrefix ?? "global";
    const key = `${prefix}:${getClientKey(req)}`;
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

export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  maxRequests: 100,
  keyPrefix: "api",
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  maxRequests: 15,
  keyPrefix: "auth",
});

export const strictRateLimit = rateLimit({
  windowMs: 60_000,
  maxRequests: 10,
  keyPrefix: "strict",
});
