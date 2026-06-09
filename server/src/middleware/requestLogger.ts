import { Request, Response, NextFunction } from "express";

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

function colorForStatus(status: number): string {
  if (status >= 500) return RED;
  if (status >= 400) return YELLOW;
  return GREEN;
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.path === "/api/health") {
    next();
    return;
  }

  const start = performance.now();

  res.on("finish", () => {
    const duration = (performance.now() - start).toFixed(1);
    const status = res.statusCode;
    const color = colorForStatus(status);
    const ip = req.ip ?? req.socket.remoteAddress ?? "-";

    let line = `[req] ${req.method} ${req.originalUrl} ${color}${status}${RESET} ${duration}ms ${ip}`;

    const bodySize = req.get("content-length");
    if (bodySize) {
      line += ` body=${bodySize}B`;
    }

    console.log(line);
  });

  next();
}
