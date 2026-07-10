import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

interface CreateNotification {
  userId: number;
  type: typeof notifications.$inferInsert["type"];
  title: string;
  message: string;
  linkUrl?: string;
  entityType?: string;
  entityId?: number;
}

export async function notify(data: CreateNotification) {
  const [row] = await db
    .insert(notifications)
    .values(data)
    .returning();
  return row;
}

export async function notifyMultiple(items: CreateNotification[]) {
  if (items.length === 0) return [];
  return db.insert(notifications).values(items).returning();
}
