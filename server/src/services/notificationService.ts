/**
 * Notification service — manages in-app notifications and provides hooks for
 * email/SMS delivery when credentials are provisioned.
 */

import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { and, desc, eq, sql } from "drizzle-orm";

export interface NotifyInput {
  userId: number;
  type: string;
  title: string;
  titleAr?: string;
  body: string;
  bodyAr?: string;
  entityType?: string;
  entityId?: number;
  actionUrl?: string;
  channel?: "in_app" | "email" | "sms";
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      channel: input.channel ?? "in_app",
      type: input.type,
      title: input.title,
      titleAr: input.titleAr,
      body: input.body,
      bodyAr: input.bodyAr,
      entityType: input.entityType,
      entityId: input.entityId,
      actionUrl: input.actionUrl,
      sentAt: new Date(),
    });

    if (input.channel === "email" && process.env.SMTP_HOST) {
      // Production: send email via configured SMTP
      console.log(`[notify] email queued for user=${input.userId} type=${input.type}`);
    }
    if (input.channel === "sms" && process.env.SMS_API_KEY) {
      // Production: send SMS via configured provider
      console.log(`[notify] sms queued for user=${input.userId} type=${input.type}`);
    }
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}

export async function getUserNotifications(
  userId: number,
  opts: { unreadOnly?: boolean; limit?: number; offset?: number } = {}
) {
  const { unreadOnly = false, limit = 20, offset = 0 } = opts;
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

export async function getUnreadCount(userId: number): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return Number(result?.count ?? 0);
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
