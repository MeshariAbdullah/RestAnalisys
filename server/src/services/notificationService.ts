/**
 * In-app notification service.
 *
 * Stores notifications per user and exposes a simple read/mark-read API.
 * In production this would fan out to push notifications, email, and SMS via
 * third-party providers — the DB-backed queue here ensures nothing is lost
 * regardless of delivery channel availability.
 */

import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

export type NotificationType =
  | "rental_created"
  | "rental_signed"
  | "rental_paid"
  | "rental_fulfilled"
  | "rental_delivered"
  | "rental_returned"
  | "rental_closed"
  | "rental_cancelled"
  | "rental_dispute"
  | "rental_enforcement"
  | "asset_approved"
  | "asset_rejected"
  | "asset_listed"
  | "asset_inspection_complete"
  | "payout_released"
  | "payout_paid"
  | "risk_alert"
  | "sanad_issued"
  | "sanad_discharged"
  | "system";

export interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: number;
  channel?: "in_app" | "email" | "sms" | "push";
}

export async function createNotification(input: CreateNotificationInput) {
  const [row] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      channel: input.channel ?? "in_app",
    })
    .returning();
  return row;
}

export async function notifyRentalParties(opts: {
  renterId: number;
  ownerId: number;
  type: NotificationType;
  title: string;
  renterBody: string;
  ownerBody: string;
  entityType: string;
  entityId: number;
}) {
  await Promise.all([
    createNotification({
      userId: opts.renterId,
      type: opts.type,
      title: opts.title,
      body: opts.renterBody,
      entityType: opts.entityType,
      entityId: opts.entityId,
    }),
    createNotification({
      userId: opts.ownerId,
      type: opts.type,
      title: opts.title,
      body: opts.ownerBody,
      entityType: opts.entityType,
      entityId: opts.entityId,
    }),
  ]);
}
