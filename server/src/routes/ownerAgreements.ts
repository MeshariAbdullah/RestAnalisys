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

router.get(
  "/",
  authenticate,
  requirePermission("legal.read.any"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select()
      .from(ownerAgreements)
      .orderBy(desc(ownerAgreements.createdAt))
      .limit(200);
    res.json(rows);
  })
);

router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [agreement] = await db
      .select()
      .from(ownerAgreements)
      .where(eq(ownerAgreements.id, id))
      .limit(1);
    if (!agreement) throw new NotFoundError("OwnerAgreement");

    const canReadAny = ["admin", "super_admin"].includes(req.user!.role);
    if (!canReadAny && agreement.ownerId !== req.user!.userId) {
      throw new NotFoundError("OwnerAgreement");
    }
    res.json(agreement);
  })
);

router.post(
  "/",
  authenticate,
  requirePermission("asset.submit"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const ownerId = req.user!.userId;
    const { commissionPct, guaranteeAccepted } = req.body as {
      commissionPct?: number;
      guaranteeAccepted: boolean;
    };

    if (!guaranteeAccepted) {
      throw new LegalStateError("Owner must accept the platform guarantee terms");
    }

    const [agreement] = await db
      .insert(ownerAgreements)
      .values({
        ownerId,
        commissionPct: commissionPct ?? 20,
        guaranteeAccepted,
        effectiveFrom: new Date(),
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
    if (!agreement) throw new NotFoundError("OwnerAgreement");
    if (agreement.ownerId !== req.user!.userId) {
      throw new NotFoundError("OwnerAgreement");
    }
    if (agreement.signedAt) {
      throw new LegalStateError("Agreement already signed");
    }

    const ip =
      (req.headers["x-forwarded-for"] as string) ?? req.ip ?? "unknown";
    const [updated] = await db
      .update(ownerAgreements)
      .set({ signedAt: new Date(), signedIp: ip })
      .where(eq(ownerAgreements.id, id))
      .returning();

    await recordAudit({
      req,
      action: "owner_agreement.sign",
      entityType: "owner_agreement",
      entityId: id,
      before: agreement,
      after: updated,
    });

    res.json(updated);
  })
);

export default router;
