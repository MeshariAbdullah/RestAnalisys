/**
 * In-app notification service. Creates notifications for users when
 * key events occur in the rental lifecycle.
 *
 * Notifications are stored in the DB and fetched by the client via
 * polling or (future) WebSocket push.
 */

import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

export interface NotifyInput {
  userId: number;
  type: string;
  title: string;
  body: string;
  linkUrl?: string;
  referenceType?: string;
  referenceId?: number;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      linkUrl: input.linkUrl ?? null,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
    });
  } catch (err) {
    // Never let notification failures break the primary flow
    console.error("[notify] write failed:", err);
  }
}

/** Batch-create notifications for multiple users. */
export async function notifyMany(inputs: NotifyInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await db.insert(notifications).values(
      inputs.map((i) => ({
        userId: i.userId,
        type: i.type,
        title: i.title,
        body: i.body,
        linkUrl: i.linkUrl ?? null,
        referenceType: i.referenceType ?? null,
        referenceId: i.referenceId ?? null,
      }))
    );
  } catch (err) {
    console.error("[notify] batch write failed:", err);
  }
}
