import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { ProfileUpdateSchema, PasswordChangeSchema } from "../utils/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, UnauthorizedError, ValidationError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);
    if (!user) throw new NotFoundError("User");

    res.json({
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
      nationalAddressJson: user.nationalAddressJson,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    });
  })
);

router.patch(
  "/",
  authenticate,
  requirePermission("profile.update"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = ProfileUpdateSchema.parse(req.body);
    const userId = req.user!.userId;

    const [before] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!before) throw new NotFoundError("User");

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (input.fullName !== undefined) updates.fullName = input.fullName;
    if (input.phoneE164 !== undefined) updates.phoneE164 = input.phoneE164;
    if (input.nationalAddressJson !== undefined)
      updates.nationalAddressJson = input.nationalAddressJson;

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    await recordAudit({
      req,
      action: "profile.update",
      entityType: "user",
      entityId: userId,
      before: {
        fullName: before.fullName,
        phoneE164: before.phoneE164,
      },
      after: {
        fullName: updated.fullName,
        phoneE164: updated.phoneE164,
      },
    });

    res.json({
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      role: updated.role,
      phoneE164: updated.phoneE164,
      nationalAddressJson: updated.nationalAddressJson,
    });
  })
);

router.post(
  "/change-password",
  authenticate,
  requirePermission("profile.update"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = PasswordChangeSchema.parse(req.body);
    const userId = req.user!.userId;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundError("User");

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Current password is incorrect");

    if (input.currentPassword === input.newPassword) {
      throw new ValidationError("New password must differ from the current one");
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await recordAudit({
      req,
      action: "profile.password_changed",
      entityType: "user",
      entityId: userId,
    });

    res.json({ ok: true });
  })
);

export default router;
