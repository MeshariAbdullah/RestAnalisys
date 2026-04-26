import { Router } from "express";
import { authenticate, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../services/notificationService.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;
    const unreadOnly = req.query.unread === "true";

    const [items, unreadCount] = await Promise.all([
      getUserNotifications(userId, { limit, offset, unreadOnly }),
      getUnreadCount(userId),
    ]);

    res.json({ items, unreadCount, limit, offset });
  })
);

router.get(
  "/unread-count",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const count = await getUnreadCount(req.user!.userId);
    res.json({ unreadCount: count });
  })
);

router.patch(
  "/:id/read",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const notificationId = parseInt(req.params.id);
    const updated = await markAsRead(notificationId, req.user!.userId);
    if (!updated) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.json(updated);
  })
);

router.post(
  "/mark-all-read",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    await markAllAsRead(req.user!.userId);
    res.json({ ok: true });
  })
);

export default router;
