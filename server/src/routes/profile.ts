import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, rentals, assets, riskScores } from "../db/schema.js";
import { authenticate, AuthedRequest, signToken } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
} from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";
import { validateNationalAddress } from "../services/nationalAddressService.js";
import { trustScoreToCategory } from "../services/riskEngine.js";
import { z } from "zod";

const router = Router();

const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phoneE164: z
    .string()
    .regex(/^\+?9665\d{8}$/, "Saudi mobile number must match +9665XXXXXXXX")
    .optional(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const UpdateAddressSchema = z.object({
  postalCode: z.string().min(3),
  additionalCode: z.string().min(3),
});

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundError("User");

    const rentalStats = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where status = 'active')`,
        completed: sql<number>`count(*) filter (where status in ('closed','closed_with_penalty'))`,
        totalSpent: sql<number>`coalesce(sum(total_payable_halalas) filter (where status in ('closed','closed_with_penalty','active')), 0)`,
      })
      .from(rentals)
      .where(eq(rentals.renterId, userId));

    const assetStats = await db
      .select({
        total: sql<number>`count(*)`,
        listed: sql<number>`count(*) filter (where status = 'listed')`,
        rented: sql<number>`count(*) filter (where status = 'rented_out')`,
      })
      .from(assets)
      .where(eq(assets.ownerId, userId));

    const { passwordHash: _, ...safeUser } = user;

    res.json({
      ...safeUser,
      stats: {
        rentals: rentalStats[0] ?? { total: 0, active: 0, completed: 0, totalSpent: 0 },
        assets: assetStats[0] ?? { total: 0, listed: 0, rented: 0 },
      },
    });
  })
);

router.patch(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const input = UpdateProfileSchema.parse(req.body);

    if (Object.keys(input).length === 0) {
      throw new ValidationError("No fields to update");
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (input.fullName) updates.fullName = input.fullName;
    if (input.phoneE164) updates.phoneE164 = input.phoneE164;

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

    const { passwordHash: _, ...safeUser } = updated;
    res.json(safeUser);
  })
);

router.post(
  "/change-password",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundError("User");

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedError("Current password is incorrect");

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

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      nafathVerified: user.nafathVerified,
    });

    res.json({ message: "Password updated", token });
  })
);

router.put(
  "/address",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const { postalCode, additionalCode } = UpdateAddressSchema.parse(req.body);

    const result = await validateNationalAddress(postalCode, additionalCode);
    if (!result.valid) {
      throw new ValidationError("Invalid national address");
    }

    await db
      .update(users)
      .set({
        nationalAddressJson: result.address as unknown as object,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await recordAudit({
      req,
      action: "profile.update_address",
      entityType: "user",
      entityId: userId,
      after: { address: result.address, source: result.source },
    });

    res.json({
      address: result.address,
      formattedAddress: result.formattedAddress,
      source: result.source,
    });
  })
);

router.get(
  "/risk-history",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const rows = await db
      .select()
      .from(riskScores)
      .where(eq(riskScores.userId, userId))
      .orderBy(desc(riskScores.createdAt))
      .limit(20);
    res.json(rows);
  })
);

export default router;
