import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

export interface NotificationPayload {
  userId: number;
  type: string;
  title: string;
  titleAr?: string;
  body: string;
  bodyAr?: string;
  entityType?: string;
  entityId?: number;
  channel?: "in_app" | "email" | "sms" | "push";
  metadata?: Record<string, unknown>;
}

export async function sendNotification(payload: NotificationPayload) {
  const [notif] = await db
    .insert(notifications)
    .values({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      titleAr: payload.titleAr,
      body: payload.body,
      bodyAr: payload.bodyAr,
      entityType: payload.entityType,
      entityId: payload.entityId,
      channel: payload.channel ?? "in_app",
      metadata: payload.metadata as object ?? null,
    })
    .returning();
  return notif;
}

export async function sendBulkNotifications(payloads: NotificationPayload[]) {
  if (payloads.length === 0) return [];
  const rows = await db
    .insert(notifications)
    .values(
      payloads.map((p) => ({
        userId: p.userId,
        type: p.type,
        title: p.title,
        titleAr: p.titleAr,
        body: p.body,
        bodyAr: p.bodyAr,
        entityType: p.entityType,
        entityId: p.entityId,
        channel: p.channel ?? ("in_app" as const),
        metadata: p.metadata as object ?? null,
      }))
    )
    .returning();
  return rows;
}

export async function getUserNotifications(
  userId: number,
  opts: { unreadOnly?: boolean; limit?: number; offset?: number } = {}
) {
  const { unreadOnly = false, limit = 50, offset = 0 } = opts;
  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) conditions.push(eq(notifications.read, false));

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

export async function getUnreadCount(userId: number): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return Number(result?.count ?? 0);
}
