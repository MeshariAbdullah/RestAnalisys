import { Router } from "express";
import { and, desc, eq, sql, count } from "drizzle-orm";
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
    const unreadOnly = req.query.unreadOnly === "true";
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;

    const conditions = [eq(notifications.userId, userId)];
    if (unreadOnly) conditions.push(eq(notifications.read, false));

    const rows = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(rows);
  })
);

router.get(
  "/count",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const [result] = await db
      .select({ unread: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

    res.json({ unread: result?.unread ?? 0 });
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
      .where(eq(notifications.id, id))
      .limit(1);

    if (!notif) throw new NotFoundError("Notification");
    if (notif.userId !== req.user!.userId) throw new ForbiddenError();

    const [updated] = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id))
      .returning();

    res.json(updated);
  })
);

router.post(
  "/read-all",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

    res.json({ ok: true });
  })
);

router.delete(
  "/:id",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [notif] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);

    if (!notif) throw new NotFoundError("Notification");
    if (notif.userId !== req.user!.userId) throw new ForbiddenError();

    await db.delete(notifications).where(eq(notifications.id, id));
    res.json({ ok: true });
  })
);

export default router;
