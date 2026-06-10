import { Router } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { authenticate, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

router.use(authenticate);

const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phoneE164: z
    .string()
    .regex(/^\+966\d{9}$/, "Must be Saudi E.164 format: +966XXXXXXXXX")
    .optional(),
});

router.patch(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { fullName, phoneE164 } = UpdateProfileSchema.parse(req.body);

    const updates: Record<string, unknown> = {};
    if (fullName) updates.fullName = fullName;
    if (phoneE164) updates.phoneE164 = phoneE164;

    if (Object.keys(updates).length === 0) {
      res.json({ message: "No changes" });
      return;
    }

    const [updated] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, req.user!.userId))
      .returning();

    await recordAudit({
      req,
      actorUserId: req.user!.userId,
      action: "profile.update",
      entityType: "user",
      entityId: req.user!.userId,
      after: updates,
    });

    res.json({
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      role: updated.role,
      phoneE164: updated.phoneE164,
      nationalId: updated.nationalId,
      nafathVerified: updated.nafathVerified,
      kycStatus: updated.kycStatus,
      trustScore: Number(updated.trustScore),
      riskCategory: updated.riskCategory,
    });
  })
);

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/[0-9]/, "Must contain a digit")
    .regex(/[^a-zA-Z0-9]/, "Must contain a special character"),
});

router.post(
  "/change-password",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.userId));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await db
      .update(users)
      .set({ passwordHash: hash, updatedAt: new Date() })
      .where(eq(users.id, req.user!.userId));

    await recordAudit({
      req,
      actorUserId: req.user!.userId,
      action: "profile.password_change",
      entityType: "user",
      entityId: req.user!.userId,
    });

    res.json({ message: "Password changed successfully" });
  })
);

export default router;
