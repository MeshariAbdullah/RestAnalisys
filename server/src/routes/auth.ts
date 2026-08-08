/**
 * Auth routes — registration, login, Nafath placeholder verification, and
 * session info. The Saudi Digital Identity linkage lives here.
 */

import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { signToken, authenticate, AuthedRequest } from "../middleware/auth.js";
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

router.patch(
  "/me",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const { fullName, phoneE164 } = req.body as {
      fullName?: string;
      phoneE164?: string;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (fullName && fullName.length >= 2) updates.fullName = fullName;
    if (phoneE164) updates.phoneE164 = phoneE164;

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    await recordAudit({
      req,
      action: "auth.profile_update",
      entityType: "user",
      entityId: userId,
      after: { fullName: updated.fullName, phoneE164: updated.phoneE164 },
    });

    return res.json({
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      role: updated.role,
      phoneE164: updated.phoneE164,
      nationalId: updated.nationalId,
      nafathVerified: updated.nafathVerified,
      kycStatus: updated.kycStatus,
      phoneVerified: updated.phoneVerified,
      emailVerified: updated.emailVerified,
      trustScore: updated.trustScore,
      riskCategory: updated.riskCategory,
      isBlocked: updated.isBlocked,
    });
  })
);

export default router;
