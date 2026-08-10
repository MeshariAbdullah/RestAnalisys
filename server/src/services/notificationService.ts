import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

type NotificationType = typeof notifications.$inferInsert["type"];

interface NotifyParams {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: number;
}

export async function notify(params: NotifyParams): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      entityType: params.entityType,
      entityId: params.entityId,
    });
  } catch {
    // Never let notification failures break primary flows
  }
}

export async function notifyMultiple(paramsList: NotifyParams[]): Promise<void> {
  if (paramsList.length === 0) return;
  try {
    await db.insert(notifications).values(
      paramsList.map((p) => ({
        userId: p.userId,
        type: p.type,
        title: p.title,
        body: p.body,
        entityType: p.entityType,
        entityId: p.entityId,
      }))
    );
  } catch {
    // Never let notification failures break primary flows
  }
}
