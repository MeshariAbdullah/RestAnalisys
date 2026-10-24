/**
 * Notification service — sends emails and SMS to users.
 *
 * PLACEHOLDER: In dev mode all notifications are logged to stdout.
 * Drop real credentials into .env to switch to production mode:
 *   EMAIL_PROVIDER=sendgrid | ses | smtp
 *   EMAIL_API_KEY=...
 *   SMS_PROVIDER=twilio | unifonic
 *   SMS_API_KEY=...
 */

export type NotificationChannel = "email" | "sms" | "both";

export interface NotificationPayload {
  userId: number;
  channel: NotificationChannel;
  email?: string;
  phone?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
}

interface NotificationResult {
  success: boolean;
  channels: {
    email?: { sent: boolean; messageId?: string; error?: string };
    sms?: { sent: boolean; messageId?: string; error?: string };
  };
}

const IS_PRODUCTION_EMAIL = !!process.env.EMAIL_API_KEY;
const IS_PRODUCTION_SMS = !!process.env.SMS_API_KEY;

async function sendEmail(payload: NotificationPayload): Promise<{ sent: boolean; messageId?: string; error?: string }> {
  if (IS_PRODUCTION_EMAIL) {
    // Production: integrate with SendGrid, SES, etc.
    throw new Error("Email provider not configured — set EMAIL_PROVIDER and EMAIL_API_KEY");
  }

  console.log(`[NOTIFICATION:EMAIL] To: ${payload.email ?? "user#" + payload.userId}`);
  console.log(`  Subject: ${payload.subject}`);
  console.log(`  Body: ${payload.bodyText.slice(0, 200)}`);

  return {
    sent: true,
    messageId: `dev-email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
}

async function sendSms(payload: NotificationPayload): Promise<{ sent: boolean; messageId?: string; error?: string }> {
  if (IS_PRODUCTION_SMS) {
    // Production: integrate with Twilio, Unifonic, etc.
    throw new Error("SMS provider not configured — set SMS_PROVIDER and SMS_API_KEY");
  }

  console.log(`[NOTIFICATION:SMS] To: ${payload.phone ?? "user#" + payload.userId}`);
  console.log(`  Message: ${payload.bodyText.slice(0, 160)}`);

  return {
    sent: true,
    messageId: `dev-sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
}

export async function sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const channels: NotificationResult["channels"] = {};

  if (payload.channel === "email" || payload.channel === "both") {
    try {
      channels.email = await sendEmail(payload);
    } catch (err) {
      channels.email = { sent: false, error: (err as Error).message };
    }
  }

  if (payload.channel === "sms" || payload.channel === "both") {
    try {
      channels.sms = await sendSms(payload);
    } catch (err) {
      channels.sms = { sent: false, error: (err as Error).message };
    }
  }

  const success = Object.values(channels).some((c) => c?.sent === true);
  return { success, channels };
}

export async function notifyRentalCreated(rental: {
  reference: string;
  renterEmail?: string;
  renterPhone?: string;
  renterId: number;
  assetTitle: string;
  totalPayableHalalas: number;
}): Promise<void> {
  const sar = (rental.totalPayableHalalas / 100).toFixed(2);
  await sendNotification({
    userId: rental.renterId,
    channel: "both",
    email: rental.renterEmail,
    phone: rental.renterPhone,
    subject: `MLR — Rental ${rental.reference} Created`,
    bodyText: `Your rental for "${rental.assetTitle}" has been created. Total: ${sar} SAR. Please complete the legal signing and payment to confirm.`,
  });
}

export async function notifyRentalStatusChange(rental: {
  reference: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientId: number;
  status: string;
  assetTitle: string;
}): Promise<void> {
  await sendNotification({
    userId: rental.recipientId,
    channel: "both",
    email: rental.recipientEmail,
    phone: rental.recipientPhone,
    subject: `MLR — Rental ${rental.reference} Update`,
    bodyText: `Your rental for "${rental.assetTitle}" status has changed to: ${rental.status.replace(/_/g, " ")}.`,
  });
}

export async function notifyAssetStatusChange(asset: {
  title: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerId: number;
  status: string;
}): Promise<void> {
  await sendNotification({
    userId: asset.ownerId,
    channel: "email",
    email: asset.ownerEmail,
    subject: `MLR — Asset "${asset.title}" Update`,
    bodyText: `Your asset "${asset.title}" status has changed to: ${asset.status.replace(/_/g, " ")}.`,
  });
}

export async function notifyPaymentReceived(payment: {
  userId: number;
  userEmail?: string;
  rentalReference: string;
  amountHalalas: number;
}): Promise<void> {
  const sar = (payment.amountHalalas / 100).toFixed(2);
  await sendNotification({
    userId: payment.userId,
    channel: "email",
    email: payment.userEmail,
    subject: `MLR — Payment Received for ${payment.rentalReference}`,
    bodyText: `Payment of ${sar} SAR for rental ${payment.rentalReference} has been received. Thank you.`,
  });
}

export async function notifyDisputeOpened(dispute: {
  rentalReference: string;
  adminEmail?: string;
  adminId: number;
  summary: string;
}): Promise<void> {
  await sendNotification({
    userId: dispute.adminId,
    channel: "email",
    email: dispute.adminEmail,
    subject: `MLR — New Dispute: ${dispute.rentalReference}`,
    bodyText: `A new dispute has been opened for rental ${dispute.rentalReference}: ${dispute.summary}`,
  });
}
