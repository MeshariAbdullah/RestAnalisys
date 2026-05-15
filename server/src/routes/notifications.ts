import { Router } from "express";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from "../services/notificationService.js";
import { parsePagination, buildPaginatedResponse } from "../utils/pagination.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const { page, limit, offset } = parsePagination(req);
    const unreadOnly = req.query.unread === "true";

    const { items, total } = await getUserNotifications(userId, {
      unreadOnly,
      limit,
      offset,
    });

    res.json(buildPaginatedResponse(items, total, { page, limit, offset }));
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
    const notifId = Number(req.params.id);
    const updated = await markAsRead(notifId, req.user!.userId);
    res.json(updated ?? { ok: true });
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
