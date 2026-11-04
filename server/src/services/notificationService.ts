import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

export async function createNotification(
  userId: number,
  type: string,
  title: string,
  message: string,
  entityType: string,
  entityId?: number
): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId,
      type,
      title,
      message,
      entityType,
      entityId: entityId ?? null,
    });
  } catch (err) {
    console.error("[notification] write failed:", err);
  }
}

export async function getUserNotifications(
  userId: number,
  opts?: { unreadOnly?: boolean; limit?: number; offset?: number }
) {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const conditions = [eq(notifications.userId, userId)];
  if (opts?.unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }

  return db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getUnreadCount(userId: number): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return row?.count ?? 0;
}

export async function markRead(notificationId: number, userId: number): Promise<boolean> {
  const [updated] = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning();
  return !!updated;
}

export async function markAllRead(userId: number): Promise<number> {
  const result = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .returning();
  return result.length;
}
