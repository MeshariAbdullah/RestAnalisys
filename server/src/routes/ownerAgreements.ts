import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { ownerAgreements, users } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, LegalStateError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

router.get(
  "/mine",
  authenticate,
  requirePermission("asset.submit"),
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
  "/",
  authenticate,
  requirePermission("asset.submit"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const ownerId = req.user!.userId;
    const { commissionPct } = req.body as { commissionPct?: number };

    const existing = await db
      .select()
      .from(ownerAgreements)
      .where(eq(ownerAgreements.ownerId, ownerId))
      .orderBy(desc(ownerAgreements.createdAt))
      .limit(1);

    if (existing.length > 0 && !existing[0].signedAt) {
      throw new LegalStateError("You already have a pending agreement");
    }

    const [agreement] = await db
      .insert(ownerAgreements)
      .values({
        ownerId,
        commissionPct: commissionPct ?? 20,
        version: "1.0",
      })
      .returning();

    await recordAudit({
      req,
      action: "owner_agreement.create",
      entityType: "owner_agreement",
      entityId: agreement.id,
      after: agreement,
    });

    res.status(201).json(agreement);
  })
);

router.post(
  "/:id/sign",
  authenticate,
  requirePermission("asset.submit"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [agreement] = await db
      .select()
      .from(ownerAgreements)
      .where(eq(ownerAgreements.id, id))
      .limit(1);

    if (!agreement) throw new NotFoundError("Owner agreement");
    if (agreement.ownerId !== req.user!.userId) {
      throw new LegalStateError("Not your agreement");
    }
    if (agreement.signedAt) {
      throw new LegalStateError("Agreement already signed");
    }

    const ip = (req.headers["x-forwarded-for"] as string) ?? req.ip ?? null;
    const now = new Date();

    const [updated] = await db
      .update(ownerAgreements)
      .set({
        signedAt: now,
        signedIp: ip,
        guaranteeAccepted: true,
        effectiveFrom: now,
        effectiveUntil: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
      })
      .where(eq(ownerAgreements.id, id))
      .returning();

    await recordAudit({
      req,
      action: "owner_agreement.sign",
      entityType: "owner_agreement",
      entityId: id,
      after: updated,
    });

    res.json(updated);
  })
);

router.get(
  "/",
  authenticate,
  requirePermission("user.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select()
      .from(ownerAgreements)
      .orderBy(desc(ownerAgreements.createdAt))
      .limit(200);
    res.json(rows);
  })
);

export default router;
