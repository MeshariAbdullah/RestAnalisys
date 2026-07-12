import { Router } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { authenticate, AuthedRequest, signToken } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordAudit } from "../services/auditService.js";
import { z } from "zod";

const router = Router();

const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phoneE164: z.string().regex(/^\+?9665\d{8}$/).optional(),
  nationalAddressJson: z.object({
    city: z.string(),
    district: z.string(),
    street: z.string(),
    buildingNumber: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
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
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const { passwordHash, ...profile } = user;
    res.json(profile);
  })
);

router.patch(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = UpdateProfileSchema.parse(req.body);
    const userId = req.user!.userId;

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
      after: input,
    });

    const { passwordHash, ...profile } = updated;
    res.json(profile);
  })
);

router.post(
  "/change-password",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);
    const userId = req.user!.userId;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
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
