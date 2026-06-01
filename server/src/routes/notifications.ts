import { Router } from "express";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getUserNotifications, getUnreadCount, markAsRead, markAllAsRead } from "../services/notificationService.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const unreadOnly = req.query.unread === "true";
    const items = await getUserNotifications(req.user!.userId, limit, unreadOnly);
    res.json(items);
  })
);

router.get(
  "/unread-count",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const count = await getUnreadCount(req.user!.userId);
    res.json({ count });
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
    res.json(updated);
  })
);

router.post(
  "/read-all",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    await markAllAsRead(req.user!.userId);
    res.json({ ok: true });
  })
);

export default router;
