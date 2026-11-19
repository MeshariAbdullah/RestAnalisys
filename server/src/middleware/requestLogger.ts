import { Response, NextFunction } from "express";
import { AuthedRequest } from "./auth.js";

export function requestLogger(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (req.path === "/api/health") {
    next();
    return;
  }

  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const userId = req.user?.userId ?? "-";
    console.log(
      `[REQ] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms userId=${userId}`
    );
  });

  next();
}
