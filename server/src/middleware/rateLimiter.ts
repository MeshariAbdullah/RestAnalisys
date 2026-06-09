import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
  keyFn?: (req: Request) => string;
}

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL_MS = 60_000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();
}

function defaultKeyFn(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

export function rateLimiter(config: RateLimiterConfig) {
  const { windowMs, maxRequests, keyFn = defaultKeyFn } = config;

  ensureCleanup();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${keyFn(req)}:${req.path}:${windowMs}`;
    const now = Date.now();
    let entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    const remaining = Math.max(0, maxRequests - entry.count);
    const retryAfterMs = entry.resetAt - now;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > maxRequests) {
      res.setHeader("Retry-After", retryAfterSeconds);
      res.status(429).json({
        error: "Too many requests",
        code: "RATE_LIMITED",
        retryAfterMs,
      });
      return;
    }

    next();
  };
}
