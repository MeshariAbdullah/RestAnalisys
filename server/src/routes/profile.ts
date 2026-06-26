/**
 * User profile routes — update profile, change password, manage addresses.
 */

import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

// ── Update profile info ───────────────────────────────────────────────
router.patch(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const { fullName, phoneE164, nationalAddressJson } = req.body as {
      fullName?: string;
      phoneE164?: string;
      nationalAddressJson?: object;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (fullName && fullName.length >= 2) updates.fullName = fullName;
    if (phoneE164) {
      if (!/^\+?9665\d{8}$/.test(phoneE164)) {
        throw new ValidationError("Phone must be a valid Saudi number (+9665XXXXXXXX)");
      }
      updates.phoneE164 = phoneE164;
    }
    if (nationalAddressJson) updates.nationalAddressJson = nationalAddressJson;

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phoneE164: users.phoneE164,
        role: users.role,
        nationalAddressJson: users.nationalAddressJson,
        nafathVerified: users.nafathVerified,
        kycStatus: users.kycStatus,
        trustScore: users.trustScore,
      });

    if (!updated) throw new NotFoundError("User");

    await recordAudit({
      req,
      action: "profile.update",
      entityType: "user",
      entityId: userId,
      after: updates,
    });

    res.json(updated);
  })
);

// ── Change password ───────────────────────────────────────────────────
router.post(
  "/change-password",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    if (!newPassword || newPassword.length < 8) {
      throw new ValidationError("New password must be at least 8 characters");
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundError("User");

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new ValidationError("Current password is incorrect");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
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
