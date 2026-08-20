import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { ownerAgreements, users } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, ForbiddenError, ConflictError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

router.get(
  "/mine",
  authenticate,
  requirePermission("asset.read.own"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const rows = await db
      .select()
      .from(ownerAgreements)
      .where(eq(ownerAgreements.ownerId, req.user!.userId))
      .orderBy(desc(ownerAgreements.createdAt));
    res.json(rows);
  })
);

router.post(
  "/sign",
  authenticate,
  requirePermission("asset.submit"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const { commissionPct } = req.body as { commissionPct?: number };

    const existing = await db
      .select()
      .from(ownerAgreements)
      .where(eq(ownerAgreements.ownerId, userId))
      .orderBy(desc(ownerAgreements.createdAt))
      .limit(1);

    if (existing.length > 0 && existing[0].signedAt) {
      throw new ConflictError("Active agreement already exists");
    }

    const [agreement] = await db
      .insert(ownerAgreements)
      .values({
        ownerId: userId,
        version: "1.0",
        commissionPct: commissionPct ?? 20,
        guaranteeAccepted: true,
        signedAt: new Date(),
        signedIp: (req.headers["x-forwarded-for"] as string) ?? req.ip,
        effectiveFrom: new Date(),
      })
      .returning();

    await recordAudit({
      req,
      action: "owner_agreement.sign",
      entityType: "owner_agreement",
      entityId: agreement.id,
      after: agreement,
    });

    res.status(201).json(agreement);
  })
);

router.get(
  "/",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        id: ownerAgreements.id,
        ownerId: ownerAgreements.ownerId,
        ownerName: users.fullName,
        ownerEmail: users.email,
        version: ownerAgreements.version,
        commissionPct: ownerAgreements.commissionPct,
        guaranteeAccepted: ownerAgreements.guaranteeAccepted,
        signedAt: ownerAgreements.signedAt,
        effectiveFrom: ownerAgreements.effectiveFrom,
        effectiveUntil: ownerAgreements.effectiveUntil,
        createdAt: ownerAgreements.createdAt,
      })
      .from(ownerAgreements)
      .leftJoin(users, eq(ownerAgreements.ownerId, users.id))
      .orderBy(desc(ownerAgreements.createdAt))
      .limit(200);
    res.json(rows);
  })
);

export default router;
