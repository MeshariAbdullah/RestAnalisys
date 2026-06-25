import { Router } from "express";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getUserNotifications,
  markNotificationRead,
  markAllRead,
} from "../services/notificationService.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const unreadOnly = req.query.unread === "true";
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const notifs = await getUserNotifications(req.user!.userId, {
      unreadOnly,
      limit,
    });
    res.json(notifs);
  })
);

router.post(
  "/:id/read",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const ok = await markNotificationRead(id, req.user!.userId);
    if (!ok) {
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
    await markAllRead(req.user!.userId);
    res.json({ ok: true });
  })
);

export default router;
