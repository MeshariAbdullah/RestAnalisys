import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { ownerAgreements, users } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission, requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, ForbiddenError, ConflictError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";
import { z } from "zod";

const router = Router();

const CreateAgreementSchema = z.object({
  commissionPct: z.number().min(0).max(100).default(20),
  guaranteeAccepted: z.boolean(),
});

const SignAgreementSchema = z.object({
  agreementId: z.number().int().positive(),
  acceptTerms: z.literal(true),
});

router.get(
  "/mine",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    if (req.user!.role !== "owner") throw new ForbiddenError();
    const rows = await db
      .select()
      .from(ownerAgreements)
      .where(eq(ownerAgreements.ownerId, req.user!.userId))
      .orderBy(desc(ownerAgreements.createdAt));
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
    if (!agreement) throw new NotFoundError("Owner Agreement");

    const canReadAny = ["admin", "super_admin"].includes(req.user!.role);
    if (!canReadAny && agreement.ownerId !== req.user!.userId) {
      throw new ForbiddenError();
    }

    res.json(agreement);
  })
);

router.post(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    if (req.user!.role !== "owner") throw new ForbiddenError();
    const input = CreateAgreementSchema.parse(req.body);

    const existing = await db
      .select()
      .from(ownerAgreements)
      .where(eq(ownerAgreements.ownerId, req.user!.userId))
      .limit(1);

    const hasActive = existing.some(
      (a) => a.signedAt && (!a.effectiveUntil || new Date(a.effectiveUntil) > new Date())
    );
    if (hasActive) {
      throw new ConflictError("An active agreement already exists");
    }

    const [agreement] = await db
      .insert(ownerAgreements)
      .values({
        ownerId: req.user!.userId,
        commissionPct: input.commissionPct,
        guaranteeAccepted: input.guaranteeAccepted,
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
  "/sign",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    if (req.user!.role !== "owner") throw new ForbiddenError();
    const { agreementId } = SignAgreementSchema.parse(req.body);

    const [agreement] = await db
      .select()
      .from(ownerAgreements)
      .where(eq(ownerAgreements.id, agreementId))
      .limit(1);
    if (!agreement) throw new NotFoundError("Owner Agreement");
    if (agreement.ownerId !== req.user!.userId) throw new ForbiddenError();
    if (agreement.signedAt) throw new ConflictError("Agreement already signed");

    const [updated] = await db
      .update(ownerAgreements)
      .set({
        signedAt: new Date(),
        signedIp: req.ip ?? null,
        effectiveFrom: new Date(),
      })
      .where(eq(ownerAgreements.id, agreementId))
      .returning();

    await recordAudit({
      req,
      action: "owner_agreement.sign",
      entityType: "owner_agreement",
      entityId: agreementId,
      after: updated,
    });

    res.json(updated);
  })
);

router.get(
  "/",
  authenticate,
  requireRole("admin", "super_admin"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        agreement: ownerAgreements,
        ownerName: users.fullName,
        ownerEmail: users.email,
      })
      .from(ownerAgreements)
      .leftJoin(users, eq(ownerAgreements.ownerId, users.id))
      .orderBy(desc(ownerAgreements.createdAt))
      .limit(200);
    res.json(rows);
  })
);

export default router;
