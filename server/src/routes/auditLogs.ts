import { Router } from "express";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { auditLogs } from "../db/schema.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(authenticate);
router.use(requirePermission("system.audit"));

router.get(
  "/actions",
  asyncHandler(async (_req, res) => {
    const rows = await db
      .selectDistinct({ action: auditLogs.action })
      .from(auditLogs)
      .orderBy(auditLogs.action);
    res.json(rows.map((r) => r.action));
  })
);

router.get(
  "/entity/:entityType/:entityId",
  asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;
    const rows = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, Number(entityId))
        )
      )
      .orderBy(desc(auditLogs.createdAt));
    res.json(rows);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (req.query.entityType) {
      conditions.push(eq(auditLogs.entityType, String(req.query.entityType)));
    }
    if (req.query.entityId) {
      conditions.push(eq(auditLogs.entityId, Number(req.query.entityId)));
    }
    if (req.query.actorUserId) {
      conditions.push(eq(auditLogs.actorUserId, Number(req.query.actorUserId)));
    }
    if (req.query.action) {
      conditions.push(eq(auditLogs.action, String(req.query.action)));
    }
    if (req.query.startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(String(req.query.startDate))));
    }
    if (req.query.endDate) {
      conditions.push(lte(auditLogs.createdAt, new Date(String(req.query.endDate))));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      db
        .select()
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(where),
    ]);

    res.json({
      items,
      total: countResult[0]?.total ?? 0,
      page,
      limit,
    });
  })
);

export default router;
