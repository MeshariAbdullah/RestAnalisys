import { Router } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  assets,
  rentals,
  payments,
  payouts,
  disputes,
  inspections,
} from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/owner",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const ownerId = req.user!.userId;

    const assetsByStatus = await db
      .select({ status: assets.status, count: sql<number>`count(*)` })
      .from(assets)
      .where(eq(assets.ownerId, ownerId))
      .groupBy(assets.status);

    const totalAssets = assetsByStatus.reduce((sum, r) => sum + Number(r.count), 0);
    const listedAssets = Number(
      assetsByStatus.find((r) => r.status === "listed")?.count ?? 0
    );
    const rentedAssets = Number(
      assetsByStatus.find((r) => r.status === "rented_out")?.count ?? 0
    );

    const [earningsResult] = await db
      .select({
        totalGross: sql<string>`coalesce(sum(gross_halalas), 0)`,
        totalNet: sql<string>`coalesce(sum(net_halalas), 0)`,
        totalCommission: sql<string>`coalesce(sum(commission_halalas), 0)`,
      })
      .from(payouts)
      .where(eq(payouts.ownerId, ownerId));

    const [pendingPayouts] = await db
      .select({ count: sql<number>`count(*)` })
      .from(payouts)
      .where(and(eq(payouts.ownerId, ownerId), eq(payouts.status, "pending")));

    const rentalStats = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where status in ('active','out_for_delivery'))`,
        completed: sql<number>`count(*) filter (where status in ('closed','closed_with_penalty'))`,
      })
      .from(rentals)
      .where(eq(rentals.ownerId, ownerId));

    const recentRentals = await db
      .select({
        id: rentals.id,
        reference: rentals.reference,
        status: rentals.status,
        startDate: rentals.startDate,
        endDate: rentals.endDate,
        totalPayableHalalas: rentals.totalPayableHalalas,
        createdAt: rentals.createdAt,
      })
      .from(rentals)
      .where(eq(rentals.ownerId, ownerId))
      .orderBy(desc(rentals.createdAt))
      .limit(10);

    res.json({
      totalAssets,
      listedAssets,
      rentedAssets,
      assetsByStatus: assetsByStatus.map((r) => ({
        status: r.status,
        count: Number(r.count),
      })),
      earnings: {
        totalGrossHalalas: Number(earningsResult?.totalGross ?? 0),
        totalNetHalalas: Number(earningsResult?.totalNet ?? 0),
        totalCommissionHalalas: Number(earningsResult?.totalCommission ?? 0),
      },
      pendingPayouts: Number(pendingPayouts?.count ?? 0),
      rentals: {
        total: Number(rentalStats[0]?.total ?? 0),
        active: Number(rentalStats[0]?.active ?? 0),
        completed: Number(rentalStats[0]?.completed ?? 0),
      },
      recentRentals,
    });
  })
);

router.get(
  "/renter",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const renterId = req.user!.userId;

    const rentalStats = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where status in ('active','out_for_delivery'))`,
        completed: sql<number>`count(*) filter (where status in ('closed','closed_with_penalty'))`,
        pending: sql<number>`count(*) filter (where status in ('pending_risk_review','pending_legal_signing','pending_payment'))`,
      })
      .from(rentals)
      .where(eq(rentals.renterId, renterId));

    const [spending] = await db
      .select({
        totalSpent: sql<string>`coalesce(sum(amount_halalas), 0)`,
      })
      .from(payments)
      .where(and(eq(payments.userId, renterId), eq(payments.status, "captured")));

    const [openDisputes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(disputes)
      .where(
        and(
          eq(disputes.openedByUserId, renterId),
          inArray(disputes.status, ["open", "investigating", "awaiting_evidence"])
        )
      );

    const activeRentals = await db
      .select({
        id: rentals.id,
        reference: rentals.reference,
        status: rentals.status,
        assetId: rentals.assetId,
        startDate: rentals.startDate,
        endDate: rentals.endDate,
        totalPayableHalalas: rentals.totalPayableHalalas,
      })
      .from(rentals)
      .where(
        and(
          eq(rentals.renterId, renterId),
          inArray(rentals.status, [
            "pending_risk_review",
            "pending_legal_signing",
            "pending_payment",
            "confirmed",
            "out_for_delivery",
            "active",
            "return_in_transit",
            "under_inspection",
          ])
        )
      )
      .orderBy(desc(rentals.createdAt))
      .limit(10);

    res.json({
      rentals: {
        total: Number(rentalStats[0]?.total ?? 0),
        active: Number(rentalStats[0]?.active ?? 0),
        completed: Number(rentalStats[0]?.completed ?? 0),
        pending: Number(rentalStats[0]?.pending ?? 0),
      },
      totalSpentHalalas: Number(spending?.totalSpent ?? 0),
      openDisputes: Number(openDisputes?.count ?? 0),
      activeRentals,
    });
  })
);

router.get(
  "/inspector",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const inspectorId = req.user!.userId;

    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        thisMonth: sql<number>`count(*) filter (where created_at >= date_trunc('month', now()))`,
        intakeCount: sql<number>`count(*) filter (where type = 'intake')`,
        returnCount: sql<number>`count(*) filter (where type = 'return')`,
      })
      .from(inspections)
      .where(eq(inspections.inspectorId, inspectorId));

    const pendingQueue = await db
      .select({ count: sql<number>`count(*)` })
      .from(assets)
      .where(inArray(assets.status, ["in_inspection", "returned_under_inspection"]));

    const recentInspections = await db
      .select({
        id: inspections.id,
        assetId: inspections.assetId,
        type: inspections.type,
        conditionGrade: inspections.conditionGrade,
        conditionScore: inspections.conditionScore,
        authenticityVerified: inspections.authenticityVerified,
        createdAt: inspections.createdAt,
      })
      .from(inspections)
      .where(eq(inspections.inspectorId, inspectorId))
      .orderBy(desc(inspections.createdAt))
      .limit(10);

    res.json({
      totalInspections: Number(stats?.total ?? 0),
      thisMonth: Number(stats?.thisMonth ?? 0),
      intakeCount: Number(stats?.intakeCount ?? 0),
      returnCount: Number(stats?.returnCount ?? 0),
      pendingQueue: Number(pendingQueue[0]?.count ?? 0),
      recentInspections,
    });
  })
);

export default router;
