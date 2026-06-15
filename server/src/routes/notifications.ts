import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
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
    const rows = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, req.user!.userId),
          eq(notifications.status, "pending")
        )
      );
    res.json({ count: rows.length });
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
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, req.user!.userId)
        )
      )
      .limit(1);
    if (!notification) throw new NotFoundError("Notification");

    const [updated] = await db
      .update(notifications)
      .set({ status: "read", readAt: new Date() })
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
      .set({ status: "read", readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, req.user!.userId),
          eq(notifications.status, "pending")
        )
      );
    res.json({ ok: true });
  })
);

export default router;
