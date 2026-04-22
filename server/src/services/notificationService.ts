import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

export interface NotifyInput {
  userId: number;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: number;
}

export async function notify(input: NotifyInput): Promise<void> {
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
        body: i.body,
        entityType: i.entityType ?? null,
        entityId: i.entityId ?? null,
      }))
    );
  } catch (err) {
    console.error("[notification] batch write failed:", err);
  }
}
