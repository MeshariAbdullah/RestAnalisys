/**
 * In-memory rate limiting middleware.
 *
 * Two pre-configured instances:
 *   - apiRateLimit:  100 req/min per IP  (general API traffic)
 *   - authRateLimit:  10 req/min per IP  (login/register brute-force guard)
 *
 * Old entries are purged every 5 minutes to avoid unbounded memory growth.
 */

import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number; // epoch ms
}

interface RateLimitOptions {
  windowMs: number;   // time window in milliseconds
  maxRequests: number; // max requests allowed within the window
}

function createRateLimiter({ windowMs, maxRequests }: RateLimitOptions) {
  const store = new Map<string, RateLimitEntry>();

  // Purge expired entries every 5 minutes
  const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    });
  }, CLEANUP_INTERVAL_MS);

  // Allow the process to exit cleanly without waiting for the timer
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      req.socket.remoteAddress ??
      "unknown";

    const now = Date.now();
    let entry = store.get(ip);

    // If no entry or the window has expired, start a fresh window
    if (!entry || now >= entry.resetAt) {
      entry = { count: 1, resetAt: now + windowMs };
      store.set(ip, entry);
      return next();
    }

    entry.count += 1;

    if (entry.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: "Too many requests",
        code: "RATE_LIMIT",
        retryAfterSeconds,
      });
      return;
    }

    next();
  };
}

/** General API rate limit — 100 requests per minute per IP */
export const apiRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
});

/** Auth-specific rate limit — 10 requests per minute per IP */
export const authRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
});
