import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import type { NewNotification } from "../db/schema.js";

export async function notify(input: Omit<NewNotification, "id" | "createdAt" | "read" | "readAt">): Promise<void> {
  try {
    await db.insert(notifications).values(input);
  } catch (err) {
    console.error("[notification] write failed:", err);
  }
}

export async function notifyMany(
  userIds: number[],
  base: Omit<NewNotification, "id" | "createdAt" | "read" | "readAt" | "userId">
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    await db.insert(notifications).values(
      userIds.map((userId) => ({ ...base, userId }))
    );
  } catch (err) {
    console.error("[notification] bulk write failed:", err);
  }
}
