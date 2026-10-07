import { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

    const log = `[${level}] ${req.method} ${req.path} ${status} ${duration}ms`;

    if (level === "error") console.error(log);
    else if (level === "warn") console.warn(log);
    else if (process.env.NODE_ENV !== "production" || duration > 1000) console.log(log);
  });

  next();
}
