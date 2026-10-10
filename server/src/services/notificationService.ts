import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

type NotificationType =
  | "rental_created" | "rental_confirmed" | "rental_delivered"
  | "rental_returned" | "rental_closed" | "rental_cancelled"
  | "asset_approved" | "asset_rejected" | "asset_received" | "asset_listed"
  | "inspection_complete"
  | "payment_captured" | "payment_refunded" | "payout_released"
  | "dispute_opened" | "dispute_resolved"
  | "sanad_issued" | "sanad_executed"
  | "risk_alert" | "system";

export async function createNotification(args: {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
  metadata?: Record<string, unknown>;
}) {
  const [notif] = await db
    .insert(notifications)
    .values(args)
    .returning();
  return notif;
}

export async function notifyMultiple(
  userIds: number[],
  args: Omit<Parameters<typeof createNotification>[0], "userId">
) {
  if (userIds.length === 0) return [];
  const values = userIds.map((userId) => ({ ...args, userId }));
  return db.insert(notifications).values(values).returning();
}

export async function getUserNotifications(
  userId: number,
  opts: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
) {
  const { limit = 50, offset = 0, unreadOnly = false } = opts;

  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }

  const rows = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(...conditions));

  return { items: rows, total: Number(countResult?.count ?? 0) };
}

export async function getUnreadCount(userId: number): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return Number(result?.count ?? 0);
}

export async function markAsRead(notificationId: number, userId: number) {
  const [updated] = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning();
  return updated;
}

export async function markAllAsRead(userId: number) {
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}
