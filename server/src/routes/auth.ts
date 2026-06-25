/**
 * Auth routes — registration, login, Nafath placeholder verification, and
 * session info. The Saudi Digital Identity linkage lives here.
 */

import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, refreshTokens } from "../db/schema.js";
import { signToken, authenticate, AuthedRequest, generateRefreshToken, verifyToken } from "../middleware/auth.js";
import { LoginSchema, RegisterSchema, NafathVerifySchema } from "../utils/schemas.js";
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

    const refresh = generateRefreshToken();
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: refresh.token,
      expiresAt: refresh.expiresAt,
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
      refreshToken: refresh.token,
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

    const refresh = generateRefreshToken();
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: refresh.token,
      expiresAt: refresh.expiresAt,
    });

    return res.json({
      token,
      refreshToken: refresh.token,
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

// ── Refresh token → new access token ──────────────────────────────────────
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken: rt } = req.body as { refreshToken?: string };
    if (!rt) throw new UnauthorizedError("Refresh token required");

    const [record] = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.token, rt), isNull(refreshTokens.revokedAt)))
      .limit(1);

    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, record.userId))
      .limit(1);
    if (!user || user.isBlocked) {
      throw new UnauthorizedError("Account unavailable");
    }

    // Rotate: revoke old, issue new
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, record.id));

    const newRefresh = generateRefreshToken();
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: newRefresh.token,
      expiresAt: newRefresh.expiresAt,
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      nafathVerified: user.nafathVerified,
    });

    return res.json({
      token,
      refreshToken: newRefresh.token,
    });
  })
);

// ── Logout (revoke refresh token) ─────────────────────────────────────────
router.post(
  "/logout",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { refreshToken: rt } = req.body as { refreshToken?: string };
    if (rt) {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokens.token, rt),
            eq(refreshTokens.userId, req.user!.userId)
          )
        );
    }
    return res.json({ ok: true });
  })
);

export default router;
