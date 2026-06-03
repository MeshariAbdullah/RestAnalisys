import { Router } from "express";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications, notificationPreferences } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getDevLog } from "../services/notificationService.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const unreadOnly = req.query.unread === "true";

    const conditions = [eq(notifications.userId, req.user!.userId)];
    if (unreadOnly) conditions.push(isNull(notifications.readAt));

    const rows = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    const [unreadCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(eq(notifications.userId, req.user!.userId), isNull(notifications.readAt))
      );

    res.json({
      items: rows,
      unreadCount: Number(unreadCount?.count ?? 0),
    });
  })
);

router.post(
  "/read",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { ids } = req.body as { ids?: number[] };
    const now = new Date();

    if (ids && ids.length > 0) {
      await db
        .update(notifications)
        .set({ readAt: now })
        .where(
          and(
            eq(notifications.userId, req.user!.userId),
            sql`id = ANY(${ids})`
          )
        );
    } else {
      await db
        .update(notifications)
        .set({ readAt: now })
        .where(
          and(eq(notifications.userId, req.user!.userId), isNull(notifications.readAt))
        );
    }

    res.json({ ok: true });
  })
);

router.get(
  "/preferences",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, req.user!.userId))
      .limit(1);

    if (!prefs) {
      const [created] = await db
        .insert(notificationPreferences)
        .values({ userId: req.user!.userId })
        .returning();
      return res.json(created);
    }

    res.json(prefs);
  })
);

router.put(
  "/preferences",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { smsEnabled, emailEnabled, pushEnabled, quietHoursStart, quietHoursEnd, disabledCategories } =
      req.body as {
        smsEnabled?: boolean;
        emailEnabled?: boolean;
        pushEnabled?: boolean;
        quietHoursStart?: string;
        quietHoursEnd?: string;
        disabledCategories?: string[];
      };

    const [existing] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, req.user!.userId))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(notificationPreferences)
        .set({
          smsEnabled: smsEnabled ?? existing.smsEnabled,
          emailEnabled: emailEnabled ?? existing.emailEnabled,
          pushEnabled: pushEnabled ?? existing.pushEnabled,
          quietHoursStart: quietHoursStart ?? existing.quietHoursStart,
          quietHoursEnd: quietHoursEnd ?? existing.quietHoursEnd,
          disabledCategories: (disabledCategories as unknown as object) ?? existing.disabledCategories,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.userId, req.user!.userId))
        .returning();
      return res.json(updated);
    }

    const [created] = await db
      .insert(notificationPreferences)
      .values({
        userId: req.user!.userId,
        smsEnabled: smsEnabled ?? true,
        emailEnabled: emailEnabled ?? true,
        pushEnabled: pushEnabled ?? false,
        quietHoursStart,
        quietHoursEnd,
        disabledCategories: (disabledCategories as unknown as object) ?? [],
      })
      .returning();

    res.json(created);
  })
);

router.get(
  "/dev-log",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!["admin", "super_admin"].includes(req.user!.role)) {
      return res.status(403).json({ error: "Admin only" });
    }
    res.json(getDevLog());
  })
);

export default router;
