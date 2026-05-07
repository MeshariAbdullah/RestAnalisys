import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import type { NewNotification } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

export interface NotifyInput {
  userId: number;
  type: NewNotification["type"];
  title: string;
  titleAr?: string;
  body: string;
  bodyAr?: string;
  entityType?: string;
  entityId?: number;
  actionUrl?: string;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      titleAr: input.titleAr,
      body: input.body,
      bodyAr: input.bodyAr,
      entityType: input.entityType,
      entityId: input.entityId,
      actionUrl: input.actionUrl,
    });
  } catch (err) {
    console.error("[notify] write failed:", err);
  }
}

export async function notifyMultiple(inputs: NotifyInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await db.insert(notifications).values(
      inputs.map((input) => ({
        userId: input.userId,
        type: input.type,
        title: input.title,
        titleAr: input.titleAr,
        body: input.body,
        bodyAr: input.bodyAr,
        entityType: input.entityType,
        entityId: input.entityId,
        actionUrl: input.actionUrl,
      }))
    );
  } catch (err) {
    console.error("[notify] bulk write failed:", err);
  }
}

export async function getUserNotifications(
  userId: number,
  opts: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
) {
  const { limit = 50, offset = 0, unreadOnly = false } = opts;

  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) {
    conditions.push(eq(notifications.read, false));
  }

  const items = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

  return items;
}

export async function getUnreadCount(userId: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

  return result[0]?.count ?? 0;
}

export async function markAsRead(notificationId: number, userId: number): Promise<boolean> {
  const result = await db
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));

  return (result.rowCount ?? 0) > 0;
}

export async function markAllAsRead(userId: number): Promise<number> {
  const result = await db
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

  return result.rowCount ?? 0;
}
