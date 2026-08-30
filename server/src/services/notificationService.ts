/**
 * Notification service (PLACEHOLDER).
 *
 * Sends emails and SMS to platform users. In production this wraps calls
 * to an email provider (SES / SendGrid / Mailgun) and an SMS gateway
 * (Twilio / Unifonic for Saudi numbers). Drop real credentials to switch
 * from dev stubs that only log to console.
 */

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER ?? "";
const EMAIL_API_KEY = process.env.EMAIL_API_KEY ?? "";
const SMS_PROVIDER = process.env.SMS_PROVIDER ?? "";
const SMS_API_KEY = process.env.SMS_API_KEY ?? "";
const PLATFORM_FROM_EMAIL = process.env.PLATFORM_FROM_EMAIL ?? "noreply@mlr.sa";

export type NotificationChannel = "email" | "sms" | "both";

export interface EmailPayload {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
}

export interface SmsPayload {
  to: string;
  message: string;
}

export type NotificationType =
  | "rental_created"
  | "rental_confirmed"
  | "rental_delivered"
  | "rental_returned"
  | "rental_closed"
  | "rental_cancelled"
  | "asset_approved"
  | "asset_rejected"
  | "inspection_complete"
  | "valuation_ready"
  | "payment_captured"
  | "payment_refunded"
  | "payout_released"
  | "dispute_opened"
  | "dispute_resolved"
  | "sanad_issued"
  | "sanad_enforcement"
  | "late_return_warning"
  | "nafath_verified";

export interface NotificationRequest {
  type: NotificationType;
  channel: NotificationChannel;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName: string;
  subject?: string;
  data: Record<string, unknown>;
}

export interface NotificationResult {
  channel: NotificationChannel;
  emailSent: boolean;
  smsSent: boolean;
  emailMessageId?: string;
  smsMessageId?: string;
}

function buildEmailBody(type: NotificationType, data: Record<string, unknown>): { subject: string; bodyHtml: string; bodyText: string } {
  const templates: Record<string, { subject: string; body: string }> = {
    rental_created: {
      subject: "Your rental has been created",
      body: `Your rental ${data.reference ?? ""} has been created and is pending legal signing.`,
    },
    rental_confirmed: {
      subject: "Rental confirmed",
      body: `Your rental ${data.reference ?? ""} is confirmed. We're preparing your item for delivery.`,
    },
    rental_delivered: {
      subject: "Your item has been delivered",
      body: `Your rental ${data.reference ?? ""} item has been delivered. Enjoy!`,
    },
    rental_returned: {
      subject: "Return received",
      body: `We've received the return for rental ${data.reference ?? ""}. Inspection in progress.`,
    },
    rental_closed: {
      subject: "Rental completed",
      body: `Your rental ${data.reference ?? ""} has been closed successfully. Thank you!`,
    },
    rental_cancelled: {
      subject: "Rental cancelled",
      body: `Your rental ${data.reference ?? ""} has been cancelled.`,
    },
    asset_approved: {
      subject: "Asset approved for listing",
      body: `Your item "${data.title ?? ""}" has been approved. Please arrange shipment to our facility.`,
    },
    asset_rejected: {
      subject: "Asset submission update",
      body: `Your item "${data.title ?? ""}" could not be approved. Reason: ${data.reason ?? "N/A"}.`,
    },
    inspection_complete: {
      subject: "Inspection complete",
      body: `The inspection for "${data.title ?? ""}" is complete. Please review the valuation.`,
    },
    valuation_ready: {
      subject: "Valuation ready for review",
      body: `The valuation for "${data.title ?? ""}" is ready. Please approve or decline.`,
    },
    payment_captured: {
      subject: "Payment confirmed",
      body: `Payment of ${data.amount ?? ""} for rental ${data.reference ?? ""} has been captured.`,
    },
    payment_refunded: {
      subject: "Refund processed",
      body: `A refund of ${data.amount ?? ""} has been processed for rental ${data.reference ?? ""}.`,
    },
    payout_released: {
      subject: "Payout released",
      body: `Your payout of ${data.amount ?? ""} has been released to your bank account.`,
    },
    dispute_opened: {
      subject: "Dispute opened",
      body: `A dispute has been opened for rental ${data.reference ?? ""}. Our team will investigate.`,
    },
    dispute_resolved: {
      subject: "Dispute resolved",
      body: `The dispute for rental ${data.reference ?? ""} has been resolved.`,
    },
    sanad_issued: {
      subject: "Sanad (promissory note) issued",
      body: `A Sanad has been issued for your rental ${data.reference ?? ""}.`,
    },
    sanad_enforcement: {
      subject: "Sanad enforcement initiated",
      body: `Enforcement proceedings have been initiated for rental ${data.reference ?? ""}.`,
    },
    late_return_warning: {
      subject: "Late return warning",
      body: `Your rental ${data.reference ?? ""} is past due. Please return the item immediately.`,
    },
    nafath_verified: {
      subject: "Identity verified",
      body: "Your Nafath identity verification is complete. You can now rent luxury items.",
    },
  };

  const tmpl = templates[type] ?? { subject: "MLR Platform Notification", body: `Notification: ${type}` };
  return {
    subject: tmpl.subject,
    bodyHtml: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1a1a1a">${tmpl.subject}</h2>
      <p style="color:#404040;line-height:1.6">${tmpl.body}</p>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">
      <p style="color:#999;font-size:12px">MLR — Managed Luxury Rental Platform</p>
    </div>`,
    bodyText: tmpl.body,
  };
}

function buildSmsBody(type: NotificationType, data: Record<string, unknown>): string {
  const ref = (data.reference as string) ?? "";
  const shortMessages: Record<string, string> = {
    rental_created: `MLR: Rental ${ref} created. Complete signing to proceed.`,
    rental_confirmed: `MLR: Rental ${ref} confirmed. Delivery is being arranged.`,
    rental_delivered: `MLR: Your item for rental ${ref} has been delivered.`,
    late_return_warning: `MLR: Rental ${ref} is past due. Return immediately to avoid penalties.`,
    payment_captured: `MLR: Payment confirmed for rental ${ref}.`,
    nafath_verified: "MLR: Your identity has been verified successfully.",
  };
  return shortMessages[type] ?? `MLR: Update on your account. Check your email for details.`;
}

export async function sendNotification(req: NotificationRequest): Promise<NotificationResult> {
  const result: NotificationResult = {
    channel: req.channel,
    emailSent: false,
    smsSent: false,
  };

  if ((req.channel === "email" || req.channel === "both") && req.recipientEmail) {
    if (!EMAIL_API_KEY) {
      const { subject, bodyText } = buildEmailBody(req.type, req.data);
      console.log(`[NOTIFICATION/EMAIL-DEV] To: ${req.recipientEmail} | Subject: ${subject} | Body: ${bodyText}`);
      result.emailSent = true;
      result.emailMessageId = `EMAIL-DEV-${Date.now()}`;
    } else {
      throw new Error("Email provider production client not configured");
    }
  }

  if ((req.channel === "sms" || req.channel === "both") && req.recipientPhone) {
    if (!SMS_API_KEY) {
      const message = buildSmsBody(req.type, req.data);
      console.log(`[NOTIFICATION/SMS-DEV] To: ${req.recipientPhone} | Message: ${message}`);
      result.smsSent = true;
      result.smsMessageId = `SMS-DEV-${Date.now()}`;
    } else {
      throw new Error("SMS provider production client not configured");
    }
  }

  return result;
}
