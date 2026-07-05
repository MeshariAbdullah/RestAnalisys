import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
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
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user!.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    res.json(rows);
  })
);

router.get(
  "/unread-count",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, req.user!.userId),
          eq(notifications.read, false)
        )
      );
    res.json({ count: Number(row?.count ?? 0) });
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
    if (notif.userId !== req.user!.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
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

export async function createNotification(data: {
  userId: number;
  type: string;
  title: string;
  body: string;
  linkUrl?: string;
}) {
  await db.insert(notifications).values(data);
}
