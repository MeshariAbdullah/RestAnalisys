import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

type NotificationType =
  | "rental_created"
  | "rental_confirmed"
  | "rental_delivered"
  | "rental_returned"
  | "rental_closed"
  | "rental_cancelled"
  | "asset_approved"
  | "asset_rejected"
  | "asset_listed"
  | "inspection_complete"
  | "payment_captured"
  | "payout_released"
  | "dispute_opened"
  | "dispute_resolved"
  | "sanad_issued"
  | "extension_requested"
  | "extension_approved"
  | "extension_rejected"
  | "system";

export async function notify(params: {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
}) {
  await db.insert(notifications).values({
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    relatedEntityType: params.relatedEntityType,
    relatedEntityId: params.relatedEntityId,
  });
}

export async function notifyMany(
  userIds: number[],
  params: Omit<Parameters<typeof notify>[0], "userId">
) {
  if (userIds.length === 0) return;
  await db.insert(notifications).values(
    userIds.map((userId) => ({
      userId,
      type: params.type,
      title: params.title,
      body: params.body,
      relatedEntityType: params.relatedEntityType,
      relatedEntityId: params.relatedEntityId,
    }))
  );
}
