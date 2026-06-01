import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

interface CreateNotificationInput {
  userId: number;
  type: string;
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  entityType?: string;
  entityId?: number;
  metadata?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput) {
  const [notification] = await db.insert(notifications).values({
    userId: input.userId,
    type: input.type as any,
    title: input.title,
    titleAr: input.titleAr,
    message: input.message,
    messageAr: input.messageAr,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
  }).returning();
  return notification;
}

export async function notifyMultiple(userIds: number[], input: Omit<CreateNotificationInput, "userId">) {
  if (userIds.length === 0) return [];
  const values = userIds.map(userId => ({
    userId,
    type: input.type as any,
    title: input.title,
    titleAr: input.titleAr,
    message: input.message,
    messageAr: input.messageAr,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
  }));
  return db.insert(notifications).values(values).returning();
}

export async function getUserNotifications(userId: number, limit = 50, unreadOnly = false) {
  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) conditions.push(eq(notifications.isRead, false));

  return db.select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadCount(userId: number): Promise<number> {
  const [result] = await db.select({
    count: sql<number>`count(*)`,
  })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return Number(result?.count ?? 0);
}

export async function markAsRead(notificationId: number, userId: number) {
  const [updated] = await db.update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning();
  return updated;
}

export async function markAllAsRead(userId: number) {
  await db.update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}
