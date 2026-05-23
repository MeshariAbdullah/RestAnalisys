import { db } from "../db/index.js";
import { integrationEvents } from "../db/schema.js";

export type NotificationChannel = "email" | "sms" | "push";

export interface NotificationPayload {
  to: string;
  channel: NotificationChannel;
  templateKey: string;
  locale?: "en" | "ar";
  data: Record<string, unknown>;
}

const DEV_MODE = !process.env.EMAIL_API_KEY;

async function logIntegrationEvent(
  provider: string,
  eventType: string,
  payload: unknown
): Promise<void> {
  try {
    await db.insert(integrationEvents).values({
      provider,
      eventType,
      payloadJson: payload as object,
      processed: true,
      processedAt: new Date(),
    });
  } catch {
    // best effort
  }
}

export async function sendEmail(payload: NotificationPayload): Promise<{ messageId: string }> {
  const messageId = `dev-email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (DEV_MODE) {
    console.log(`[notification] EMAIL to=${payload.to} template=${payload.templateKey}`, payload.data);
    await logIntegrationEvent("email", "send", { ...payload, messageId, mode: "dev" });
    return { messageId };
  }

  // Production: integrate with SendGrid / SES / Mailgun
  await logIntegrationEvent("email", "send", { ...payload, messageId });
  return { messageId };
}

export async function sendSms(payload: NotificationPayload): Promise<{ messageId: string }> {
  const messageId = `dev-sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (DEV_MODE) {
    console.log(`[notification] SMS to=${payload.to} template=${payload.templateKey}`, payload.data);
    await logIntegrationEvent("sms", "send", { ...payload, messageId, mode: "dev" });
    return { messageId };
  }

  // Production: integrate with Unifonic / Twilio
  await logIntegrationEvent("sms", "send", { ...payload, messageId });
  return { messageId };
}

const TEMPLATES: Record<string, { subject: string; bodyTemplate: string }> = {
  "rental.created": {
    subject: "Rental Request #{reference}",
    bodyTemplate: "Your rental request {reference} for {assetTitle} has been created. Total: {total} SAR.",
  },
  "rental.confirmed": {
    subject: "Rental Confirmed #{reference}",
    bodyTemplate: "Your rental {reference} is confirmed and being prepared for delivery.",
  },
  "rental.delivered": {
    subject: "Item Delivered #{reference}",
    bodyTemplate: "Your rented item for {reference} has been delivered. Enjoy!",
  },
  "rental.return_reminder": {
    subject: "Return Reminder #{reference}",
    bodyTemplate: "Your rental {reference} is due for return on {endDate}. Please arrange return shipping.",
  },
  "rental.closed": {
    subject: "Rental Closed #{reference}",
    bodyTemplate: "Your rental {reference} has been closed. Outcome: {outcome}.",
  },
  "asset.approved": {
    subject: "Asset Approved: {title}",
    bodyTemplate: "Your asset \"{title}\" has been approved and is awaiting shipment to our warehouse.",
  },
  "asset.rejected": {
    subject: "Asset Submission Update: {title}",
    bodyTemplate: "Your asset \"{title}\" submission was not approved. Reason: {reason}.",
  },
  "asset.listed": {
    subject: "Asset Listed: {title}",
    bodyTemplate: "Your asset \"{title}\" is now live on the platform and available for rental.",
  },
  "payout.released": {
    subject: "Payout Released",
    bodyTemplate: "A payout of {amount} SAR has been released to your account.",
  },
  "dispute.opened": {
    subject: "Dispute Opened #{disputeId}",
    bodyTemplate: "A dispute has been opened for rental {reference}. Category: {category}.",
  },
  "dispute.resolved": {
    subject: "Dispute Resolved #{disputeId}",
    bodyTemplate: "Your dispute #{disputeId} has been resolved. Resolution: {resolution}.",
  },
};

export function getTemplate(key: string): { subject: string; bodyTemplate: string } | undefined {
  return TEMPLATES[key];
}

export async function notify(
  recipientEmail: string,
  templateKey: string,
  data: Record<string, unknown>,
  phone?: string
): Promise<void> {
  await sendEmail({
    to: recipientEmail,
    channel: "email",
    templateKey,
    data,
  });

  if (phone) {
    await sendSms({
      to: phone,
      channel: "sms",
      templateKey,
      data,
    });
  }
}
