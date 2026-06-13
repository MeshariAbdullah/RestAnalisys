import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

interface CreateNotification {
  userId: number;
  type: string;
  title: string;
  body: string;
  linkUrl?: string;
  meta?: Record<string, unknown>;
}

export async function notify(input: CreateNotification): Promise<void> {
  await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    linkUrl: input.linkUrl ?? null,
    metaJson: input.meta ?? null,
  });
}

export async function notifyMany(inputs: CreateNotification[]): Promise<void> {
  if (inputs.length === 0) return;
  await db.insert(notifications).values(
    inputs.map((n) => ({
      userId: n.userId,
      type: n.type,
      title: n.title,
      body: n.body,
      linkUrl: n.linkUrl ?? null,
      metaJson: n.meta ?? null,
    }))
  );
}
