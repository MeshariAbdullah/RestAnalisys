/**
 * Rate-limiting middleware. Applied per-endpoint group to protect against abuse.
 *
 * Uses a sliding-window counter backed by an in-memory store (sufficient for
 * single-process deployments). For multi-process / multi-node production use,
 * swap to a Redis-backed store.
 */

import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Try again in 15 minutes." },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded. Please slow down." },
});

export const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many write operations. Please slow down." },
});
