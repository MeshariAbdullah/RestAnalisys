import { Router } from "express";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/errors.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("notification.read"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user!.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    const [unreadCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, req.user!.userId),
          isNull(notifications.readAt)
        )
      );

    res.json({
      items: rows,
      unread: Number(unreadCount?.count ?? 0),
    });
  })
);

router.get(
  "/unread-count",
  authenticate,
  requirePermission("notification.read"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, req.user!.userId),
          isNull(notifications.readAt)
        )
      );
    res.json({ unread: Number(row?.count ?? 0) });
  })
);

router.post(
  "/:id/read",
  authenticate,
  requirePermission("notification.read"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [notif] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);
    if (!notif) throw new NotFoundError("Notification");
    if (notif.userId !== req.user!.userId) throw new NotFoundError("Notification");

    const [updated] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();

    res.json(updated);
  })
);

router.post(
  "/read-all",
  authenticate,
  requirePermission("notification.read"),
  asyncHandler(async (req: AuthedRequest, res) => {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, req.user!.userId),
          isNull(notifications.readAt)
        )
      );
    res.json({ ok: true });
  })
);

export default router;
