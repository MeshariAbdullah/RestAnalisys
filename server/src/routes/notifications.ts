/**
 * Notifications — every authenticated user can list their own notifications
 * and mark them as read. Writes happen server-side from other services via
 * notificationService.notify().
 */

import { Router } from "express";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";

const router = Router();

router.get(
  "/mine",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const unreadOnly = req.query.unread === "true";
    const limit = Math.min(Number(req.query.limit ?? 50), 200);

    const base = db
      .select()
      .from(notifications)
      .where(
        unreadOnly
          ? and(eq(notifications.userId, req.user!.userId), isNull(notifications.readAt))
          : eq(notifications.userId, req.user!.userId)
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    const rows = await base;

    const [unread] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(eq(notifications.userId, req.user!.userId), isNull(notifications.readAt))
      );

    res.json({ items: rows, unreadCount: Number(unread?.count ?? 0) });
  })
);

router.post(
  "/:id/read",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [row] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);
    if (!row) throw new NotFoundError("Notification");
    if (row.userId !== req.user!.userId) throw new ForbiddenError();
    if (row.readAt) return res.json(row);

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
  asyncHandler(async (req: AuthedRequest, res) => {
    const result = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(eq(notifications.userId, req.user!.userId), isNull(notifications.readAt))
      )
      .returning({ id: notifications.id });
    res.json({ marked: result.length });
  })
);

export default router;
