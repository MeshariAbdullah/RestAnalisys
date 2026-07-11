import { db } from "../db/index.js";
import { notifications, type NewNotification } from "../db/schema.js";

type NotificationCategory = NewNotification["category"];

interface NotifyParams {
  userId: number;
  category: NotificationCategory;
  title: string;
  body: string;
  linkUrl?: string;
  entityType?: string;
  entityId?: number;
}

export async function notify(params: NotifyParams): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: params.userId,
      category: params.category,
      title: params.title,
      body: params.body,
      linkUrl: params.linkUrl ?? null,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
    });
  } catch (err) {
    console.error("[notification] write failed:", err);
  }
}

export async function notifyMany(paramsList: NotifyParams[]): Promise<void> {
  if (paramsList.length === 0) return;
  try {
    await db.insert(notifications).values(
      paramsList.map((p) => ({
        userId: p.userId,
        category: p.category,
        title: p.title,
        body: p.body,
        linkUrl: p.linkUrl ?? null,
        entityType: p.entityType ?? null,
        entityId: p.entityId ?? null,
      }))
    );
  } catch (err) {
    console.error("[notification] batch write failed:", err);
  }
}
