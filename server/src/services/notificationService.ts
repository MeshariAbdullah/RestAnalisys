import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

export interface NotifyInput {
  userId: number;
  title: string;
  body: string;
  category: string;
  referenceType?: string;
  referenceId?: number;
  channel?: "in_app" | "email" | "sms";
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      channel: input.channel ?? "in_app",
      title: input.title,
      body: input.body,
      category: input.category,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
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
        channel: i.channel ?? ("in_app" as const),
        title: i.title,
        body: i.body,
        category: i.category,
        referenceType: i.referenceType,
        referenceId: i.referenceId,
      }))
    );
  } catch (err) {
    console.error("[notification] batch write failed:", err);
  }
}
