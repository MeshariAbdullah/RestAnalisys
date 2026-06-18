/**
 * Operations routes — shipments, inventory lookups, alerts.
 */

import { Router } from "express";
import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  shipments,
  assets,
  rentals,
  operationalAlerts,
  inventoryMovements,
} from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import {
  ShipmentScheduleSchema,
  ShipmentUpdateSchema,
} from "../utils/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, LegalStateError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";
import { validateAddress } from "../services/splService.js";
import { sendRentalNotification } from "../services/notificationService.js";
import { users } from "../db/schema.js";

const router = Router();

// ── Ops dashboard summary ──────────────────────────────────────────────────
router.get(
  "/summary",
  authenticate,
  requirePermission("operations.read"),
  asyncHandler(async (_req, res) => {
    const [activeRentals] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rentals)
      .where(inArray(rentals.status, ["active", "out_for_delivery", "return_in_transit"]));
    const [lateRentals] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rentals)
      .where(
        and(
          eq(rentals.status, "active"),
          lte(rentals.endDate, new Date().toISOString().slice(0, 10))
        )
      );
    const [openAlerts] = await db
      .select({ count: sql<number>`count(*)` })
      .from(operationalAlerts)
      .where(eq(operationalAlerts.status, "open"));

    const inventoryCounts = await db
      .select({ status: assets.status, count: sql<number>`count(*)` })
      .from(assets)
      .groupBy(assets.status);

    res.json({
      activeRentals: Number(activeRentals?.count ?? 0),
      lateRentals: Number(lateRentals?.count ?? 0),
      openAlerts: Number(openAlerts?.count ?? 0),
      inventoryCounts: inventoryCounts.map((r) => ({
        status: r.status,
        count: Number(r.count),
      })),
    });
  })
);

// ── Shipments list ─────────────────────────────────────────────────────────
router.get(
  "/shipments",
  authenticate,
  requirePermission("operations.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select()
      .from(shipments)
      .orderBy(desc(shipments.createdAt))
      .limit(200);
    res.json(rows);
  })
);

// ── Schedule a shipment ────────────────────────────────────────────────────
router.post(
  "/shipments",
  authenticate,
  requirePermission("operations.update"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = ShipmentScheduleSchema.parse(req.body);
    const [shipment] = await db
      .insert(shipments)
      .values({
        assetId: input.assetId,
        rentalId: input.rentalId,
        direction: input.direction,
        status: "scheduled",
        courier: input.courier,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        fromAddressJson: (input.fromAddress as object) ?? null,
        toAddressJson: (input.toAddress as object) ?? null,
      })
      .returning();
    await recordAudit({
      req,
      action: "ops.shipment_scheduled",
      entityType: "shipment",
      entityId: shipment.id,
      after: shipment,
    });
    res.status(201).json(shipment);
  })
);

router.patch(
  "/shipments/:id",
  authenticate,
  requirePermission("operations.update"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const input = ShipmentUpdateSchema.parse(req.body);
    const [updated] = await db
      .update(shipments)
      .set({
        status: input.status,
        trackingNumber: input.trackingNumber,
        pickedUpAt: input.status === "picked_up" ? new Date() : undefined,
        deliveredAt: input.status === "delivered" ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, id))
      .returning();
    if (!updated) throw new NotFoundError("Shipment");
    await recordAudit({
      req,
      action: "ops.shipment_update",
      entityType: "shipment",
      entityId: id,
      after: updated,
    });
    res.json(updated);
  })
);

// ── Inventory status by asset ───────────────────────────────────────────────
router.get(
  "/inventory",
  authenticate,
  requirePermission("operations.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        id: assets.id,
        title: assets.title,
        brand: assets.brand,
        status: assets.status,
        warehouseLocationCode: assets.warehouseLocationCode,
        evaluatedValueHalalas: assets.evaluatedValueHalalas,
        updatedAt: assets.updatedAt,
      })
      .from(assets)
      .orderBy(desc(assets.updatedAt))
      .limit(500);
    res.json(rows);
  })
);

router.get(
  "/inventory/:assetId/movements",
  authenticate,
  requirePermission("operations.read"),
  asyncHandler(async (req, res) => {
    const assetId = Number(req.params.assetId);
    const rows = await db
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.assetId, assetId))
      .orderBy(desc(inventoryMovements.createdAt));
    res.json(rows);
  })
);

// ── Alerts feed ─────────────────────────────────────────────────────────────
router.get(
  "/alerts",
  authenticate,
  requirePermission("operations.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select()
      .from(operationalAlerts)
      .orderBy(desc(operationalAlerts.createdAt))
      .limit(200);
    res.json(rows);
  })
);

router.post(
  "/alerts/:id/resolve",
  authenticate,
  requirePermission("operations.update"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [updated] = await db
      .update(operationalAlerts)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(eq(operationalAlerts.id, id))
      .returning();
    if (!updated) throw new NotFoundError("Alert");
    await recordAudit({
      req,
      action: "ops.alert_resolve",
      entityType: "operational_alert",
      entityId: id,
      after: updated,
    });
    res.json(updated);
  })
);

// ── Overdue rental detection & alerting ────────────────────────────────────
router.post(
  "/detect-overdue",
  authenticate,
  requirePermission("operations.update"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const today = new Date().toISOString().slice(0, 10);

    const overdueRentals = await db
      .select({
        id: rentals.id,
        reference: rentals.reference,
        renterId: rentals.renterId,
        endDate: rentals.endDate,
        status: rentals.status,
        assetId: rentals.assetId,
      })
      .from(rentals)
      .where(
        and(
          eq(rentals.status, "active"),
          lte(rentals.endDate, today)
        )
      );

    const alertsCreated: number[] = [];

    for (const rental of overdueRentals) {
      const existingAlert = await db
        .select({ id: operationalAlerts.id })
        .from(operationalAlerts)
        .where(
          and(
            eq(operationalAlerts.type, "late_return"),
            eq(operationalAlerts.subjectType, "rental"),
            eq(operationalAlerts.subjectId, rental.id),
            eq(operationalAlerts.status, "open")
          )
        )
        .limit(1);

      if (existingAlert.length === 0) {
        const daysOverdue = Math.floor(
          (Date.now() - new Date(rental.endDate + "T00:00:00Z").getTime()) /
            (1000 * 60 * 60 * 24)
        );
        const severity = daysOverdue >= 7 ? "critical" : daysOverdue >= 3 ? "high" : "medium";

        const [alert] = await db.insert(operationalAlerts).values({
          type: "late_return",
          severity,
          subjectType: "rental",
          subjectId: rental.id,
          message: `Rental ${rental.reference} is ${daysOverdue} day(s) overdue. End date was ${rental.endDate}.`,
          payloadJson: { rentalId: rental.id, daysOverdue, endDate: rental.endDate },
        }).returning();

        alertsCreated.push(alert.id);

        const [renter] = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, rental.renterId))
          .limit(1);

        if (renter) {
          await sendRentalNotification(
            "rental.overdue",
            rental.renterId,
            renter.email,
            { rentalReference: rental.reference, endDate: rental.endDate }
          );
        }
      }
    }

    await recordAudit({
      req,
      action: "ops.detect_overdue",
      entityType: "system",
      after: { overdueCount: overdueRentals.length, alertsCreated: alertsCreated.length },
    });

    res.json({
      overdueRentals: overdueRentals.length,
      newAlerts: alertsCreated.length,
      alertIds: alertsCreated,
    });
  })
);

// ── Address validation (SPL integration) ──────────────────────────────────
router.post(
  "/validate-address",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const result = await validateAddress(req.body);
    res.json(result);
  })
);

export default router;
