import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { ownerAgreements, users } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, LegalStateError, ForbiddenError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";
import { OwnerAgreementCreateSchema, OwnerAgreementSignSchema } from "../utils/schemas.js";
import { PaginationSchema, paginate, paginatedResponse } from "../utils/pagination.js";

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
  asyncHandler(async (req: AuthedRequest, res) => {
    const { page, limit } = PaginationSchema.parse(req.query);
    const p = paginate({ page, limit });

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ownerAgreements);
    const total = Number(countResult?.count ?? 0);

    const rows = await db
      .select()
      .from(ownerAgreements)
      .orderBy(desc(ownerAgreements.createdAt))
      .limit(p.limit)
      .offset(p.offset);

    res.json(paginatedResponse(rows, total, { page, limit }));
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
    if (!agreement) throw new NotFoundError("Owner agreement");

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
  requirePermission("asset.submit"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = OwnerAgreementCreateSchema.parse(req.body);
    const ownerId = req.user!.userId;

    const existing = await db
      .select()
      .from(ownerAgreements)
      .where(
        and(
          eq(ownerAgreements.ownerId, ownerId),
          sql`effective_until IS NULL OR effective_until > now()`
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new LegalStateError("An active agreement already exists. It must expire before creating a new one.");
    }

    const [agreement] = await db
      .insert(ownerAgreements)
      .values({
        ownerId,
        version: input.version ?? "1.0",
        commissionPct: input.commissionPct ?? 20,
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
  "/:id/sign",
  authenticate,
  requirePermission("asset.submit"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const input = OwnerAgreementSignSchema.parse(req.body);

    const [agreement] = await db
      .select()
      .from(ownerAgreements)
      .where(eq(ownerAgreements.id, id))
      .limit(1);
    if (!agreement) throw new NotFoundError("Owner agreement");
    if (agreement.ownerId !== req.user!.userId) throw new ForbiddenError();
    if (agreement.signedAt) throw new LegalStateError("Agreement already signed");

    if (!input.acceptTerms) {
      throw new LegalStateError("Must accept terms to sign");
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
        effectiveUntil: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      })
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
