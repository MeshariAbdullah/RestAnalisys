/**
 * Notification service — per-user in-app inbox.
 *
 * Thin wrapper around the `notifications` table. All mutating routes that
 * touch a user-visible object (rental, asset, payout, dispute, Sanad) should
 * call notify(...) so the recipient sees it in their bell / inbox.
 *
 * This is fire-and-forget: failures are logged but never propagated, so a
 * notification issue can't break a core business flow.
 */

import { db } from "../db/index.js";
import { notifications, Notification } from "../db/schema.js";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

export type NotificationType = Notification["type"];

export interface NotifyInput {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  linkPath?: string;
  payload?: Record<string, unknown>;
}

/**
 * Insert a notification for a single user. Returns the row on success or
 * null on failure (the error is logged, never thrown).
 */
export async function notify(input: NotifyInput): Promise<Notification | null> {
  try {
    const [row] = await db
      .insert(notifications)
      .values({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        linkPath: input.linkPath ?? null,
        payloadJson: (input.payload as object) ?? null,
      })
      .returning();
    return row;
  } catch (err) {
    console.error("[notify] failed:", err);
    return null;
  }
}

/**
 * Convenience helper to fan-out the same notification to multiple users
 * (e.g. emitting the same dispute update to renter + owner + admin).
 */
export async function notifyMany(
  userIds: number[],
  payload: Omit<NotifyInput, "userId">
): Promise<void> {
  await Promise.all(userIds.map((userId) => notify({ ...payload, userId })));
}

export async function listForUser(
  userId: number,
  opts: { unreadOnly?: boolean; limit?: number } = {}
): Promise<Notification[]> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const where = opts.unreadOnly
    ? and(eq(notifications.userId, userId), isNull(notifications.readAt))
    : eq(notifications.userId, userId);
  return db
    .select()
    .from(notifications)
    .where(where)
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnread(userId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return Number(row?.count ?? 0);
}

export async function markRead(
  userId: number,
  ids: number[]
): Promise<number> {
  if (ids.length === 0) return 0;
  const result = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
        sql`id = ANY(${ids})`
      )
    );
  // drizzle doesn't return a row count for update; count IDs as a best-effort.
  return result ? ids.length : 0;
}

export async function markAllRead(userId: number): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
