import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import type { NewNotification } from "../db/schema.js";

type NotificationType = NewNotification["type"];

interface NotifyParams {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
  metadata?: Record<string, unknown>;
}

export async function notify(params: NotifyParams): Promise<void> {
  await db.insert(notifications).values({
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    entityType: params.entityType,
    entityId: params.entityId,
    metadataJson: params.metadata as object,
  });
}

export async function notifyMany(
  userIds: number[],
  params: Omit<NotifyParams, "userId">
): Promise<void> {
  if (userIds.length === 0) return;
  await db.insert(notifications).values(
    userIds.map((userId) => ({
      userId,
      type: params.type,
      title: params.title,
      message: params.message,
      entityType: params.entityType,
      entityId: params.entityId,
      metadataJson: params.metadata as object,
    }))
  );
}
