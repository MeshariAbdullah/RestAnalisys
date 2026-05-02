import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

export interface CreateNotificationInput {
  userId: number;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: number;
}

export async function notify(input: CreateNotificationInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    });
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}

export async function notifyMany(inputs: CreateNotificationInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await db.insert(notifications).values(
      inputs.map((i) => ({
        userId: i.userId,
        type: i.type,
        title: i.title,
        body: i.body,
        entityType: i.entityType ?? null,
        entityId: i.entityId ?? null,
      }))
    );
  } catch (err) {
    console.error("[notify] batch failed:", err);
  }
}
