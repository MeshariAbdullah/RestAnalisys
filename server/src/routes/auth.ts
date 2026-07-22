/**
 * Auth routes — registration, login, Nafath placeholder verification, and
 * session info. The Saudi Digital Identity linkage lives here.
 */

import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { eq, and, gt, isNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, passwordResetTokens } from "../db/schema.js";
import { signToken, authenticate, AuthedRequest } from "../middleware/auth.js";
import {
  LoginSchema,
  RegisterSchema,
  NafathVerifySchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "../utils/schemas.js";
import { UnauthorizedError, ConflictError, NotFoundError } from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { initiateNafathVerification } from "../services/nafathService.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

router.post(
  "/register",
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
  asyncHandler(async (req, res) => {
    const { email } = ForgotPasswordSchema.parse(req.body);
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ ok: true, message: "If that email exists, a reset link has been sent." });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // In production, send `rawToken` via email. In dev, return it directly.
    const devResponse = process.env.NODE_ENV === "production"
      ? {}
      : { devToken: rawToken };

    await recordAudit({
      req,
      actorUserId: user.id,
      actorRole: null,
      action: "auth.password_reset_requested",
      entityType: "user",
      entityId: user.id,
    });

    res.json({ ok: true, message: "If that email exists, a reset link has been sent.", ...devResponse });
  })
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { token, newPassword } = ResetPasswordSchema.parse(req.body);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const [resetRecord] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          gt(passwordResetTokens.expiresAt, new Date()),
          isNull(passwordResetTokens.usedAt)
        )
      )
      .limit(1);

    if (!resetRecord) {
      throw new UnauthorizedError("Invalid or expired reset token");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, resetRecord.userId));

    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetRecord.id));

    await recordAudit({
      req,
      actorUserId: resetRecord.userId,
      actorRole: null,
      action: "auth.password_reset_completed",
      entityType: "user",
      entityId: resetRecord.userId,
    });

    res.json({ ok: true, message: "Password has been reset successfully." });
  })
);

export default router;
