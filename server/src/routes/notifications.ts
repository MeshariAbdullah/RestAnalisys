import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from "../services/notificationService.js";
import type { AuthedRequest } from "../middleware/auth.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = (req as AuthedRequest).user!;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const items = await getUserNotifications(user.userId, limit, offset);
    res.json({ notifications: items });
  })
);

router.get(
  "/unread-count",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = (req as AuthedRequest).user!;
    const count = await getUnreadCount(user.userId);
    res.json({ unreadCount: count });
  })
);

router.post(
  "/:id/read",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = (req as AuthedRequest).user!;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid notification ID" });
      return;
    }
    await markAsRead(id, user.userId);
    res.json({ ok: true });
  })
);

router.post(
  "/read-all",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = (req as AuthedRequest).user!;
    await markAllAsRead(user.userId);
    res.json({ ok: true });
  })
);

export default router;
