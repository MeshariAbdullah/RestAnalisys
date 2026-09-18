import { Request, Response, NextFunction } from "express";

interface RateLimiterOptions {
  windowMs: number;
  max: number;
}

const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(opts: RateLimiterOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }

    entry.count++;
    if (entry.count > opts.max) {
      res.status(429).json({ error: "Too many requests, please try again later" });
      return;
    }

    next();
  };
}
