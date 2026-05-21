import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

export interface NotifyInput {
  userId: number;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      linkUrl: input.linkUrl ?? null,
    });
  } catch {
    // Non-critical: never fail the primary flow
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
        linkUrl: i.linkUrl ?? null,
      }))
    );
  } catch {
    // Non-critical
  }
}
