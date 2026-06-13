import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, UnauthorizedError } from "../utils/errors.js";
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
      nafathVerifiedAt: user.nafathVerifiedAt,
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
  asyncHandler(async (req: AuthedRequest, res) => {
    const { fullName, phoneE164, nationalAddressJson } = req.body as {
      fullName?: string;
      phoneE164?: string;
      nationalAddressJson?: object;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (fullName) updates.fullName = fullName;
    if (phoneE164) updates.phoneE164 = phoneE164;
    if (nationalAddressJson) updates.nationalAddressJson = nationalAddressJson;

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, req.user!.userId))
      .returning();

    await recordAudit({
      req,
      action: "profile.update",
      entityType: "user",
      entityId: req.user!.userId,
      after: updates,
    });

    res.json({
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      phoneE164: updated.phoneE164,
      nationalAddressJson: updated.nationalAddressJson,
    });
  })
);

router.post(
  "/change-password",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);
    if (!user) throw new NotFoundError("User");

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedError("Current password is incorrect");

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, req.user!.userId));

    await recordAudit({
      req,
      action: "profile.change_password",
      entityType: "user",
      entityId: req.user!.userId,
    });

    res.json({ ok: true });
  })
);

export default router;
