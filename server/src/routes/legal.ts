/**
 * Legal routes — signing commitments, Sanad lifecycle, enforcement handoff.
 *
 * The contract is between the PLATFORM and the RENTER. Signing requires Nafath
 * verification. On successful signing we issue the Sanad via Nafith.
 */

import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  legalCommitments,
  rentals,
  sanadRecords,
  users,
  assets,
} from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission, requireNafath } from "../middleware/rbac.js";
import { LegalSignSchema, SanadExecuteSchema } from "../utils/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  NotFoundError,
  LegalStateError,
  ForbiddenError,
} from "../utils/errors.js";
import { requestNafathSignature } from "../services/nafathService.js";
import { issueSanad, signSanad, dischargeSanad, executeSanad } from "../services/nafithService.js";
import { recordAudit } from "../services/auditService.js";
import { notifyUser } from "../services/notificationService.js";

const router = Router();

// ── Renter: view full commitment (for review before signing) ───────────────
router.get(
  "/commitment/:id",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [commitment] = await db
      .select()
      .from(legalCommitments)
      .where(eq(legalCommitments.id, id))
      .limit(1);
    if (!commitment) throw new NotFoundError("Legal commitment");
    if (
      commitment.renterId !== req.user!.userId &&
      req.user!.role !== "admin" &&
      req.user!.role !== "super_admin"
    ) {
      throw new ForbiddenError();
    }

    const [rental] = await db
      .select()
      .from(rentals)
      .where(eq(rentals.id, commitment.rentalId))
      .limit(1);
    const [asset] = rental
      ? await db.select().from(assets).where(eq(assets.id, rental.assetId)).limit(1)
      : [null];

    res.json({ commitment, rental, asset });
  })
);

// ── Renter: sign the commitment (triggers Nafath signature + Sanad issuance)─
router.post(
  "/sign",
  authenticate,
  requirePermission("legal.sign"),
  requireNafath,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { legalCommitmentId } = LegalSignSchema.parse(req.body);
    const userId = req.user!.userId;

    const [commitment] = await db
      .select()
      .from(legalCommitments)
      .where(eq(legalCommitments.id, legalCommitmentId))
      .limit(1);
    if (!commitment) throw new NotFoundError("Legal commitment");
    if (commitment.renterId !== userId) throw new ForbiddenError();
    if (commitment.status !== "pending_signature") {
      throw new LegalStateError(`Already in status ${commitment.status}`);
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    // 1) Nafath e-signature (placeholder)
    const sig = await requestNafathSignature({
      nationalId: user!.nationalId ?? "UNKNOWN",
      documentHash: commitment.contractTextHash ?? "",
      documentTitle: `MLR Legal Commitment #${commitment.id}`,
    });
    if (sig.status !== "signed") {
      throw new LegalStateError(`Signature rejected (${sig.status})`);
    }

    // 2) Mark the commitment signed
    const [signed] = await db
      .update(legalCommitments)
      .set({
        status: "signed",
        signedAt: new Date(),
        signedIp: (req.headers["x-forwarded-for"] as string) ?? req.ip,
        signedUserAgent: req.headers["user-agent"] ?? null,
        nafathSignTransactionId: sig.transactionId,
        updatedAt: new Date(),
      })
      .where(eq(legalCommitments.id, legalCommitmentId))
      .returning();

    // 3) Issue the Sanad through Nafith
    const [rental] = await db
      .select()
      .from(rentals)
      .where(eq(rentals.id, commitment.rentalId))
      .limit(1);
    const maturityDate = rental!.endDate;
    const nafith = await issueSanad({
      creditorNationalId: process.env.PLATFORM_COMMERCIAL_ID ?? "7000000000",
      debtorNationalId: user!.nationalId ?? "0000000000",
      principalHalalas: commitment.commitmentHalalas,
      maturityDate,
      reference: rental!.reference,
      description: `Legal commitment for rental ${rental!.reference}`,
    });

    if (nafith.status === "rejected") {
      throw new Error("Nafith rejected the Sanad issuance request");
    }

    const [sanad] = await db
      .insert(sanadRecords)
      .values({
        rentalId: rental!.id,
        legalCommitmentId: commitment.id,
        renterId: userId,
        status: nafith.status,
        nafithReference: nafith.nafithReference,
        nafithRequestId: nafith.requestId,
        issuedAt: nafith.issuedAt ? new Date(nafith.issuedAt) : null,
        maturityDate,
        principalHalalas: commitment.commitmentHalalas,
        dueHalalas: commitment.commitmentHalalas,
      })
      .returning();

    // 4) Advance the rental to pending_payment
    await db
      .update(rentals)
      .set({ status: "pending_payment", updatedAt: new Date() })
      .where(eq(rentals.id, rental!.id));

    await recordAudit({
      req,
      action: "legal.sign",
      entityType: "legal_commitment",
      entityId: commitment.id,
      after: { signed, sanad },
    });

    res.json({ commitment: signed, sanad });
  })
);

