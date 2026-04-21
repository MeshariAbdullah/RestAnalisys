import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

interface NotifyParams {
  userId: number;
  type: "rental_status" | "asset_status" | "payment" | "legal" | "system";
  title: string;
  body: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export async function notify(params: NotifyParams): Promise<void> {
  await db.insert(notifications).values({
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    link: params.link ?? null,
    metadata: params.metadata ?? null,
  });
}

export async function notifyMultiple(
  userIds: number[],
  params: Omit<NotifyParams, "userId">
): Promise<void> {
  if (userIds.length === 0) return;
  await db.insert(notifications).values(
    userIds.map((userId) => ({
      userId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link ?? null,
      metadata: params.metadata ?? null,
    }))
  );
}
