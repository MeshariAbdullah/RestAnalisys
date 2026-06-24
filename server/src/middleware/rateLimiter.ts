import { Request, Response, NextFunction } from "express";

interface RateEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 60_000);

export function rateLimiter(opts: { windowMs?: number; max?: number } = {}) {
  const windowMs = opts.windowMs ?? 60_000;
  const max = opts.max ?? 100;

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.status(429).json({
        error: "Too many requests",
        retryAfterMs: entry.resetAt - now,
      });
      return;
    }

    next();
  };
}
