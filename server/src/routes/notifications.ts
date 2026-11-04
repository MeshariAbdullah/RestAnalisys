import { Router } from "express";
import { z } from "zod";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getUserNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} from "../services/notificationService.js";

const router = Router();

const ListQuerySchema = z.object({
  unreadOnly: z.enum(["true", "false"]).optional().transform((v) => v === "true"),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const query = ListQuerySchema.parse(req.query);
    const rows = await getUserNotifications(req.user!.userId, {
      unreadOnly: query.unreadOnly,
      limit: query.limit,
      offset: query.offset,
    });
    const total = await getUnreadCount(req.user!.userId);
    res.json({ items: rows, total: rows.length > 0 ? rows.length : 0 });
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
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ error: "Invalid notification id" });
    }
    const ok = await markRead(id, req.user!.userId);
    if (!ok) return res.status(404).json({ error: "Notification not found" });
    res.json({ ok: true });
  })
);

router.post(
  "/read-all",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const updated = await markAllRead(req.user!.userId);
    res.json({ ok: true, updated });
  })
);

export default router;
