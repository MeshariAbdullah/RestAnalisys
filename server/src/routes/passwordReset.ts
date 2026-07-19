import { Router } from "express";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/errors.js";
import { notifyPasswordReset } from "../services/notificationService.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

// In-memory store for password reset tokens (production: use Redis or DB table)
const resetTokens = new Map<string, { userId: number; email: string; expiresAt: Date }>();

router.post(
  "/forgot-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: "If that email is registered, a reset link has been sent." });
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    resetTokens.set(token, { userId: user.id, email: user.email, expiresAt });

    await notifyPasswordReset(user.email, token);

    return res.json({ message: "If that email is registered, a reset link has been sent." });
  })
);

router.post(
  "/reset-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Token is required" });
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const entry = resetTokens.get(token);
    if (!entry || entry.expiresAt < new Date()) {
      resetTokens.delete(token);
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, entry.userId));

    resetTokens.delete(token);

    await recordAudit({
      req,
      actorUserId: entry.userId,
      action: "auth.password_reset",
      entityType: "user",
      entityId: entry.userId,
    });

    return res.json({ message: "Password has been reset successfully." });
  })
);

export default router;
