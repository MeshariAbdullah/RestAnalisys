import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

export async function createNotification(data: {
  userId: number;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: number;
  link?: string;
}) {
  try {
    await db.insert(notifications).values(data);
  } catch {
    // Non-critical — never let notification failures break primary flows
  }
}

export async function notifyUser(
  userId: number,
  type: string,
  title: string,
  body: string,
  opts?: { entityType?: string; entityId?: number; link?: string }
) {
  return createNotification({
    userId,
    type,
    title,
    body,
    ...opts,
  });
}

export async function notifyMultiple(
  userIds: number[],
  type: string,
  title: string,
  body: string,
  opts?: { entityType?: string; entityId?: number; link?: string }
) {
  try {
    if (userIds.length === 0) return;
    await db.insert(notifications).values(
      userIds.map((userId) => ({
        userId,
        type,
        title,
        body,
        ...opts,
      }))
    );
  } catch {
    // Non-critical
  }
}
