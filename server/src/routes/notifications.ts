import { Router } from "express";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../services/notificationService.js";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const unreadOnly = req.query.unread === "true";

    const items = await getUserNotifications(userId, { limit, offset, unreadOnly });
    const unreadCount = await getUnreadCount(userId);

    res.json({ items, unreadCount });
  })
);

router.get(
  "/count",
  asyncHandler(async (req: AuthedRequest, res) => {
    const count = await getUnreadCount(req.user!.userId);
    res.json({ unreadCount: count });
  })
);

router.post(
  "/:id/read",
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid notification ID" });
      return;
    }
    const success = await markAsRead(id, req.user!.userId);
    if (!success) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.json({ ok: true });
  })
);

router.post(
  "/read-all",
  asyncHandler(async (req: AuthedRequest, res) => {
    const count = await markAllAsRead(req.user!.userId);
    res.json({ ok: true, marked: count });
  })
);

export default router;
