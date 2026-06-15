import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

export type NotificationChannel = "email" | "sms" | "in_app";
export type NotificationType =
  | "rental_created"
  | "rental_confirmed"
  | "rental_delivered"
  | "rental_returned"
  | "rental_closed"
  | "rental_cancelled"
  | "payment_captured"
  | "payment_refunded"
  | "payout_released"
  | "dispute_opened"
  | "dispute_resolved"
  | "sanad_issued"
  | "sanad_executed"
  | "asset_approved"
  | "asset_rejected"
  | "inspection_complete"
  | "late_return_warning"
  | "account_blocked";

interface NotificationPayload {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  channels: NotificationChannel[];
  metadata?: Record<string, unknown>;
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      channelsJson: payload.channels as unknown as object,
      metadataJson: (payload.metadata as object) ?? null,
      status: "pending",
    });

    for (const channel of payload.channels) {
      switch (channel) {
        case "email":
          await sendEmail(payload);
          break;
        case "sms":
          await sendSms(payload);
          break;
        case "in_app":
          break;
      }
    }
  } catch (err) {
    console.error("[notification] send failed:", err);
  }
}

async function sendEmail(payload: NotificationPayload): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[notification:email] DEV MODE — to userId=${payload.userId}: ${payload.title}`);
    return;
  }
  // Production: integrate SendGrid / AWS SES here
  console.log(`[notification:email] Would send to userId=${payload.userId}: ${payload.title}`);
}

async function sendSms(payload: NotificationPayload): Promise<void> {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.log(`[notification:sms] DEV MODE — to userId=${payload.userId}: ${payload.title}`);
    return;
  }
  // Production: integrate Twilio here
  console.log(`[notification:sms] Would send to userId=${payload.userId}: ${payload.title}`);
}

export async function notifyRentalCreated(renterId: number, reference: string): Promise<void> {
  await sendNotification({
    userId: renterId,
    type: "rental_created",
    title: "Rental Created",
    body: `Your rental ${reference} has been created. Please sign the legal commitment to proceed.`,
    channels: ["in_app", "email"],
    metadata: { reference },
  });
}

export async function notifyRentalConfirmed(renterId: number, ownerId: number, reference: string): Promise<void> {
  await sendNotification({
    userId: renterId,
    type: "rental_confirmed",
    title: "Rental Confirmed",
    body: `Your rental ${reference} has been confirmed and will be prepared for delivery.`,
    channels: ["in_app", "email"],
    metadata: { reference },
  });
  await sendNotification({
    userId: ownerId,
    type: "rental_confirmed",
    title: "Your Asset Has Been Rented",
    body: `Your asset has been rented (ref: ${reference}). You will receive payout after the rental closes.`,
    channels: ["in_app", "email"],
    metadata: { reference },
  });
}

export async function notifyPaymentRefunded(userId: number, amountHalalas: number): Promise<void> {
  const sar = (amountHalalas / 100).toFixed(2);
  await sendNotification({
    userId,
    type: "payment_refunded",
    title: "Payment Refunded",
    body: `A refund of ${sar} SAR has been processed to your account.`,
    channels: ["in_app", "email"],
    metadata: { amountHalalas },
  });
}

export async function notifyLateReturn(renterId: number, reference: string, daysLate: number): Promise<void> {
  await sendNotification({
    userId: renterId,
    type: "late_return_warning",
    title: "Late Return Warning",
    body: `Your rental ${reference} is ${daysLate} day(s) overdue. Please return the item immediately to avoid penalties.`,
    channels: ["in_app", "email", "sms"],
    metadata: { reference, daysLate },
  });
}

export async function notifyDisputeOpened(userId: number, disputeId: number): Promise<void> {
  await sendNotification({
    userId,
    type: "dispute_opened",
    title: "Dispute Opened",
    body: `A dispute (ID: ${disputeId}) has been filed. Our team will review it within 48 hours.`,
    channels: ["in_app", "email"],
    metadata: { disputeId },
  });
}

export async function notifyAssetApproved(ownerId: number, assetTitle: string): Promise<void> {
  await sendNotification({
    userId: ownerId,
    type: "asset_approved",
    title: "Asset Approved",
    body: `Your asset "${assetTitle}" has been approved. Please ship it to our warehouse for inspection.`,
    channels: ["in_app", "email"],
    metadata: { assetTitle },
  });
}

export async function notifyAssetRejected(ownerId: number, assetTitle: string, reason: string): Promise<void> {
  await sendNotification({
    userId: ownerId,
    type: "asset_rejected",
    title: "Asset Submission Rejected",
    body: `Your asset "${assetTitle}" was not accepted. Reason: ${reason}`,
    channels: ["in_app", "email"],
    metadata: { assetTitle, reason },
  });
}
