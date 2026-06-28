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
    const unreadOnly = req.query.unread === "true";
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const rows = await getUserNotifications(req.user!.userId, limit, unreadOnly);
    res.json(rows);
  })
);

router.get(
  "/count",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const count = await getUnreadCount(req.user!.userId);
    res.json({ unread: count });
  })
);

router.post(
  "/:id/read",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const ok = await markAsRead(id, req.user!.userId);
    if (!ok) return res.status(404).json({ error: "Notification not found" });
    res.json({ ok: true });
  })
);

router.post(
  "/read-all",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const count = await markAllAsRead(req.user!.userId);
    res.json({ marked: count });
  })
);

export default router;
