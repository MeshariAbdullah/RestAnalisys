/**
 * Notification routes — per-user in-app inbox.
 *
 * GET  /notifications          → list (supports ?unread=1)
 * GET  /notifications/unread-count
 * POST /notifications/read     → mark a list of IDs as read (body: {ids})
 * POST /notifications/read-all → mark everything as read
 */

import { Router } from "express";
import { z } from "zod";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listForUser,
  countUnread,
  markRead,
  markAllRead,
} from "../services/notificationService.js";

const router = Router();

const MarkReadSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(500),
});

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const unreadOnly = req.query.unread === "1" || req.query.unread === "true";
    const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
    const rows = await listForUser(req.user!.userId, { unreadOnly, limit });
    res.json(rows);
  })
);

router.get(
  "/unread-count",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const count = await countUnread(req.user!.userId);
    res.json({ count });
  })
);

router.post(
  "/read",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { ids } = MarkReadSchema.parse(req.body);
    const updated = await markRead(req.user!.userId, ids);
    res.json({ updated });
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
