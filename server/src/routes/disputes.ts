/**
 * Dispute routes — opening, assignment, and resolution.
 */

import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { disputes, rentals, payments, payouts, assets, ownerAgreements } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { DisputeOpenSchema, DisputeResolveSchema } from "../utils/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, ForbiddenError, LegalStateError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";
import { computeOwnerPayout } from "../utils/money.js";
import { notify } from "../services/notificationService.js";

const router = Router();

router.post(
  "/",
  authenticate,
  requirePermission("dispute.open"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = DisputeOpenSchema.parse(req.body);
    const [rental] = await db
      .select()
      .from(rentals)
      .where(eq(rentals.id, input.rentalId))
      .limit(1);
    if (!rental) throw new NotFoundError("Rental");

    const actorId = req.user!.userId;
    const actorIsParty =
      rental.renterId === actorId ||
      rental.ownerId === actorId ||
      ["admin", "operations", "super_admin"].includes(req.user!.role);
    if (!actorIsParty) throw new ForbiddenError();

    const [dispute] = await db
      .insert(disputes)
      .values({
        rentalId: rental.id,
        openedByUserId: actorId,
        category: input.category,
        severity: "medium",
        summary: input.summary,
        evidenceJson: input.evidence as unknown as object,
      })
      .returning();

    await db
      .update(rentals)
      .set({ status: "in_dispute", updatedAt: new Date() })
      .where(eq(rentals.id, rental.id));

    await recordAudit({
      req,
      action: "dispute.open",
      entityType: "dispute",
      entityId: dispute.id,
      after: dispute,
    });

    // Notify the other party about the dispute
    const otherPartyId = actorId === rental.renterId ? rental.ownerId : rental.renterId;
    await notify({
      userId: otherPartyId,
      type: "dispute_opened",
      title: "A dispute has been opened",
      body: `A ${input.category} dispute has been filed for rental ${rental.reference}.`,
      linkUrl: "/my-rentals",
      referenceType: "dispute",
      referenceId: dispute.id,
    });

    res.status(201).json(dispute);
  })
);

router.get(
  "/",
  authenticate,
  requirePermission("dispute.assign"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select()
      .from(disputes)
      .orderBy(desc(disputes.openedAt))
      .limit(200);
    res.json(rows);
  })
);

router.post(
  "/:id/assign",
  authenticate,
  requirePermission("dispute.assign"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const { assigneeUserId } = req.body as { assigneeUserId: number };
    const [updated] = await db
      .update(disputes)
      .set({
        assignedToUserId: assigneeUserId,
        status: "investigating",
        updatedAt: new Date(),
      })
      .where(eq(disputes.id, id))
      .returning();
    if (!updated) throw new NotFoundError("Dispute");
    await recordAudit({
      req,
      action: "dispute.assign",
      entityType: "dispute",
      entityId: id,
      after: updated,
    });
    res.json(updated);
  })
);

router.post(
  "/resolve",
  authenticate,
  requirePermission("dispute.resolve"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = DisputeResolveSchema.parse(req.body);
    const [dispute] = await db
      .select()
      .from(disputes)
      .where(eq(disputes.id, input.disputeId))
      .limit(1);
    if (!dispute) throw new NotFoundError("Dispute");
    if (["resolved_for_renter", "resolved_for_platform", "resolved_for_owner", "closed"].includes(dispute.status)) {
      throw new LegalStateError("Dispute already resolved");
    }

    const [updated] = await db
      .update(disputes)
      .set({
        status: input.resolution,
        resolutionNotes: input.notes,
        resolutionAmountHalalas: input.resolutionAmountHalalas,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(disputes.id, input.disputeId))
      .returning();

    const [rental] = await db
      .select()
      .from(rentals)
      .where(eq(rentals.id, dispute.rentalId))
      .limit(1);

    // Escalate to enforcement if legally flagged
    if (input.resolution === "escalated_to_legal") {
      await db
        .update(rentals)
        .set({ status: "enforcement", updatedAt: new Date() })
        .where(eq(rentals.id, dispute.rentalId));
    }

    // Auto-payout: when resolved for owner or platform, trigger owner payout
    if (
      rental &&
      (input.resolution === "resolved_for_owner" || input.resolution === "resolved_for_platform")
    ) {
      // Check if payout already exists for this rental
      const existingPayouts = await db
        .select()
        .from(payouts)
        .where(eq(payouts.rentalId, rental.id))
        .limit(1);

      if (existingPayouts.length === 0) {
        // Look up owner commission rate (default 20%)
        const [agreement] = await db
          .select()
          .from(ownerAgreements)
          .where(eq(ownerAgreements.ownerId, rental.ownerId))
          .limit(1);
        const commissionPct = agreement?.commissionPct ?? 20;

        const payout = computeOwnerPayout({
          rentalSubtotalHalalas: rental.rentalSubtotalHalalas,
          commissionPct,
        });

        await db.insert(payouts).values({
          ownerId: rental.ownerId,
          rentalId: rental.id,
          grossHalalas: payout.grossHalalas,
          commissionHalalas: payout.commissionHalalas,
          netHalalas: payout.netHalalas,
          status: "pending",
        });

        await recordAudit({
          req,
          action: "payout.auto_created",
          entityType: "payout",
          entityId: rental.id,
          after: { ownerId: rental.ownerId, ...payout, trigger: "dispute_resolution" },
        });
      }

      // Restore the rental to a closed state if it was in dispute
      if (rental.status === "in_dispute") {
        await db
          .update(rentals)
          .set({
            status: input.resolution === "resolved_for_owner" ? "closed" : "closed_with_penalty",
            closedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(rentals.id, rental.id));

        // Re-list the asset
        await db
          .update(assets)
          .set({ status: "listed", updatedAt: new Date() })
          .where(eq(assets.id, rental.assetId));
      }
    }

    // Resolved for renter: issue refund if amount specified
    if (input.resolution === "resolved_for_renter" && input.resolutionAmountHalalas && rental) {
      await db.insert(payments).values({
        rentalId: rental.id,
        userId: rental.renterId,
        type: "refund",
        status: "pending",
        amountHalalas: input.resolutionAmountHalalas,
      });

      // Restore rental from in_dispute
      if (rental.status === "in_dispute") {
        await db
          .update(rentals)
          .set({ status: "closed", closedAt: new Date(), updatedAt: new Date() })
          .where(eq(rentals.id, rental.id));

        await db
          .update(assets)
          .set({ status: "listed", updatedAt: new Date() })
          .where(eq(assets.id, rental.assetId));
      }
    }

    await recordAudit({
      req,
      action: "dispute.resolve",
      entityType: "dispute",
      entityId: input.disputeId,
      after: updated,
    });

    res.json(updated);
  })
);

export default router;
