import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { ownerAgreements, users } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { OwnerAgreementSignSchema } from "../utils/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ConflictError, NotFoundError, ForbiddenError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

router.get(
  "/mine",
  authenticate,
  requirePermission("agreement.sign"),
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
  requirePermission("agreement.sign"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = OwnerAgreementSignSchema.parse(req.body);
    const ownerId = req.user!.userId;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, ownerId))
      .limit(1);
    if (!user) throw new NotFoundError("User");
    if (user.role !== "owner") throw new ForbiddenError("Only owners can sign agreements");

    const existing = await db
      .select()
      .from(ownerAgreements)
      .where(eq(ownerAgreements.ownerId, ownerId))
      .orderBy(desc(ownerAgreements.createdAt))
      .limit(1);

    if (existing.length > 0 && existing[0].signedAt && !existing[0].effectiveUntil) {
      throw new ConflictError("You already have an active agreement");
    }

    const [agreement] = await db
      .insert(ownerAgreements)
      .values({
        ownerId,
        version: input.version,
        commissionPct: input.commissionPct,
        guaranteeAccepted: true,
        signedAt: new Date(),
        signedIp: (req.headers["x-forwarded-for"] as string) ?? req.ip,
        effectiveFrom: new Date(),
      })
      .returning();

    await recordAudit({
      req,
      action: "agreement.sign",
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
  requirePermission("agreement.read"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const isAdmin = ["admin", "super_admin"].includes(req.user!.role);
    if (isAdmin) {
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
        })
        .from(ownerAgreements)
        .leftJoin(users, eq(ownerAgreements.ownerId, users.id))
        .orderBy(desc(ownerAgreements.createdAt))
        .limit(200);
      return res.json(rows);
    }
    const rows = await db
      .select()
      .from(ownerAgreements)
      .where(eq(ownerAgreements.ownerId, req.user!.userId))
      .orderBy(desc(ownerAgreements.createdAt));
    res.json(rows);
  })
);

export default router;
