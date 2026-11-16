import { Router } from "express";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/errors.js";
import {
  listForUser,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../services/notificationService.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await listForUser(req.user!.userId, page, limit);
    res.json(result);
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

router.patch(
  "/:id/read",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const updated = await markAsRead(id, req.user!.userId);
    if (!updated) throw new NotFoundError("Notification");
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
