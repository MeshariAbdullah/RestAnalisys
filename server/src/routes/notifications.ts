import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { authenticate, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const items = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user!.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    const unreadCount = items.filter((n) => !n.read).length;

    res.json({ items, unreadCount });
  })
);

router.post(
  "/:id/read",
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

    if (!updated) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    res.json(updated);
  })
);

router.post(
  "/read-all",
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

    res.json({ message: "All notifications marked as read" });
  })
);

export default router;
