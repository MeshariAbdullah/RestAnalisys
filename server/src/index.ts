/**
 * Managed Luxury Rental Platform — API entrypoint.
 *
 * Module layout:
 *   /api/auth         — registration, login, Nafath hooks
 *   /api/assets       — owner submissions, admin approvals, public listings
 *   /api/inspections  — inspector intake + return reports
 *   /api/rentals      — rental lifecycle (runs risk engine, produces legal)
 *   /api/legal        — contract signing, Sanad lifecycle, enforcement
 *   /api/payments     — gateway + ZATCA invoicing + owner payouts
 *   /api/disputes     — dispute creation + resolution
 *   /api/operations   — shipments, inventory, alerts
 *   /api/admin        — KPIs, risk monitoring, user management
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRouter from "./routes/auth.js";
import assetsRouter from "./routes/assets.js";
import inspectionsRouter from "./routes/inspections.js";
import rentalsRouter from "./routes/rentals.js";
import legalRouter from "./routes/legal.js";
import paymentsRouter from "./routes/payments.js";
import disputesRouter from "./routes/disputes.js";
import operationsRouter from "./routes/operations.js";
import adminRouter from "./routes/admin.js";
import uploadsRouter from "./routes/uploads.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiLimiter, authLimiter, paymentLimiter } from "./middleware/rateLimiter.js";
import { logger } from "./utils/logger.js";
import { startScheduledTasks } from "./services/scheduledTasks.js";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001");
const startedAt = new Date().toISOString();

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger[level](`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration,
      ip: (req.headers["x-forwarded-for"] as string) ?? req.ip,
    });
  });
  next();
});

// Global rate limit
app.use("/api", apiLimiter);

// Health
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "mlr-platform",
    version: "1.1.0",
    startedAt,
    uptime: process.uptime(),
    integrations: {
      nafath: !!process.env.NAFATH_API_KEY,
      nafith: !!process.env.NAFITH_API_KEY,
      paymentGateway: !!process.env.PAYMENT_GATEWAY_API_KEY,
      zatca: !!process.env.ZATCA_API_KEY,
      s3: !!process.env.S3_ACCESS_KEY,
      smtp: !!process.env.SMTP_HOST,
      sms: !!process.env.SMS_API_KEY,
    },
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/assets", assetsRouter);
app.use("/api/inspections", inspectionsRouter);
app.use("/api/rentals", rentalsRouter);
app.use("/api/legal", legalRouter);
app.use("/api/payments", paymentLimiter, paymentsRouter);
app.use("/api/disputes", disputesRouter);
app.use("/api/operations", operationsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/uploads", uploadsRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

// Centralized error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Managed Luxury Rental Platform API running on :${PORT}`);
  logger.info("Integration status", {
    nafath: process.env.NAFATH_API_KEY ? "live" : "placeholder",
    nafith: process.env.NAFITH_API_KEY ? "live" : "placeholder",
    payment: process.env.PAYMENT_GATEWAY_API_KEY ? "live" : "placeholder",
    s3: process.env.S3_ACCESS_KEY ? "live" : "placeholder",
    smtp: process.env.SMTP_HOST ? "live" : "placeholder",
  });

  startScheduledTasks();
});

export default app;
