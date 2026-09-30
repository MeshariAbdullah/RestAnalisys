import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { auditLogs, users } from "../db/schema.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { AuditLogQuerySchema } from "../utils/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("system.audit"),
  asyncHandler(async (req, res) => {
    const filter = AuditLogQuerySchema.parse(req.query);
    const conditions: ReturnType<typeof eq>[] = [];

    if (filter.entityType) conditions.push(eq(auditLogs.entityType, filter.entityType));
    if (filter.action) conditions.push(sql`${auditLogs.action} ilike ${"%" + filter.action + "%"}`);
    if (filter.actorUserId) conditions.push(eq(auditLogs.actorUserId, filter.actorUserId));

    const rows = await db
      .select({
        id: auditLogs.id,
        actorUserId: auditLogs.actorUserId,
        actorRole: auditLogs.actorRole,
        actorName: users.fullName,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        beforeJson: auditLogs.beforeJson,
        afterJson: auditLogs.afterJson,
        ip: auditLogs.ip,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorUserId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(filter.limit)
      .offset(filter.offset);

    const [total] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json({
      items: rows,
      total: Number(total?.count ?? 0),
      limit: filter.limit,
      offset: filter.offset,
    });
  })
);

router.get(
  "/entity/:entityType/:entityId",
  authenticate,
  requirePermission("system.audit"),
  asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;
    const rows = await db
      .select({
        id: auditLogs.id,
        actorUserId: auditLogs.actorUserId,
        actorRole: auditLogs.actorRole,
        actorName: users.fullName,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        beforeJson: auditLogs.beforeJson,
        afterJson: auditLogs.afterJson,
        ip: auditLogs.ip,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorUserId, users.id))
      .where(
        and(
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, Number(entityId))
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);
    res.json(rows);
  })
);

export default router;
