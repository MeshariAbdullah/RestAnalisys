/**
 * Notification service — dispatches user-facing notifications via email,
 * SMS, and in-app channels.
 *
 * Without credentials, logs notifications to console (dev mode).
 */

const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMS_API_KEY = process.env.SMS_API_KEY ?? "";

export type NotificationChannel = "email" | "sms" | "in_app";

export interface NotificationPayload {
  userId: number;
  channels: NotificationChannel[];
  templateKey: string;
  subject?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  data: Record<string, unknown>;
}

export type NotificationTemplate =
  | "rental_created"
  | "rental_confirmed"
  | "rental_delivered"
  | "rental_return_reminder"
  | "rental_closed"
  | "legal_signing_required"
  | "payment_captured"
  | "payment_refunded"
  | "payout_released"
  | "dispute_opened"
  | "dispute_resolved"
  | "asset_approved"
  | "asset_rejected"
  | "nafath_verified"
  | "sanad_issued"
  | "sanad_discharged"
  | "sanad_execution";

interface NotificationResult {
  sent: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
}

export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  for (const channel of payload.channels) {
    try {
      switch (channel) {
        case "email":
          results.push(await sendEmail(payload));
          break;
        case "sms":
          results.push(await sendSms(payload));
          break;
        case "in_app":
          results.push(await sendInApp(payload));
          break;
      }
    } catch (err) {
      results.push({
        sent: false,
        channel,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}

async function sendEmail(payload: NotificationPayload): Promise<NotificationResult> {
  if (!SMTP_HOST) {
    console.log(
      `[notification:email] DEV → userId=${payload.userId} template=${payload.templateKey} subject="${payload.subject ?? "N/A"}"`
    );
    return { sent: true, channel: "email", messageId: `DEV-EMAIL-${Date.now()}` };
  }

  throw new Error("Email production client not configured");
}

async function sendSms(payload: NotificationPayload): Promise<NotificationResult> {
  if (!SMS_API_KEY) {
    console.log(
      `[notification:sms] DEV → userId=${payload.userId} template=${payload.templateKey}`
    );
    return { sent: true, channel: "sms", messageId: `DEV-SMS-${Date.now()}` };
  }

  throw new Error("SMS production client not configured");
}

async function sendInApp(payload: NotificationPayload): Promise<NotificationResult> {
  console.log(
    `[notification:in_app] userId=${payload.userId} template=${payload.templateKey}`
  );
  return { sent: true, channel: "in_app", messageId: `INAPP-${Date.now()}` };
}

export async function notifyRentalEvent(
  userId: number,
  email: string,
  template: NotificationTemplate,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await sendNotification({
      userId,
      channels: ["email", "in_app"],
      templateKey: template,
      subject: formatSubject(template),
      recipientEmail: email,
      data,
    });
  } catch (err) {
    console.error(`[notification] Failed to notify userId=${userId}:`, err);
  }
}

function formatSubject(template: NotificationTemplate): string {
  const subjects: Record<NotificationTemplate, string> = {
    rental_created: "Your rental request has been created",
    rental_confirmed: "Your rental is confirmed",
    rental_delivered: "Your item has been delivered",
    rental_return_reminder: "Return reminder for your rental",
    rental_closed: "Your rental has been closed",
    legal_signing_required: "Legal commitment requires your signature",
    payment_captured: "Payment received",
    payment_refunded: "Refund processed",
    payout_released: "Your payout has been released",
    dispute_opened: "A dispute has been opened",
    dispute_resolved: "Your dispute has been resolved",
    asset_approved: "Your asset has been approved",
    asset_rejected: "Your asset submission was not approved",
    nafath_verified: "Identity verified via Nafath",
    sanad_issued: "Promissory note (Sanad) issued",
    sanad_discharged: "Promissory note (Sanad) discharged",
    sanad_execution: "Promissory note (Sanad) sent for execution",
  };
  return subjects[template] ?? template;
}
