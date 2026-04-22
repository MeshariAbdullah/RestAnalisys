import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { authenticate, AuthedRequest, signToken } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordAudit } from "../services/auditService.js";
import { NotFoundError } from "../utils/errors.js";
import { z } from "zod";

const router = Router();

const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phoneE164: z.string().regex(/^\+966\d{9}$/).optional(),
  nationalAddressJson: z.record(z.unknown()).optional(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
});

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
    });
  })
);

router.patch(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = UpdateProfileSchema.parse(req.body);
    const userId = req.user!.userId;

    const [before] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!before) throw new NotFoundError("User");

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (input.fullName) updates.fullName = input.fullName;
    if (input.phoneE164) updates.phoneE164 = input.phoneE164;
    if (input.nationalAddressJson) updates.nationalAddressJson = input.nationalAddressJson;

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
      before: { fullName: before.fullName, phoneE164: before.phoneE164 },
      after: { fullName: updated.fullName, phoneE164: updated.phoneE164 },
    });

    res.json({
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      role: updated.role,
      phoneE164: updated.phoneE164,
      nafathVerified: updated.nafathVerified,
      kycStatus: updated.kycStatus,
      trustScore: updated.trustScore,
      riskCategory: updated.riskCategory,
    });
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
    if (!ok) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await recordAudit({
      req,
      action: "profile.change_password",
      entityType: "user",
      entityId: userId,
    });

    res.json({ ok: true });
  })
);

export default router;
