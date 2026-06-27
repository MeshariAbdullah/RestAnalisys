import { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip;
    const status = res.statusCode;
    const level = status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO";

    console.log(
      JSON.stringify({
        level,
        ts: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status,
        durationMs: duration,
        ip,
        userAgent: req.headers["user-agent"]?.slice(0, 120),
      })
    );
  });

  next();
}
