import { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const method = req.method;
    const url = req.originalUrl;
    const status = res.statusCode;

    const level = status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO";
    const line = `[${level}] ${method} ${url} ${status} ${duration}ms`;

    if (status >= 500) {
      console.error(line);
    } else if (status >= 400) {
      console.warn(line);
    } else if (process.env.NODE_ENV !== "production" || duration > 1000) {
      console.log(line);
    }
  });

  next();
}
