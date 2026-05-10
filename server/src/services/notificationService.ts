/**
 * Notification service — centralized dispatch for email, SMS, and in-app
 * notifications across the platform lifecycle.
 *
 * In dev mode (no SMTP/SMS credentials), notifications are logged to console.
 * Production mode will use a transactional email provider (e.g. Resend, SES)
 * and SMS gateway (e.g. Unifonic for KSA).
 */

import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMS_API_KEY = process.env.SMS_API_KEY ?? "";

export type NotificationChannel = "email" | "sms" | "in_app";
export type NotificationType =
  | "rental_created"
  | "legal_signing_required"
  | "payment_received"
  | "asset_shipped"
  | "asset_delivered"
  | "return_reminder"
  | "rental_closed"
  | "dispute_opened"
  | "dispute_resolved"
  | "sanad_issued"
  | "valuation_ready"
  | "payout_released"
  | "account_blocked";

export interface SendNotificationInput {
  userId: number;
  type: NotificationType;
  channel: NotificationChannel;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export async function sendNotification(input: SendNotificationInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      channel: input.channel,
      subject: input.subject,
      body: input.body,
      metadataJson: (input.metadata as object) ?? null,
    });
  } catch (err) {
    console.error("[notification] DB write failed:", err);
  }

  if (input.channel === "email") {
    await sendEmail(input);
  } else if (input.channel === "sms") {
    await sendSms(input);
  }
}

async function sendEmail(input: SendNotificationInput): Promise<void> {
  if (!SMTP_HOST) {
    console.log(`[notification:email] TO user:${input.userId} SUBJ: ${input.subject}`);
    return;
  }
  throw new Error("Email transport not configured");
}

async function sendSms(input: SendNotificationInput): Promise<void> {
  if (!SMS_API_KEY) {
    console.log(`[notification:sms] TO user:${input.userId} BODY: ${input.body.slice(0, 80)}`);
    return;
  }
  throw new Error("SMS transport not configured");
}

export async function notifyRentalCreated(renterId: number, reference: string): Promise<void> {
  await sendNotification({
    userId: renterId,
    type: "rental_created",
    channel: "in_app",
    subject: "Rental request created",
    body: `Your rental ${reference} has been created. Please review and sign the legal commitment.`,
    metadata: { reference },
  });
}

export async function notifyPaymentReceived(
  renterId: number,
  reference: string,
  amountHalalas: number
): Promise<void> {
  const sar = (amountHalalas / 100).toFixed(2);
  await sendNotification({
    userId: renterId,
    type: "payment_received",
    channel: "in_app",
    subject: "Payment confirmed",
    body: `Payment of ${sar} SAR for rental ${reference} has been confirmed.`,
    metadata: { reference, amountHalalas },
  });
}

export async function notifyRentalClosed(
  renterId: number,
  reference: string,
  outcome: string
): Promise<void> {
  await sendNotification({
    userId: renterId,
    type: "rental_closed",
    channel: "in_app",
    subject: "Rental closed",
    body: `Rental ${reference} has been closed with outcome: ${outcome}.`,
    metadata: { reference, outcome },
  });
}

export async function notifyValuationReady(
  ownerId: number,
  assetTitle: string,
  valueSar: number
): Promise<void> {
  await sendNotification({
    userId: ownerId,
    type: "valuation_ready",
    channel: "in_app",
    subject: "Valuation complete",
    body: `Your asset "${assetTitle}" has been valued at ${valueSar.toFixed(2)} SAR. Please review and approve.`,
    metadata: { assetTitle, valueSar },
  });
}

export async function notifyDisputeOpened(
  userId: number,
  rentalReference: string,
  category: string
): Promise<void> {
  await sendNotification({
    userId,
    type: "dispute_opened",
    channel: "in_app",
    subject: "Dispute opened",
    body: `A ${category} dispute has been opened for rental ${rentalReference}.`,
    metadata: { rentalReference, category },
  });
}
