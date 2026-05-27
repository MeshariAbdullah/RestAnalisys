import { Router } from "express";
import { sql, eq, and, gte, lte, count, sum, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { assets, rentals, payments, users, disputes, shipments } from "../db/schema.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/overview",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [totalAssets] = await db.select({ count: count() }).from(assets);
    const [totalRentals] = await db.select({ count: count() }).from(rentals);
    const [activeRentals] = await db
      .select({ count: count() })
      .from(rentals)
      .where(eq(rentals.status, "active"));
    const [openDisputes] = await db
      .select({ count: count() })
      .from(disputes)
      .where(eq(disputes.status, "open"));

    const [newUsersThisMonth] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo));
    const [newRentalsThisMonth] = await db
      .select({ count: count() })
      .from(rentals)
      .where(gte(rentals.createdAt, thirtyDaysAgo));

    const [revenueTotal] = await db
      .select({ total: sum(payments.amountHalalas) })
      .from(payments)
      .where(and(eq(payments.type, "platform_fee"), eq(payments.status, "captured")));

    const [revenueThisMonth] = await db
      .select({ total: sum(payments.amountHalalas) })
      .from(payments)
      .where(
        and(
          eq(payments.type, "platform_fee"),
          eq(payments.status, "captured"),
          gte(payments.capturedAt, thirtyDaysAgo)
        )
      );

    res.json({
      users: { total: totalUsers.count, newThisMonth: newUsersThisMonth.count },
      assets: { total: totalAssets.count },
      rentals: {
        total: totalRentals.count,
        active: activeRentals.count,
        newThisMonth: newRentalsThisMonth.count,
      },
      disputes: { open: openDisputes.count },
      revenue: {
        totalPlatformFeeHalalas: Number(revenueTotal.total ?? 0),
        thisMonthPlatformFeeHalalas: Number(revenueThisMonth.total ?? 0),
      },
    });
  })
);

router.get(
  "/asset-breakdown",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const byCategory = await db
      .select({
        category: assets.category,
        count: count(),
      })
      .from(assets)
      .groupBy(assets.category)
      .orderBy(desc(count()));

    const byStatus = await db
      .select({
        status: assets.status,
        count: count(),
      })
      .from(assets)
      .groupBy(assets.status)
      .orderBy(desc(count()));

    res.json({ byCategory, byStatus });
  })
);

router.get(
  "/rental-breakdown",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const byStatus = await db
      .select({
        status: rentals.status,
        count: count(),
      })
      .from(rentals)
      .groupBy(rentals.status)
      .orderBy(desc(count()));

    const byMonth = await db
      .select({
        month: sql<string>`to_char(${rentals.createdAt}, 'YYYY-MM')`,
        count: count(),
        totalRevenue: sum(rentals.totalPayableHalalas),
      })
      .from(rentals)
      .groupBy(sql`to_char(${rentals.createdAt}, 'YYYY-MM')`)
      .orderBy(desc(sql`to_char(${rentals.createdAt}, 'YYYY-MM')`))
      .limit(12);

    res.json({ byStatus, byMonth });
  })
);

router.get(
  "/top-assets",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const topByRentals = await db
      .select({
        assetId: rentals.assetId,
        assetTitle: assets.title,
        brand: assets.brand,
        rentalCount: count(),
        totalRevenue: sum(rentals.totalPayableHalalas),
      })
      .from(rentals)
      .innerJoin(assets, eq(rentals.assetId, assets.id))
      .groupBy(rentals.assetId, assets.title, assets.brand)
      .orderBy(desc(count()))
      .limit(10);

    res.json({ topByRentals });
  })
);

router.get(
  "/user-breakdown",
  authenticate,
  requirePermission("user.read"),
  asyncHandler(async (_req, res) => {
    const byRole = await db
      .select({
        role: users.role,
        count: count(),
      })
      .from(users)
      .groupBy(users.role)
      .orderBy(desc(count()));

    const byKyc = await db
      .select({
        kycStatus: users.kycStatus,
        count: count(),
      })
      .from(users)
      .groupBy(users.kycStatus)
      .orderBy(desc(count()));

    const byRiskCategory = await db
      .select({
        riskCategory: users.riskCategory,
        count: count(),
      })
      .from(users)
      .groupBy(users.riskCategory)
      .orderBy(desc(count()));

    res.json({ byRole, byKyc, byRiskCategory });
  })
);

router.get(
  "/shipment-stats",
  authenticate,
  requirePermission("operations.read"),
  asyncHandler(async (_req, res) => {
    const byStatus = await db
      .select({
        status: shipments.status,
        count: count(),
      })
      .from(shipments)
      .groupBy(shipments.status)
      .orderBy(desc(count()));

    const byDirection = await db
      .select({
        direction: shipments.direction,
        count: count(),
      })
      .from(shipments)
      .groupBy(shipments.direction)
      .orderBy(desc(count()));

    res.json({ byStatus, byDirection });
  })
);

export default router;