// ── Admin: list commitments needing enforcement ────────────────────────────
router.get(
  "/pending-enforcement",
  authenticate,
  requirePermission("legal.enforce"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select()
      .from(sanadRecords)
      .where(eq(sanadRecords.status, "active"))
      .limit(200);
    res.json(rows);
  })
);

// ── Admin: discharge a Sanad (happy-path closure) ──────────────────────────
router.post(
  "/sanad/:id/discharge",
  authenticate,
  requirePermission("legal.enforce"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [sanad] = await db
      .select()
      .from(sanadRecords)
      .where(eq(sanadRecords.id, id))
      .limit(1);
    if (!sanad) throw new NotFoundError("Sanad");
    if (!sanad.nafithReference)
      throw new LegalStateError("Sanad has no Nafith reference");

    const result = await dischargeSanad(sanad.nafithReference);
    const [updated] = await db
      .update(sanadRecords)
      .set({
        status: "discharged",
        updatedAt: new Date(),
        rawResponseJson: result as unknown as object,
      })
      .where(eq(sanadRecords.id, id))
      .returning();

    await recordAudit({
      req,
      action: "legal.sanad_discharge",
      entityType: "sanad_record",
      entityId: id,
      after: updated,
    });

    res.json(updated);
  })
);

// ── Admin: execute a Sanad (send to Najiz) ─────────────────────────────────
router.post(
  "/sanad/execute",
  authenticate,
  requirePermission("legal.enforce"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { sanadId, reason, attachments } = SanadExecuteSchema.parse(req.body);

    const [sanad] = await db
      .select()
      .from(sanadRecords)
      .where(eq(sanadRecords.id, sanadId))
      .limit(1);
    if (!sanad) throw new NotFoundError("Sanad");
    if (!sanad.nafithReference)
      throw new LegalStateError("Sanad has no Nafith reference");

    const result = await executeSanad({
      nafithReference: sanad.nafithReference,
      reason,
      attachments,
    });

    const [updated] = await db
      .update(sanadRecords)
      .set({
        status: "under_execution",
        executionRequestedAt: new Date(),
        executionCaseNumber: result.executionCaseNumber,
        rawResponseJson: result as unknown as object,
        updatedAt: new Date(),
      })
      .where(eq(sanadRecords.id, sanadId))
      .returning();

    // Mark the rental as under enforcement if not already
    await db
      .update(rentals)
      .set({ status: "enforcement", updatedAt: new Date() })
      .where(eq(rentals.id, sanad.rentalId));

    await recordAudit({
      req,
      action: "legal.sanad_execute",
      entityType: "sanad_record",
      entityId: sanadId,
      after: { updated, reason },
    });

    await notifyUser(
      sanad.renterId,
      "sanad.execution",
      "Sanad under execution",
      `Your promissory note has been submitted for legal execution via Najiz. Case: ${result.executionCaseNumber ?? "pending"}.`,
      { entityType: "sanad_record", entityId: sanadId }
    );

    res.json(updated);
  })
);

// ── Admin: list sanads by status ────────────────────────────────────────────
router.get(
  "/sanads",
  authenticate,
  requirePermission("legal.read.any"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select()
      .from(sanadRecords)
      .limit(500);
    res.json(rows);
  })
);

export default router;
