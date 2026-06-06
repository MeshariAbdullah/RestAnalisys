import { Response, NextFunction } from "express";
import type { AuthedRequest } from "./auth.js";

export function requestLogger(req: AuthedRequest, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const level = status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO";
    console.log(
      `[${level}] ${method} ${originalUrl} ${status} ${duration}ms` +
        (req.user ? ` user=${req.user.userId}` : "")
    );
  });

  next();
}
