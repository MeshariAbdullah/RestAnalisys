import { Router } from "express";
import { and, desc, eq, sql, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/errors.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
    const limit = Math.min(Number(req.query.limit) || 30, 100);

    const conditions = [eq(notifications.userId, userId)];
    if (cursor) conditions.push(lt(notifications.id, cursor));

    const rows = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    res.json({ items, nextCursor });
  })
);

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
          eq(notifications.read, false)
        )
      );
    res.json({ count: Number(result?.count ?? 0) });
  })
);

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
      .set({ read: true, readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();

    res.json(updated);
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
    res.json({ ok: true });
  })
);

export default router;
