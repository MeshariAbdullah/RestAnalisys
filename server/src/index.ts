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
import helmet from "helmet";
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
import webhooksRouter from "./routes/webhooks.js";
import uploadsRouter from "./routes/uploads.js";
import notificationsRouter from "./routes/notifications.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { generalLimiter, authLimiter, paymentLimiter } from "./middleware/rateLimiter.js";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001");

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Allow frontend to load assets freely
  crossOriginEmbedderPolicy: false,
}));

// Trust proxy for rate limiting behind reverse proxies (Render, etc.)
app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// General rate limiting
app.use("/api/", generalLimiter);

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

// Stricter rate limits on sensitive endpoints
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/payments", paymentLimiter, paymentsRouter);

app.use("/api/assets", assetsRouter);
app.use("/api/inspections", inspectionsRouter);
app.use("/api/rentals", rentalsRouter);
app.use("/api/legal", legalRouter);
app.use("/api/disputes", disputesRouter);
app.use("/api/operations", operationsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/notifications", notificationsRouter);

// Webhook handlers (no auth — validated by signature/token)
app.use("/api/webhooks", webhooksRouter);

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

// Centralized error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`  Managed Luxury Rental Platform API running on :${PORT}`);
  console.log(`   Nafath:   ${process.env.NAFATH_API_KEY ? "live" : "placeholder"}`);
  console.log(`   Nafith:   ${process.env.NAFITH_API_KEY ? "live" : "placeholder"}`);
  console.log(`   Payment:  ${process.env.PAYMENT_GATEWAY_API_KEY ? "live" : "placeholder"}`);
  console.log(`   Security: helmet + rate limiting enabled`);
});

export default app;
