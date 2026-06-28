import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { sendEmail } from "./emailService.js";

interface NotifyParams {
  userId: number;
  category: string;
  title: string;
  body: string;
  linkUrl?: string;
  referenceType?: string;
  referenceId?: number;
  email?: { to: string; subject?: string };
}

export async function notify(params: NotifyParams): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: params.userId,
      channel: "in_app",
      category: params.category,
      title: params.title,
      body: params.body,
      linkUrl: params.linkUrl ?? null,
      referenceType: params.referenceType ?? null,
      referenceId: params.referenceId ?? null,
    });

    if (params.email) {
      await sendEmail({
        to: params.email.to,
        subject: params.email.subject ?? params.title,
        text: params.body,
      });
    }
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}

export async function getUserNotifications(userId: number, limit = 50, unreadOnly = false) {
  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) conditions.push(eq(notifications.read, false));

  return db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadCount(userId: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return Number(result[0]?.count ?? 0);
}

export async function markAsRead(notificationId: number, userId: number): Promise<boolean> {
  const result = await db
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning();
  return result.length > 0;
}

export async function markAllAsRead(userId: number): Promise<number> {
  const result = await db
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
    .returning();
  return result.length;
}
