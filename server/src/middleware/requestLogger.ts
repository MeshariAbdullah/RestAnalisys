import { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const line = `${req.method} ${req.path} ${res.statusCode} ${duration}ms`;

    if (res.statusCode >= 500) {
      console.error(`[req] ${line}`);
    } else if (res.statusCode >= 400) {
      console.warn(`[req] ${line}`);
    } else {
      console.log(`[req] ${line}`);
    }
  });

  next();
}
