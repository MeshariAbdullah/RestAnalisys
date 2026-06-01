/**
 * Security middleware — rate limiting, request IDs, and security headers.
 * All in-memory, no external dependencies.
 */

import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// ── Rate Limiter ────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStores = new Map<string, Map<string, RateLimitEntry>>();

const CLEANUP_INTERVAL_MS = 60_000; // clean up expired entries every minute

function createRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, RateLimitEntry>();
  const storeId = `${maxRequests}-${windowMs}-${Date.now()}`;
  rateLimitStores.set(storeId, store);

  // Periodic cleanup of expired entries
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  // Allow the process to exit without waiting for this timer
  if (timer.unref) timer.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const now = Date.now();

    let entry = store.get(ip);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(ip, entry);
    }

    entry.count++;

    // Set rate-limit headers
    const remaining = Math.max(0, maxRequests - entry.count);
    res.setHeader("X-RateLimit-Limit", String(maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error: "Too many requests. Please try again later.",
        retryAfterSeconds: retryAfter,
      });
      return;
    }

    next();
  };
}

/** General rate limiter — 100 requests per 15-minute window. */
export const rateLimiter = createRateLimiter(100, 15 * 60 * 1000);

/** Stricter rate limiter for auth endpoints — 20 requests per 15-minute window. */
export const authRateLimiter = createRateLimiter(20, 15 * 60 * 1000);

// ── Request ID ──────────────────────────────────────────────────────────────

/** Attach a unique request ID (X-Request-Id) to every request and response. */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = crypto.randomUUID();
  (req as any).id = id;
  req.headers["x-request-id"] = id;
  res.setHeader("X-Request-Id", id);
  next();
}

// ── Security Headers ────────────────────────────────────────────────────────

/** Set standard security headers on every response. */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
}
