/**
 * Notification routes — user's in-app notification feed.
 */

import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/errors.js";

const router = Router();

/** GET /api/notifications — list current user's notifications (newest first). */
router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const unreadOnly = req.query.unread === "true";

    const conditions = [eq(notifications.userId, userId)];
    if (unreadOnly) conditions.push(eq(notifications.read, false));

    const rows = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    const [unreadCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

    res.json({
      notifications: rows,
      unreadCount: Number(unreadCount?.count ?? 0),
    });
  })
);

/** POST /api/notifications/:id/read — mark a single notification as read. */
router.post(
  "/:id/read",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [updated] = await db
      .update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, req.user!.userId)))
      .returning();
    if (!updated) throw new NotFoundError("Notification");
    res.json(updated);
  })
);

/** POST /api/notifications/read-all — mark all notifications as read. */
router.post(
  "/read-all",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    await db
      .update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(
        and(eq(notifications.userId, req.user!.userId), eq(notifications.read, false))
      );
    res.json({ ok: true });
  })
);

export default router;
