import type { Request, Response, NextFunction } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, Bucket>>();

export function rateLimit(opts: { windowMs: number; max: number; name?: string }) {
  const key = opts.name ?? `rl-${Math.random().toString(36).slice(2, 8)}`;
  if (!stores.has(key)) stores.set(key, new Map());
  const buckets = stores.get(key)!;

  setInterval(() => {
    const now = Date.now();
    for (const [ip, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(ip);
    }
  }, opts.windowMs);

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    let bucket = buckets.get(ip);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(ip, bucket);
    }

    bucket.count++;

    res.setHeader("X-RateLimit-Limit", opts.max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, opts.max - bucket.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(bucket.resetAt / 1000));

    if (bucket.count > opts.max) {
      return res.status(429).json({
        error: "Too many requests",
        retryAfterMs: bucket.resetAt - now,
      });
    }

    next();
  };
}
