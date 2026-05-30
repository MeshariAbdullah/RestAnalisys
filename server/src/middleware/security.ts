import { Request, Response, NextFunction } from "express";

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.removeHeader("X-Powered-By");
  next();
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id =
    (req.headers["x-request-id"] as string) ??
    `mlr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  req.headers["x-request-id"] = id;
  res.setHeader("X-Request-Id", id);
  next();
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = req.headers["x-request-id"] ?? "-";

  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    console.log(
      `[${level}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms [${requestId}]`
    );
  });

  next();
}
