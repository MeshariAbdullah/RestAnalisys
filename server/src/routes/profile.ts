import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq, sql, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, rentals, assets, riskScores } from "../db/schema.js";
import { authenticate, AuthedRequest, signToken } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, ValidationError, UnauthorizedError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";
import { z } from "zod";

const router = Router();

const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().regex(/^\+?9665\d{8}$/).optional(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundError("User");

    const rentalStats = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where status in ('active','out_for_delivery','confirmed'))`,
        completed: sql<number>`count(*) filter (where status in ('closed','closed_with_penalty'))`,
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

    const lastRisk = await db
      .select()
      .from(riskScores)
      .where(eq(riskScores.userId, userId))
      .orderBy(desc(riskScores.createdAt))
      .limit(1);

    const { passwordHash: _, ...safeUser } = user;

    res.json({
      ...safeUser,
      stats: {
        rentals: {
          total: Number(rentalStats[0]?.total ?? 0),
          active: Number(rentalStats[0]?.active ?? 0),
          completed: Number(rentalStats[0]?.completed ?? 0),
        },
        assets: {
          total: Number(assetStats[0]?.total ?? 0),
          listed: Number(assetStats[0]?.listed ?? 0),
          rented: Number(assetStats[0]?.rented ?? 0),
        },
      },
      lastRiskScore: lastRisk[0] ?? null,
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

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.fullName) updateData.fullName = input.fullName;
    if (input.phone) updateData.phoneE164 = input.phone;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    await recordAudit({
      req,
      action: "profile.update",
      entityType: "user",
      entityId: userId,
      after: input,
    });

    const token = signToken({
      userId: updated.id,
      email: updated.email,
      role: updated.role,
      nafathVerified: updated.nafathVerified,
    });

    const { passwordHash: _, ...safeUser } = updated;
    res.json({ user: safeUser, token });
  })
);

router.post(
  "/change-password",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundError("User");

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedError("Current password is incorrect");

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, userId));

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
