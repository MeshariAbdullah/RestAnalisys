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
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import compression from "compression";

import { pool } from "./db/index.js";
import authRouter from "./routes/auth.js";
import assetsRouter from "./routes/assets.js";
import inspectionsRouter from "./routes/inspections.js";
import rentalsRouter from "./routes/rentals.js";
import legalRouter from "./routes/legal.js";
import paymentsRouter from "./routes/payments.js";
import disputesRouter from "./routes/disputes.js";
import operationsRouter from "./routes/operations.js";
import adminRouter from "./routes/admin.js";
import { errorHandler } from "./middleware/errorHandler.js";

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

// ── Security & observability middleware ──────────────────────────────
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(compression());

// Rate limiting — strict on auth, relaxed on other API routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

// Health
app.get("/api/health", async (_req, res) => {
  let dbOk = false;
  try {
    await pool.query("SELECT 1");
    dbOk = true;
  } catch {}
  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    service: "mlr-platform",
    version: "1.0.0",
    database: dbOk ? "connected" : "disconnected",
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

// ── Graceful shutdown ────────────────────────────────────────────────
function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received — shutting down gracefully`);
  pool.end().then(() => process.exit(0)).catch(() => process.exit(1));
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default app;
