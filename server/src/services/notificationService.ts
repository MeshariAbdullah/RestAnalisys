import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";

export type NotificationType =
  | "asset_approved"
  | "asset_rejected"
  | "asset_inspection_complete"
  | "asset_listed"
  | "rental_created"
  | "rental_confirmed"
  | "rental_delivered"
  | "rental_returned"
  | "rental_closed"
  | "rental_cancelled"
  | "payment_captured"
  | "payment_failed"
  | "payout_released"
  | "dispute_opened"
  | "dispute_resolved"
  | "sanad_issued"
  | "sanad_executed"
  | "inspection_assigned"
  | "alert_created";

export interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  entityType: string;
  entityId: number;
}

export async function createNotification(input: CreateNotificationInput) {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType,
      entityId: input.entityId,
    })
    .returning();
  return notification;
}

export async function getUserNotifications(userId: number, limit = 50, offset = 0) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function markAsRead(notificationId: number, userId: number) {
  return db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllAsRead(userId: number) {
  return db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId)));
}

export async function getUnreadCount(userId: number): Promise<number> {
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId)));
  return rows.filter((r) => !r.readAt).length;
}
