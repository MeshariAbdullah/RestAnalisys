/**
 * Owner agreement routes — consignment contract lifecycle between the owner
 * and the platform.
 *
 * Business rules:
 *  - An owner can only have one active agreement at a time.
 *  - Creating an agreement sets effectiveFrom = now, effectiveUntil = 1 year.
 *  - Owners see their own agreements; admins/super_admins see any.
 */

import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { ownerAgreements, users } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, ForbiddenError, ConflictError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

// ── Owner: list my agreements ──────────────────────────────────────────────
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

// ── Owner: create a new agreement ──────────────────────────────────────────
router.post(
  "/",
  authenticate,
  requirePermission("asset.submit"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const ownerId = req.user!.userId;
    const { guaranteeAccepted } = req.body as { guaranteeAccepted?: boolean };

    if (!guaranteeAccepted) {
      res.status(400).json({ error: "guaranteeAccepted must be true" });
      return;
    }

    // Check for existing active agreement
    const [existing] = await db
      .select()
      .from(ownerAgreements)
      .where(eq(ownerAgreements.ownerId, ownerId))
      .orderBy(desc(ownerAgreements.createdAt))
      .limit(1);

    if (existing && existing.effectiveUntil && existing.effectiveUntil > new Date()) {
      throw new ConflictError("An active agreement already exists");
    }

    const now = new Date();
    const oneYearFromNow = new Date(now);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const [agreement] = await db
      .insert(ownerAgreements)
      .values({
        ownerId,
        guaranteeAccepted: true,
        signedAt: now,
        signedIp:
          (req.headers["x-forwarded-for"] as string) ?? req.ip ?? null,
        effectiveFrom: now,
        effectiveUntil: oneYearFromNow,
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

// ── Get a specific agreement ───────────────────────────────────────────────
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

    // Owners can only see their own; admins/super_admins can see any
    const role = req.user!.role;
    if (
      role !== "admin" &&
      role !== "super_admin" &&
      agreement.ownerId !== req.user!.userId
    ) {
      throw new ForbiddenError();
    }

    res.json(agreement);
  })
);

// ── Admin: list all agreements ─────────────────────────────────────────────
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
      .orderBy(desc(ownerAgreements.createdAt));
    res.json(rows);
  })
);

export default router;
