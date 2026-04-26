import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(name: string): Map<string, RateLimitEntry> {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  return stores.get(name)!;
}

function cleanupStore(store: Map<string, RateLimitEntry>) {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    for (const store of stores.values()) cleanupStore(store);
  }, 60_000);
  if (cleanupInterval.unref) cleanupInterval.unref();
}

function defaultKeyGenerator(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    "unknown"
  );
}

export function createRateLimiter(name: string, options: RateLimiterOptions) {
  const {
    windowMs,
    maxRequests,
    message = "Too many requests, please try again later",
    keyGenerator = defaultKeyGenerator,
  } = options;

  ensureCleanup();
  const store = getStore(name);

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

    const remaining = Math.max(0, maxRequests - entry.count);
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > maxRequests) {
      res.setHeader("Retry-After", retryAfterSec);
      res.status(429).json({ error: message, code: "RATE_LIMIT", retryAfterSec });
      return;
    }

    next();
  };
}

export const globalLimiter = createRateLimiter("global", {
  windowMs: 60_000,
  maxRequests: 100,
});

export const authLimiter = createRateLimiter("auth", {
  windowMs: 15 * 60_000,
  maxRequests: 15,
  message: "Too many authentication attempts, please try again in 15 minutes",
});

export const strictLimiter = createRateLimiter("strict", {
  windowMs: 60_000,
  maxRequests: 10,
  message: "Rate limit exceeded for this action",
});
