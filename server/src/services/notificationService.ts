import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import type { NewNotification } from "../db/schema.js";

export async function createNotification(
  input: Omit<NewNotification, "id" | "createdAt" | "read" | "readAt">
): Promise<void> {
  try {
    await db.insert(notifications).values(input);
  } catch (err) {
    console.error("[notification] write failed:", err);
  }
}

export async function notifyUser(
  userId: number,
  type: NewNotification["type"],
  title: string,
  body: string,
  opts?: {
    linkUrl?: string;
    relatedEntityType?: string;
    relatedEntityId?: number;
  }
): Promise<void> {
  await createNotification({
    userId,
    type,
    title,
    body,
    linkUrl: opts?.linkUrl,
    relatedEntityType: opts?.relatedEntityType,
    relatedEntityId: opts?.relatedEntityId,
  });
}
