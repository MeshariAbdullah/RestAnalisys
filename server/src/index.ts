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
import analyticsRouter from "./routes/analytics.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { globalLimiter, authLimiter } from "./middleware/rateLimiter.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { detectOverdueRentals } from "./services/overdueService.js";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001");

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(requestLogger);
app.use("/api", globalLimiter);
app.use("/api/auth", authLimiter);

// Health
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "mlr-platform",
    version: "1.0.0",
    integrations: {
      nafath: !!process.env.NAFATH_API_KEY,
      nafith: !!process.env.NAFITH_API_KEY,
      paymentGateway: !!process.env.PAYMENT_GATEWAY_API_KEY,
      zatca: !!process.env.ZATCA_API_KEY,
    },
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRouter);
app.use("/api/assets", assetsRouter);
app.use("/api/inspections", inspectionsRouter);
app.use("/api/rentals", rentalsRouter);
app.use("/api/legal", legalRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/disputes", disputesRouter);
app.use("/api/operations", operationsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/analytics", analyticsRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

// Centralized error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🇸🇦  Managed Luxury Rental Platform API running on :${PORT}`);
  console.log(`   Nafath:   ${process.env.NAFATH_API_KEY ? "live" : "placeholder"}`);
  console.log(`   Nafith:   ${process.env.NAFITH_API_KEY ? "live" : "placeholder"}`);
  console.log(`   Payment:  ${process.env.PAYMENT_GATEWAY_API_KEY ? "live" : "placeholder"}`);
  console.log(`   Rate limiting: enabled`);
  console.log(`   Request logging: enabled`);

  // Run overdue detection every hour
  const OVERDUE_INTERVAL_MS = 60 * 60 * 1000;
  setInterval(async () => {
    try {
      const overdue = await detectOverdueRentals();
      if (overdue.length > 0) {
        console.log(`[overdue] Detected ${overdue.length} overdue rental(s)`);
      }
    } catch (err) {
      console.error("[overdue] Detection failed:", err);
    }
  }, OVERDUE_INTERVAL_MS);

  detectOverdueRentals().catch(() => {});
});

export default app;
