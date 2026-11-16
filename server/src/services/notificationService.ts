import { eq, and, desc, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications, users } from "../db/schema.js";

interface CreateNotificationParams {
  userId: number;
  type: string;
  title: string;
  body: string;
  channel?: string;
  entityType?: string;
  entityId?: number;
  metadata?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams) {
  const channel = params.channel ?? "in_app";

  const [row] = await db
    .insert(notifications)
    .values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      channel,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: (params.metadata ?? {}) as object,
    })
    .returning();

  if (channel !== "in_app") {
    await dispatchExternal(channel, params.userId, params.title, params.body);
  }

  return row;
}

export async function sendBatch(
  userId: number,
  items: Omit<CreateNotificationParams, "userId">[]
) {
  if (items.length === 0) return [];

  const rows = await db
    .insert(notifications)
    .values(
      items.map((n) => ({
        userId,
        type: n.type,
        title: n.title,
        body: n.body,
        channel: n.channel ?? "in_app",
        entityType: n.entityType,
        entityId: n.entityId,
        metadata: (n.metadata ?? {}) as object,
      }))
    )
    .returning();

  for (const n of rows) {
    if (n.channel !== "in_app") {
      await dispatchExternal(n.channel, userId, n.title, n.body);
    }
  }

  return rows;
}

export async function markAsRead(notificationId: number, userId: number) {
  const [updated] = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(eq(notifications.id, notificationId), eq(notifications.userId, userId))
    )
    .returning();
  return updated ?? null;
}

export async function markAllAsRead(userId: number) {
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
}

export async function getUnreadCount(userId: number): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
  return row?.value ?? 0;
}

export async function listForUser(
  userId: number,
  page: number,
  limit: number
) {
  const offset = (page - 1) * limit;
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

  const [total] = await db
    .select({ value: count() })
    .from(notifications)
    .where(eq(notifications.userId, userId));

  return { data: rows, total: total?.value ?? 0, page, limit };
}

async function dispatchExternal(
  channel: string,
  userId: number,
  title: string,
  body: string
) {
  const [user] = await db
    .select({ email: users.email, phone: users.phoneE164 })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return;

  if (channel === "email") {
    console.log(
      `[NotificationService] Would send EMAIL to ${user.email}: "${title}" — ${body}`
    );
  } else if (channel === "sms") {
    console.log(
      `[NotificationService] Would send SMS to ${user.phone ?? "no-phone"}: "${title}" — ${body}`
    );
  }
}
