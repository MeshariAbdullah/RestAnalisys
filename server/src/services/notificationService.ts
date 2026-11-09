import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

type NotificationType =
  | "rental_created"
  | "rental_status_changed"
  | "asset_approved"
  | "asset_rejected"
  | "asset_published"
  | "payment_captured"
  | "payout_released"
  | "dispute_opened"
  | "dispute_resolved"
  | "sanad_issued"
  | "inspection_complete"
  | "legal_signed";

interface NotifyParams {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
}

export async function notify(params: NotifyParams): Promise<void> {
  await db.insert(notifications).values({
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    entityType: params.entityType,
    entityId: params.entityId,
  });
}

export async function notifyMany(paramsList: NotifyParams[]): Promise<void> {
  if (paramsList.length === 0) return;
  await db.insert(notifications).values(
    paramsList.map((p) => ({
      userId: p.userId,
      type: p.type,
      title: p.title,
      message: p.message,
      entityType: p.entityType,
      entityId: p.entityId,
    }))
  );
}
