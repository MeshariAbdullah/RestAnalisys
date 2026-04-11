/**
 * Centralized error handler. Routes just throw typed AppErrors or ZodErrors
 * and this middleware translates them into JSON responses.
 */

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";

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
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
    return;
  }

  console.error(`[error] ${req.method} ${req.path}:`, err);
  res.status(500).json({
    error: err instanceof Error ? err.message : "Internal server error",
    code: "INTERNAL",
  });
}
