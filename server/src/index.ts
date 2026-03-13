import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRouter from "./routes/auth.js";
import storesRouter from "./routes/stores.js";
import recipesRouter from "./routes/recipes.js";
import videosRouter from "./routes/videos.js";
import alertsRouter from "./routes/alerts.js";
import dashboardRouter from "./routes/dashboard.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001");

app.use(cors({
  origin: process.env.CLIENT_URL ?? "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files for uploads (serve frames if needed)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/frames", express.static(path.join(process.cwd(), "frames")));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    version: "1.0.0",
    providers: {
      gemini: !!process.env.GEMINI_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
    },
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/stores", storesRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/videos", videosRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/dashboard", dashboardRouter);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message ?? "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`🚀 Franchise Quality Monitor API running on port ${PORT}`);
  console.log(`   Gemini API: ${process.env.GEMINI_API_KEY ? "✅ configured" : "❌ missing GEMINI_API_KEY"}`);
  console.log(`   OpenAI API: ${process.env.OPENAI_API_KEY ? "✅ configured" : "❌ missing OPENAI_API_KEY"}`);
});

export default app;
