import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

type NotificationType = typeof notifications.$inferInsert["type"];

interface NotifyInput {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
  meta?: Record<string, unknown>;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
      metaJson: (input.meta as object) ?? null,
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
        type: i.type,
        title: i.title,
        message: i.message,
        entityType: i.entityType,
        entityId: i.entityId,
        metaJson: (i.meta as object) ?? null,
      }))
    );
  } catch (err) {
    console.error("[notification] batch write failed:", err);
  }
}
