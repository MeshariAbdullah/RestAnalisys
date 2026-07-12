import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

export interface NotifyInput {
  userId: number;
  type: string;
  title: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  actionUrl?: string;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      channel: "in_app",
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      actionUrl: input.actionUrl,
    });
  } catch (err) {
    console.error("[notification] write failed:", err);
  }
}

export async function notifyMany(inputs: NotifyInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await db.insert(notifications).values(
      inputs.map((input) => ({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        channel: "in_app" as const,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        actionUrl: input.actionUrl,
      }))
    );
  } catch (err) {
    console.error("[notification] bulk write failed:", err);
  }
}

export const NotificationTypes = {
  ASSET_APPROVED: "asset.approved",
  ASSET_REJECTED: "asset.rejected",
  ASSET_INSPECTION_COMPLETE: "asset.inspection_complete",
  RENTAL_CREATED: "rental.created",
  RENTAL_CONFIRMED: "rental.confirmed",
  RENTAL_DELIVERED: "rental.delivered",
  RENTAL_RETURNED: "rental.returned",
  RENTAL_CLOSED: "rental.closed",
  RENTAL_CANCELLED: "rental.cancelled",
  RENTAL_LATE_RETURN: "rental.late_return",
  LEGAL_SIGNED: "legal.signed",
  PAYMENT_CAPTURED: "payment.captured",
  PAYMENT_REFUNDED: "payment.refunded",
  PAYOUT_RELEASED: "payout.released",
  DISPUTE_OPENED: "dispute.opened",
  DISPUTE_RESOLVED: "dispute.resolved",
  SANAD_ISSUED: "sanad.issued",
  SANAD_EXECUTION: "sanad.execution",
} as const;
