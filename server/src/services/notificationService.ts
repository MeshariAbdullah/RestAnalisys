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
  | "payment_refunded"
  | "payout_released"
  | "dispute_opened"
  | "dispute_resolved"
  | "sanad_issued"
  | "sanad_executed"
  | "system";

export async function notify(opts: {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
}): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      entityType: opts.entityType,
      entityId: opts.entityId,
    });
  } catch {
    // Best-effort: never let notification failures break business logic
  }
}
