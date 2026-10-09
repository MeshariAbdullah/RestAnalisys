import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { and, eq, desc, sql } from "drizzle-orm";

export interface NotifyInput {
  userId: number;
  title: string;
  body: string;
  category: string;
  severity?: string;
  entityType?: string;
  entityId?: number;
  channel?: "in_app" | "email" | "sms";
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      title: input.title,
      body: input.body,
      category: input.category,
      severity: input.severity ?? "info",
      entityType: input.entityType,
      entityId: input.entityId,
      channel: input.channel ?? "in_app",
    });
  } catch (err) {
    console.error("[notification] write failed:", err);
  }
}

export async function notifyMany(inputs: NotifyInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await db.insert(notifications).values(
      inputs.map((i) => ({
        userId: i.userId,
        title: i.title,
        body: i.body,
        category: i.category,
        severity: i.severity ?? "info",
        entityType: i.entityType,
        entityId: i.entityId,
        channel: i.channel ?? "in_app",
      }))
    );
  } catch (err) {
    console.error("[notification] batch write failed:", err);
  }
}

export async function getUserNotifications(
  userId: number,
  opts: { unreadOnly?: boolean; limit?: number; offset?: number } = {}
) {
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  const conditions = [eq(notifications.userId, userId)];
  if (opts.unreadOnly) conditions.push(eq(notifications.read, false));

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

export async function markRead(userId: number, notificationId: number): Promise<boolean> {
  const [updated] = await db
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning();
  return !!updated;
}

export async function markAllRead(userId: number): Promise<number> {
  const result = await db
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
    .returning({ id: notifications.id });
  return result.length;
}
