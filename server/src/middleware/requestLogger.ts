import { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers["user-agent"]?.slice(0, 100),
    };

    if (res.statusCode >= 500) {
      console.error("[REQ]", JSON.stringify(log));
    } else if (res.statusCode >= 400) {
      console.warn("[REQ]", JSON.stringify(log));
    } else if (req.path !== "/api/health") {
      console.log("[REQ]", JSON.stringify(log));
    }
  });

  next();
}
