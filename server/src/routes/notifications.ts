import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/errors.js";

const router = Router();

// GET / — list user's notifications (newest first, limit 50)
router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user!.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    res.json(rows);
  })
);

// GET /unread-count — count of unread notifications
router.get(
  "/unread-count",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, req.user!.userId),
          eq(notifications.isRead, false)
        )
      );
    res.json({ count: Number(result?.count ?? 0) });
  })
);

// POST /:id/read — mark one notification as read
router.post(
  "/:id/read",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [notif] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, req.user!.userId)
        )
      )
      .limit(1);
    if (!notif) throw new NotFoundError("Notification");
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    res.json(updated);
  })
);

// POST /read-all — mark all notifications as read
router.post(
  "/read-all",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, req.user!.userId),
          eq(notifications.isRead, false)
        )
      );
    res.json({ ok: true });
  })
);

export default router;
