import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

export async function notify(
  userId: number,
  type: string,
  title: string,
  body?: string,
  linkUrl?: string
): Promise<void> {
  await db.insert(notifications).values({ userId, type, title, body, linkUrl });
}

export async function notifyMany(
  userIds: number[],
  type: string,
  title: string,
  body?: string,
  linkUrl?: string
): Promise<void> {
  if (userIds.length === 0) return;
  await db.insert(notifications).values(
    userIds.map((userId) => ({ userId, type, title, body, linkUrl }))
  );
}
