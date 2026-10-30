import { Request, Response, NextFunction } from "express";

interface Entry {
  count: number;
  resetAt: number;
}

export function rateLimiter(windowMs: number, maxRequests: number) {
  const store = new Map<string, Entry>();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, 60_000);
  cleanup.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: "Too many requests",
        retryAfterSeconds,
      });
      return;
    }

    return next();
  };
}
