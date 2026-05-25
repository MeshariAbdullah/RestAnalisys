import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

interface CreateNotificationInput {
  userId: number;
  type: typeof notifications.$inferInsert["type"];
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
  metadata?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? undefined,
      metadata: (input.metadata as object) ?? null,
    });
  } catch (err) {
    console.error("[notification] write failed:", err);
  }
}

export async function notifyMultiple(inputs: CreateNotificationInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await db.insert(notifications).values(
      inputs.map((input) => ({
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? undefined,
        metadata: (input.metadata as object) ?? null,
      }))
    );
  } catch (err) {
    console.error("[notification] batch write failed:", err);
  }
}
