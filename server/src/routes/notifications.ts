import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const unreadOnly = req.query.unread === "true";

    const conditions = [eq(notifications.userId, req.user!.userId)];
    if (unreadOnly) conditions.push(eq(notifications.read, false));

    const rows = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(...conditions));

    res.json({
      items: rows,
      total: Number(countResult?.count ?? 0),
      limit,
      offset,
    });
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
    const [updated] = await db
      .update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, req.user!.userId)
        )
      )
      .returning();
    res.json(updated ?? { ok: true });
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
