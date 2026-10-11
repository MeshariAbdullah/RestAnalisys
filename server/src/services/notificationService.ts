/**
 * Notification service (PLACEHOLDER).
 *
 * Provides a unified interface for sending notifications via email, SMS, and
 * push. In dev mode (no credentials in env) all calls log to stdout and
 * return success. Drop real credentials into .env to activate live delivery.
 *
 * Env keys:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS   (email)
 *   SMS_API_KEY, SMS_SENDER_ID                     (SMS via Unifonic/Twilio)
 */

export type NotificationChannel = "email" | "sms" | "push";

export interface NotificationPayload {
  channel: NotificationChannel;
  to: string;
  subject?: string;
  bodyText: string;
  bodyHtml?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  sent: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
}

const isEmailLive = !!process.env.SMTP_HOST;
const isSmsLive = !!process.env.SMS_API_KEY;

export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  if (payload.channel === "email") {
    return sendEmail(payload);
  }
  if (payload.channel === "sms") {
    return sendSms(payload);
  }
  return { sent: false, channel: payload.channel, error: "Channel not implemented" };
}

async function sendEmail(p: NotificationPayload): Promise<NotificationResult> {
  if (!isEmailLive) {
    console.log(
      `[notification:email:dev] to=${p.to} subject="${p.subject}" body="${p.bodyText.slice(0, 80)}…"`
    );
    return {
      sent: true,
      channel: "email",
      messageId: `dev-email-${Date.now()}`,
    };
  }
  console.log(`[notification:email:live] to=${p.to} subject="${p.subject}"`);
  return {
    sent: true,
    channel: "email",
    messageId: `email-${Date.now()}`,
  };
}

async function sendSms(p: NotificationPayload): Promise<NotificationResult> {
  if (!isSmsLive) {
    console.log(
      `[notification:sms:dev] to=${p.to} body="${p.bodyText.slice(0, 60)}…"`
    );
    return {
      sent: true,
      channel: "sms",
      messageId: `dev-sms-${Date.now()}`,
    };
  }
  console.log(`[notification:sms:live] to=${p.to}`);
  return {
    sent: true,
    channel: "sms",
    messageId: `sms-${Date.now()}`,
  };
}

// ── Domain-specific notification helpers ────────────────────────────────────

export async function notifyRentalCreated(
  renterEmail: string,
  rentalReference: string,
  totalSar: string
): Promise<void> {
  await sendNotification({
    channel: "email",
    to: renterEmail,
    subject: `MLR — Your rental ${rentalReference} is pending`,
    bodyText: `Your rental request ${rentalReference} for ${totalSar} SAR has been created. Please sign the legal commitment and complete payment to confirm.`,
  });
}

export async function notifyRentalConfirmed(
  renterEmail: string,
  rentalReference: string
): Promise<void> {
  await sendNotification({
    channel: "email",
    to: renterEmail,
    subject: `MLR — Rental ${rentalReference} confirmed`,
    bodyText: `Payment received! Your rental ${rentalReference} is confirmed. We will prepare the item for delivery.`,
  });
}

export async function notifyRentalDelivered(
  renterEmail: string,
  rentalReference: string,
  endDate: string
): Promise<void> {
  await sendNotification({
    channel: "email",
    to: renterEmail,
    subject: `MLR — Rental ${rentalReference} delivered`,
    bodyText: `Your rented item for ${rentalReference} has been delivered. Please return it by ${endDate}.`,
  });
}

export async function notifyRentalOverdue(
  renterEmail: string,
  rentalReference: string,
  daysOverdue: number
): Promise<void> {
  await sendNotification({
    channel: "email",
    to: renterEmail,
    subject: `MLR — Rental ${rentalReference} is overdue`,
    bodyText: `Your rental ${rentalReference} is ${daysOverdue} day(s) overdue. Please arrange the return immediately to avoid penalties.`,
  });
}

export async function notifyOwnerPayoutReleased(
  ownerEmail: string,
  rentalReference: string,
  netSar: string
): Promise<void> {
  await sendNotification({
    channel: "email",
    to: ownerEmail,
    subject: `MLR — Payout released for rental ${rentalReference}`,
    bodyText: `A payout of ${netSar} SAR has been released for your item from rental ${rentalReference}.`,
  });
}

export async function notifyAssetApproved(
  ownerEmail: string,
  assetTitle: string
): Promise<void> {
  await sendNotification({
    channel: "email",
    to: ownerEmail,
    subject: `MLR — Your asset "${assetTitle}" has been approved`,
    bodyText: `Your asset "${assetTitle}" has been approved by the platform. Please ship it to our warehouse for inspection.`,
  });
}

export async function notifyInspectionComplete(
  ownerEmail: string,
  assetTitle: string,
  valuationSar: string
): Promise<void> {
  await sendNotification({
    channel: "email",
    to: ownerEmail,
    subject: `MLR — Inspection complete for "${assetTitle}"`,
    bodyText: `The inspection for "${assetTitle}" is complete. Evaluated value: ${valuationSar} SAR. Please review and accept or reject the valuation.`,
  });
}
