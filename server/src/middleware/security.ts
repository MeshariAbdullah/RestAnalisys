import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

export const securityHeaders: RequestHandler = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
});

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later", code: "RATE_LIMIT" },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later", code: "AUTH_RATE_LIMIT" },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Upload limit exceeded, try again later", code: "UPLOAD_RATE_LIMIT" },
});
