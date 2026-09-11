import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

interface NotifyInput {
  userId: number;
  category: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: number;
  actionUrl?: string;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      channel: "in_app",
      category: input.category,
      title: input.title,
      body: input.body,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      actionUrl: input.actionUrl ?? null,
    });
  } catch (err) {
    console.error("[notification] write failed:", err);
  }
}

export async function notifyMultiple(inputs: NotifyInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await db.insert(notifications).values(
      inputs.map((input) => ({
        userId: input.userId,
        channel: "in_app" as const,
        category: input.category,
        title: input.title,
        body: input.body,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        actionUrl: input.actionUrl ?? null,
      }))
    );
  } catch (err) {
    console.error("[notification] batch write failed:", err);
  }
}
