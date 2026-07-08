import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

type NotificationType =
  | "rental_created"
  | "rental_signed"
  | "rental_paid"
  | "rental_delivered"
  | "rental_returned"
  | "rental_closed"
  | "rental_cancelled"
  | "asset_approved"
  | "asset_rejected"
  | "asset_inspection_complete"
  | "asset_valuation_response"
  | "asset_listed"
  | "dispute_opened"
  | "dispute_resolved"
  | "payout_released"
  | "sanad_issued"
  | "sanad_executed"
  | "alert_late_return"
  | "alert_high_risk"
  | "system";

export interface NotifyInput {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: number;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType,
      entityId: input.entityId,
    });
  } catch (err) {
    console.error("[notify] write failed:", err);
  }
}

export async function notifyMany(inputs: NotifyInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await db.insert(notifications).values(
      inputs.map((i) => ({
        userId: i.userId,
        type: i.type as any,
        title: i.title,
        body: i.body,
        entityType: i.entityType,
        entityId: i.entityId,
      }))
    );
  } catch (err) {
    console.error("[notify] batch write failed:", err);
  }
}
