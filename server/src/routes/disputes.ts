/**
 * Dispute routes — opening, assignment, and resolution.
 */

import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { disputes, rentals } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { DisputeOpenSchema, DisputeResolveSchema } from "../utils/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, ForbiddenError, LegalStateError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";
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

    const otherParty =
      rental.renterId === actorId ? rental.ownerId : rental.renterId;
    await notify({
      userId: otherParty,
      type: "dispute_opened",
      title: "Dispute Opened",
      body: `A ${input.category} dispute has been opened for rental ${rental.reference}.`,
      relatedEntityType: "dispute",
      relatedEntityId: dispute.id,
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

    // Escalate to enforcement if legally flagged
    if (input.resolution === "escalated_to_legal") {
      await db
        .update(rentals)
        .set({ status: "enforcement", updatedAt: new Date() })
        .where(eq(rentals.id, dispute.rentalId));
    }

    await recordAudit({
      req,
      action: "dispute.resolve",
      entityType: "dispute",
      entityId: input.disputeId,
      after: updated,
    });

    const [rental] = await db
      .select()
      .from(rentals)
      .where(eq(rentals.id, dispute.rentalId))
      .limit(1);
    if (rental) {
      await notify({
        userId: dispute.openedByUserId,
        type: "dispute_resolved",
        title: "Dispute Resolved",
        body: `Your dispute for rental ${rental.reference} has been resolved: ${input.resolution.replace(/_/g, " ")}.`,
        relatedEntityType: "dispute",
        relatedEntityId: dispute.id,
      });
    }

    res.json(updated);
  })
);

export default router;
