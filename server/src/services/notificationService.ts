import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

interface NotifyParams {
  userId: number;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: number;
}

export async function notify(params: NotifyParams): Promise<void> {
  await db.insert(notifications).values(params);
}

export async function notifyMany(items: NotifyParams[]): Promise<void> {
  if (items.length === 0) return;
  await db.insert(notifications).values(items);
}
