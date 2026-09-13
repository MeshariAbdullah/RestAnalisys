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
 *   /api/notifications — in-app notifications (read, mark read)
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
import notificationsRouter from "./routes/notifications.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { rateLimit } from "./middleware/rateLimit.js";

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
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, max: 30, keyPrefix: "auth" }));
app.use("/api", rateLimit({ windowMs: 60 * 1000, max: 120, keyPrefix: "api" }));

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
app.use("/api/notifications", notificationsRouter);

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
});

export default app;
