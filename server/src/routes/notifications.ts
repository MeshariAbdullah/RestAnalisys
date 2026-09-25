import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const cursor = Number(req.query.cursor) || undefined;

    const conditions = [eq(notifications.userId, userId)];
    if (cursor) {
      conditions.push(sql`${notifications.id} < ${cursor}`);
    }

    const rows = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.id))
      .limit(limit);

    const unreadCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

    res.json({
      notifications: rows,
      unreadCount: Number(unreadCount[0]?.count ?? 0),
      nextCursor: rows.length === limit ? rows[rows.length - 1].id : null,
    });
  })
);

router.post(
  "/:id/read",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);

    if (!notification) throw new NotFoundError("Notification");
    if (notification.userId !== req.user!.userId) throw new ForbiddenError();

    await db
      .update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(eq(notifications.id, id));

    res.json({ success: true });
  })
);

router.post(
  "/read-all",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    await db
      .update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, req.user!.userId),
          eq(notifications.read, false)
        )
      );

    res.json({ success: true });
  })
);

export default router;
