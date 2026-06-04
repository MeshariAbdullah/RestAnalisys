import { db } from "../db/index.js";
import { notifications, type NewNotification } from "../db/schema.js";
import { and, desc, eq, sql } from "drizzle-orm";

type NotificationType = NewNotification["type"];

interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    const [n] = await db.insert(notifications).values(input).returning();
    return n;
  } catch (err) {
    console.error("[notification] write failed:", err);
    return null;
  }
}

export async function createBulkNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) return;
  try {
    await db.insert(notifications).values(inputs);
  } catch (err) {
    console.error("[notification] bulk write failed:", err);
  }
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

export async function getUnreadCount(userId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return Number(row?.count ?? 0);
}

export async function markAsRead(notificationId: number, userId: number) {
  const [updated] = await db
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning();
  return updated;
}

export async function markAllAsRead(userId: number) {
  await db
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}
