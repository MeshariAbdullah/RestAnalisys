import rateLimit from "express-rate-limit";

const rateLimitResponse = {
  error: "Too many requests, please try again later",
  code: "RATE_LIMITED",
};

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: rateLimitResponse,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: rateLimitResponse,
});

export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: rateLimitResponse,
});
