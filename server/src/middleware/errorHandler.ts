/**
 * Centralized error handler. Routes just throw typed AppErrors or ZodErrors
 * and this middleware translates them into JSON responses.
 */

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION",
      details: err.issues,
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`${req.method} ${req.path}: ${err.message}`, {
        code: err.code,
        stack: err.stack,
      });
    }
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
    return;
  }

  logger.error(`${req.method} ${req.path}: Unhandled error`, {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  res.status(500).json({
    error: err instanceof Error ? err.message : "Internal server error",
    code: "INTERNAL",
  });
}
