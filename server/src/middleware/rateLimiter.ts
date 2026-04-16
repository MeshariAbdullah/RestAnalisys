/**
 * Rate limiting middleware. Applies different limits to auth endpoints
 * (stricter) vs general API (more lenient).
 */

import rateLimit from "express-rate-limit";

/** General API: 100 requests per 15 minutes per IP. */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later.", code: "RATE_LIMITED" },
});

/** Auth endpoints: 20 attempts per 15 minutes per IP. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later.", code: "RATE_LIMITED" },
});

/** Payment endpoints: 10 attempts per 15 minutes per IP. */
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many payment attempts, please try again later.", code: "RATE_LIMITED" },
});
