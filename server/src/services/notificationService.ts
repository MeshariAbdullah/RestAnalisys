import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

interface CreateNotificationInput {
  userId: number;
  type: string;
  title: string;
  titleAr?: string;
  body: string;
  bodyAr?: string;
  entityType?: string;
  entityId?: number;
  actionUrl?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  const [notification] = await db
    .insert(notifications)
    .values(input)
    .returning();
  return notification;
}

export async function notifyMultiple(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) return [];
  return db.insert(notifications).values(inputs).returning();
}

export const NOTIFICATION_TYPES = {
  ASSET_APPROVED: "asset_approved",
  ASSET_REJECTED: "asset_rejected",
  RENTAL_CREATED: "rental_created",
  RENTAL_CONFIRMED: "rental_confirmed",
  RENTAL_DELIVERED: "rental_delivered",
  RENTAL_RETURNED: "rental_returned",
  RENTAL_CLOSED: "rental_closed",
  RENTAL_CANCELLED: "rental_cancelled",
  DISPUTE_OPENED: "dispute_opened",
  DISPUTE_RESOLVED: "dispute_resolved",
  PAYOUT_RELEASED: "payout_released",
  INSPECTION_COMPLETE: "inspection_complete",
  SANAD_ISSUED: "sanad_issued",
  SANAD_EXECUTED: "sanad_executed",
  ALERT_CRITICAL: "alert_critical",
} as const;
