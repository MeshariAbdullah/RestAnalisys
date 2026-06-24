import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

interface NotifyInput {
  userId: number;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    });
  } catch (err) {
    console.error("[notify] write failed:", err);
  }
}

export async function notifyMultiple(inputs: NotifyInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await db.insert(notifications).values(
      inputs.map((input) => ({
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      }))
    );
  } catch (err) {
    console.error("[notify] batch write failed:", err);
  }
}
