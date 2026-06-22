/**
 * Notification routes — in-app notifications for all users.
 *
 * Endpoints:
 *   GET  /notifications         — list user's notifications (paginated)
 *   GET  /notifications/unread  — unread count (for badge)
 *   POST /notifications/:id/read — mark one as read
 *   POST /notifications/read-all — mark all as read
 */

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

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const unreadOnly = req.query.unreadOnly === "true";
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const result = await getUserNotifications(userId, { unreadOnly, limit, offset });
    res.json(result);
  })
);

router.get(
  "/unread",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const count = await getUnreadCount(req.user!.userId);
    res.json({ unreadCount: count });
  })
);

router.post(
  "/:id/read",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const updated = await markAsRead(id, req.user!.userId);
    if (!updated) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.json({ ok: true });
  })
);

router.post(
  "/read-all",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const count = await markAllAsRead(req.user!.userId);
    res.json({ ok: true, markedRead: count });
  })
);

export default router;
