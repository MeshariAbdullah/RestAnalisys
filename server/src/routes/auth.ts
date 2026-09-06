/**
 * Auth routes — registration, login, Nafath placeholder verification, and
 * session info. The Saudi Digital Identity linkage lives here.
 */

import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { signToken, authenticate, AuthedRequest } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import {
  LoginSchema,
  RegisterSchema,
  NafathVerifySchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
} from "../utils/schemas.js";
import { UnauthorizedError, ConflictError, NotFoundError, ValidationError } from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { initiateNafathVerification } from "../services/nafathService.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

const resetTokens = new Map<string, { userId: number; expiresAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of resetTokens) {
    if (entry.expiresAt <= now) resetTokens.delete(token);
  }
}, 5 * 60 * 1000);

router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = RegisterSchema.parse(req.body);

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    if (existing.length > 0) {
      throw new ConflictError("Email already registered");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        phoneE164: input.phone,
        role: input.role,
      })
      .returning();

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      nafathVerified: user.nafathVerified,
    });

    await recordAudit({
      req,
      actorUserId: user.id,
      actorRole: user.role,
      action: "auth.register",
      entityType: "user",
      entityId: user.id,
      after: { email: user.email, role: user.role },
    });

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        nafathVerified: user.nafathVerified,
        kycStatus: user.kycStatus,
        trustScore: user.trustScore,
      },
    });
  })
);

router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = LoginSchema.parse(req.body);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!user) throw new UnauthorizedError("Invalid credentials");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedError("Invalid credentials");

    if (user.isBlocked) {
      throw new UnauthorizedError(`Account blocked: ${user.blockedReason ?? "contact support"}`);
    }

    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      nafathVerified: user.nafathVerified,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        nafathVerified: user.nafathVerified,
        kycStatus: user.kycStatus,
        trustScore: user.trustScore,
      },
    });
  })
);

router.post(
  "/nafath/initiate",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { nationalId } = NafathVerifySchema.parse(req.body);
    const userId = req.user!.userId;

    const result = await initiateNafathVerification({ nationalId });

    // In the placeholder implementation, verification is synchronous.
    if (result.status === "verified") {
      await db
        .update(users)
        .set({
          nationalId,
          nafathVerified: true,
          nafathVerifiedAt: new Date(),
          nafathTransactionId: result.transactionId,
          kycStatus: "verified",
          phoneVerified: true,
          emailVerified: true,
        })
        .where(eq(users.id, userId));

      await recordAudit({
        req,
        action: "auth.nafath.verified",
        entityType: "user",
        entityId: userId,
        after: { transactionId: result.transactionId },
      });
    }

    return res.json({
      transactionId: result.transactionId,
      status: result.status,
    });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);
    if (!user) throw new NotFoundError("User");

    return res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phoneE164: user.phoneE164,
      nationalId: user.nationalId,
      nafathVerified: user.nafathVerified,
      kycStatus: user.kycStatus,
      phoneVerified: user.phoneVerified,
      emailVerified: user.emailVerified,
      trustScore: user.trustScore,
      riskCategory: user.riskCategory,
      isBlocked: user.isBlocked,
    });
  })
);

router.post(
  "/forgot-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email } = ForgotPasswordSchema.parse(req.body);

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      resetTokens.set(token, {
        userId: user.id,
        expiresAt: Date.now() + 30 * 60 * 1000,
      });

      await recordAudit({
        req,
        actorUserId: user.id,
        action: "auth.password_reset_requested",
        entityType: "user",
        entityId: user.id,
      });

      // In production: send the token via email.
      // In dev mode: log it so the developer can use it.
      if (!process.env.SMTP_HOST) {
        console.log(`[DEV] Password reset token for ${email}: ${token}`);
      }
    }

    // Always return success to prevent email enumeration
    return res.json({
      message: "If that email exists, a reset link has been sent.",
    });
  })
);

router.post(
  "/reset-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { token, newPassword } = ResetPasswordSchema.parse(req.body);

    const entry = resetTokens.get(token);
    if (!entry || entry.expiresAt <= Date.now()) {
      throw new UnauthorizedError("Invalid or expired reset token");
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
      action: "auth.password_reset_completed",
      entityType: "user",
      entityId: entry.userId,
    });

    return res.json({ message: "Password has been reset successfully." });
  })
);

router.post(
  "/change-password",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);
    const userId = req.user!.userId;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundError("User");

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedError("Current password is incorrect");

    if (currentPassword === newPassword) {
      throw new ValidationError("New password must differ from current password");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await recordAudit({
      req,
      action: "auth.password_changed",
      entityType: "user",
      entityId: userId,
    });

    return res.json({ message: "Password changed successfully." });
  })
);

export default router;
