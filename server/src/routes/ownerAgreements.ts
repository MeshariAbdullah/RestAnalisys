/**
 * Owner agreement routes — consignment contracts between owners and platform.
 *
 * Before an owner can submit assets, they must sign the platform agreement
 * which defines the commission rate, guarantee terms, and obligations.
 */

import { Router } from "express";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { ownerAgreements, users } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, LegalStateError, ForbiddenError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

// ── Owner: view my current agreement ──────────────────────────────────
router.get(
  "/mine",
  authenticate,
  requirePermission("asset.submit"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const [agreement] = await db
      .select()
      .from(ownerAgreements)
      .where(
        and(
          eq(ownerAgreements.ownerId, req.user!.userId),
          sql`(effective_until is null or effective_until > now())`
        )
      )
      .orderBy(desc(ownerAgreements.createdAt))
      .limit(1);
    res.json(agreement ?? null);
  })
);

// ── Owner: sign the platform agreement ────────────────────────────────
router.post(
  "/sign",
  authenticate,
  requirePermission("asset.submit"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const ownerId = req.user!.userId;
    const { acceptGuarantee } = req.body as { acceptGuarantee: boolean };

    if (!acceptGuarantee) {
      throw new LegalStateError("You must accept the platform guarantee terms to proceed");
    }

    // Check if already has an active agreement
    const [existing] = await db
      .select()
      .from(ownerAgreements)
      .where(
        and(
          eq(ownerAgreements.ownerId, ownerId),
          sql`(effective_until is null or effective_until > now())`,
          sql`signed_at is not null`
        )
      )
      .limit(1);

    if (existing) {
      throw new LegalStateError("You already have an active agreement");
    }

    const [agreement] = await db
      .insert(ownerAgreements)
      .values({
        ownerId,
        version: "1.0",
        commissionPct: 20,
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

// ── Admin: view all owner agreements ──────────────────────────────────
router.get(
  "/",
  authenticate,
  requirePermission("user.read"),
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
      })
      .from(ownerAgreements)
      .leftJoin(users, eq(ownerAgreements.ownerId, users.id))
      .orderBy(desc(ownerAgreements.createdAt))
      .limit(200);
    res.json(rows);
  })
);

// ── Admin: update commission rate for an owner ────────────────────────
router.post(
  "/:id/commission",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const { commissionPct } = req.body as { commissionPct: number };

    if (commissionPct < 0 || commissionPct > 50) {
      throw new LegalStateError("Commission must be between 0% and 50%");
    }

    const [agreement] = await db
      .select()
      .from(ownerAgreements)
      .where(eq(ownerAgreements.id, id))
      .limit(1);
    if (!agreement) throw new NotFoundError("Owner agreement");

    const [updated] = await db
      .update(ownerAgreements)
      .set({ commissionPct })
      .where(eq(ownerAgreements.id, id))
      .returning();

    await recordAudit({
      req,
      action: "owner_agreement.update_commission",
      entityType: "owner_agreement",
      entityId: id,
      before: { commissionPct: agreement.commissionPct },
      after: { commissionPct },
    });

    res.json(updated);
  })
);

// ── Admin: terminate an owner agreement ───────────────────────────────
router.post(
  "/:id/terminate",
  authenticate,
  requirePermission("user.block"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [agreement] = await db
      .select()
      .from(ownerAgreements)
      .where(eq(ownerAgreements.id, id))
      .limit(1);
    if (!agreement) throw new NotFoundError("Owner agreement");

    const [updated] = await db
      .update(ownerAgreements)
      .set({ effectiveUntil: new Date() })
      .where(eq(ownerAgreements.id, id))
      .returning();

    await recordAudit({
      req,
      action: "owner_agreement.terminate",
      entityType: "owner_agreement",
      entityId: id,
      after: updated,
    });

    res.json(updated);
  })
);

export default router;
