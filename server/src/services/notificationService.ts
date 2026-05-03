import { db } from "../db/index.js";
import { integrationEvents } from "../db/schema.js";

type NotificationChannel = "email" | "sms" | "push";

interface NotificationPayload {
  channel: NotificationChannel;
  to: string;
  subject?: string;
  body: string;
  templateId?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationResult {
  success: boolean;
  provider: string;
  messageId: string;
  devMode: boolean;
}

const DEV_MODE = !process.env.SMTP_HOST && !process.env.SMS_API_KEY;

async function logIntegrationEvent(
  provider: string,
  eventType: string,
  payload: unknown,
  result: unknown
) {
  await db.insert(integrationEvents).values({
    provider,
    eventType,
    referenceId: `notif-${Date.now()}`,
    payloadJson: payload as object,
    processed: true,
    processedAt: new Date(),
  });
}

async function sendEmail(payload: NotificationPayload): Promise<NotificationResult> {
  if (DEV_MODE) {
    console.log(`[notification:email:dev] To: ${payload.to} | Subject: ${payload.subject} | Body: ${payload.body.slice(0, 100)}...`);
    const result: NotificationResult = {
      success: true,
      provider: "dev-console",
      messageId: `dev-email-${Date.now()}`,
      devMode: true,
    };
    await logIntegrationEvent("email", "send", payload, result);
    return result;
  }

  // Production: SMTP or transactional email service (SendGrid, SES, Mailgun)
  // Implementation would go here with process.env.SMTP_HOST, SMTP_PORT, etc.
  throw new Error("Production email not configured — set SMTP_HOST in .env");
}

async function sendSms(payload: NotificationPayload): Promise<NotificationResult> {
  if (DEV_MODE) {
    console.log(`[notification:sms:dev] To: ${payload.to} | Body: ${payload.body.slice(0, 100)}...`);
    const result: NotificationResult = {
      success: true,
      provider: "dev-console",
      messageId: `dev-sms-${Date.now()}`,
      devMode: true,
    };
    await logIntegrationEvent("sms", "send", payload, result);
    return result;
  }

  // Production: Twilio, Unifonic, or Taqnyat for Saudi numbers
  throw new Error("Production SMS not configured — set SMS_API_KEY in .env");
}

export async function sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
  switch (payload.channel) {
    case "email":
      return sendEmail(payload);
    case "sms":
      return sendSms(payload);
    case "push":
      console.log(`[notification:push:dev] To: ${payload.to} | Body: ${payload.body.slice(0, 100)}...`);
      return { success: true, provider: "dev-console", messageId: `dev-push-${Date.now()}`, devMode: true };
    default:
      throw new Error(`Unknown notification channel: ${payload.channel}`);
  }
}

export async function notifyRentalCreated(renterEmail: string, rentalRef: string) {
  return sendNotification({
    channel: "email",
    to: renterEmail,
    subject: `MLR — Rental ${rentalRef} Created`,
    body: `Your rental ${rentalRef} has been created. Please sign the legal commitment and complete payment to confirm your booking.`,
    templateId: "rental_created",
  });
}

export async function notifyRentalConfirmed(renterEmail: string, rentalRef: string) {
  return sendNotification({
    channel: "email",
    to: renterEmail,
    subject: `MLR — Rental ${rentalRef} Confirmed`,
    body: `Payment received! Your rental ${rentalRef} is now confirmed. Our operations team will schedule delivery.`,
    templateId: "rental_confirmed",
  });
}

export async function notifyDeliveryScheduled(renterEmail: string, renterPhone: string, rentalRef: string) {
  await sendNotification({
    channel: "email",
    to: renterEmail,
    subject: `MLR — Delivery Scheduled for ${rentalRef}`,
    body: `Your luxury item for rental ${rentalRef} is on its way! You'll receive tracking details shortly.`,
    templateId: "delivery_scheduled",
  });
  if (renterPhone) {
    await sendNotification({
      channel: "sms",
      to: renterPhone,
      body: `MLR: Your item (${rentalRef}) is out for delivery. Track via your dashboard.`,
    });
  }
}

export async function notifyLateReturn(renterEmail: string, renterPhone: string, rentalRef: string) {
  await sendNotification({
    channel: "email",
    to: renterEmail,
    subject: `MLR — Return Overdue: ${rentalRef}`,
    body: `Your rental ${rentalRef} is past the return date. Please return the item immediately to avoid penalties.`,
    templateId: "late_return",
  });
  if (renterPhone) {
    await sendNotification({
      channel: "sms",
      to: renterPhone,
      body: `MLR: Rental ${rentalRef} is overdue. Please initiate return to avoid penalties.`,
    });
  }
}

export async function notifyOwnerPayout(ownerEmail: string, rentalRef: string, netSar: string) {
  return sendNotification({
    channel: "email",
    to: ownerEmail,
    subject: `MLR — Payout Processed for ${rentalRef}`,
    body: `Your payout of ${netSar} SAR for rental ${rentalRef} has been processed. Funds will arrive in your bank account within 1-3 business days.`,
    templateId: "owner_payout",
  });
}

export async function notifySanadExecution(renterEmail: string, rentalRef: string) {
  return sendNotification({
    channel: "email",
    to: renterEmail,
    subject: `MLR — Legal Action: Sanad Execution for ${rentalRef}`,
    body: `Due to unresolved issues with rental ${rentalRef}, your Sanad (promissory note) has been submitted for execution through the Najiz platform. Please contact support immediately.`,
    templateId: "sanad_execution",
  });
}
