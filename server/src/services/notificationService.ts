import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export type NotificationChannel = "email" | "sms" | "push";
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
  | "asset_approved"
  | "asset_rejected"
  | "asset_listed"
  | "inspection_complete"
  | "valuation_proposed"
  | "dispute_opened"
  | "dispute_resolved"
  | "sanad_issued"
  | "sanad_maturity_warning"
  | "late_return_warning";

interface NotificationPayload {
  type: NotificationType;
  recipientUserId: number;
  channels?: NotificationChannel[];
  data: Record<string, unknown>;
}

interface NotificationResult {
  sent: boolean;
  channels: NotificationChannel[];
  messageId?: string;
}

const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@mlr.sa";
const EMAIL_API_KEY = process.env.EMAIL_API_KEY ?? "";
const SMS_API_KEY = process.env.SMS_API_KEY ?? "";

const templates: Record<NotificationType, { subject: string; body: string }> = {
  rental_created: {
    subject: "Rental Request Created - {{reference}}",
    body: "Your rental request {{reference}} has been created. Please sign the legal commitment to proceed.",
  },
  rental_confirmed: {
    subject: "Rental Confirmed - {{reference}}",
    body: "Your rental {{reference}} has been confirmed. The item will be delivered soon.",
  },
  rental_delivered: {
    subject: "Item Delivered - {{reference}}",
    body: "Your rented item for {{reference}} has been delivered. Enjoy!",
  },
  rental_returned: {
    subject: "Item Received Back - {{reference}}",
    body: "We have received the returned item for rental {{reference}}. Inspection is in progress.",
  },
  rental_closed: {
    subject: "Rental Closed - {{reference}}",
    body: "Your rental {{reference}} has been closed successfully.",
  },
  rental_cancelled: {
    subject: "Rental Cancelled - {{reference}}",
    body: "Your rental {{reference}} has been cancelled.",
  },
  payment_captured: {
    subject: "Payment Successful - {{amount}} SAR",
    body: "Your payment of {{amount}} SAR has been captured successfully for rental {{reference}}.",
  },
  payment_refunded: {
    subject: "Refund Processed - {{amount}} SAR",
    body: "A refund of {{amount}} SAR has been processed for rental {{reference}}.",
  },
  payout_released: {
    subject: "Payout Released - {{amount}} SAR",
    body: "Your payout of {{amount}} SAR for rental {{reference}} has been released.",
  },
  asset_approved: {
    subject: "Asset Approved - {{title}}",
    body: "Your asset '{{title}}' has been approved and is being prepared for listing.",
  },
  asset_rejected: {
    subject: "Asset Submission Rejected - {{title}}",
    body: "Your asset '{{title}}' submission has been rejected. Reason: {{reason}}",
  },
  asset_listed: {
    subject: "Asset Now Listed - {{title}}",
    body: "Your asset '{{title}}' is now live and available for rent.",
  },
  inspection_complete: {
    subject: "Inspection Complete - {{title}}",
    body: "The inspection for '{{title}}' is complete. Grade: {{grade}}.",
  },
  valuation_proposed: {
    subject: "Valuation Proposed - {{title}}",
    body: "A valuation of {{value}} SAR has been proposed for '{{title}}'. Please review and approve.",
  },
  dispute_opened: {
    subject: "Dispute Opened - {{reference}}",
    body: "A dispute has been opened for rental {{reference}}. Category: {{category}}.",
  },
  dispute_resolved: {
    subject: "Dispute Resolved - {{reference}}",
    body: "The dispute for rental {{reference}} has been resolved.",
  },
  sanad_issued: {
    subject: "Sanad Issued - {{reference}}",
    body: "A Sanad (promissory note) has been issued for rental {{reference}}.",
  },
  sanad_maturity_warning: {
    subject: "Sanad Maturity Warning - {{reference}}",
    body: "The Sanad for rental {{reference}} is approaching maturity on {{maturityDate}}.",
  },
  late_return_warning: {
    subject: "Late Return Warning - {{reference}}",
    body: "Your rental {{reference}} is overdue. Please return the item immediately to avoid penalties.",
  },
};

function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] ?? ""));
}

export async function sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.recipientUserId))
    .limit(1);

  if (!user) {
    return { sent: false, channels: [] };
  }

  const template = templates[payload.type];
  const subject = renderTemplate(template.subject, payload.data);
  const body = renderTemplate(template.body, payload.data);
  const channels = payload.channels ?? ["email"];
  const sentChannels: NotificationChannel[] = [];

  for (const channel of channels) {
    try {
      if (channel === "email" && user.email) {
        await sendEmail(user.email, subject, body);
        sentChannels.push("email");
      } else if (channel === "sms" && user.phoneE164) {
        await sendSms(user.phoneE164, body);
        sentChannels.push("sms");
      }
    } catch (err) {
      console.error(`[notification] ${channel} send failed for user ${user.id}:`, err);
    }
  }

  return { sent: sentChannels.length > 0, channels: sentChannels };
}

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (!EMAIL_API_KEY) {
    console.log(`[notification:email:dev] To: ${to} | Subject: ${subject} | Body: ${body}`);
    return;
  }
  // Production: integrate with SendGrid / AWS SES / Mailgun
  throw new Error("Email provider not configured");
}

async function sendSms(to: string, body: string): Promise<void> {
  if (!SMS_API_KEY) {
    console.log(`[notification:sms:dev] To: ${to} | Body: ${body}`);
    return;
  }
  // Production: integrate with Twilio / AWS SNS / Unifonic
  throw new Error("SMS provider not configured");
}
