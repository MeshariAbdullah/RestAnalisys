import crypto from "node:crypto";

const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMS_API_KEY = process.env.SMS_API_KEY ?? "";

export type NotificationChannel = "email" | "sms" | "push";

export interface EmailPayload {
  to: string;
  subject: string;
  templateId: string;
  variables: Record<string, string>;
}

export interface SmsPayload {
  phoneE164: string;
  message: string;
}

export interface NotificationResult {
  channel: NotificationChannel;
  messageId: string;
  status: "sent" | "queued" | "failed";
  provider: string;
}

export async function sendEmail(payload: EmailPayload): Promise<NotificationResult> {
  if (!SMTP_HOST) {
    const messageId = `EMAIL-DEV-${crypto.randomBytes(6).toString("hex")}`;
    console.log(`[notification:email] DEV → ${payload.to} | ${payload.subject}`);
    return { channel: "email", messageId, status: "sent", provider: "dev-stub" };
  }
  throw new Error("SMTP production client not configured");
}

export async function sendSms(payload: SmsPayload): Promise<NotificationResult> {
  if (!SMS_API_KEY) {
    const messageId = `SMS-DEV-${crypto.randomBytes(6).toString("hex")}`;
    console.log(`[notification:sms] DEV → ${payload.phoneE164} | ${payload.message.substring(0, 40)}...`);
    return { channel: "sms", messageId, status: "sent", provider: "dev-stub" };
  }
  throw new Error("SMS production client (Unifonic) not configured");
}

export type RentalEventType =
  | "rental_created"
  | "rental_confirmed"
  | "rental_delivered"
  | "rental_returned"
  | "rental_closed"
  | "rental_cancelled"
  | "payment_captured"
  | "payout_released"
  | "dispute_opened"
  | "dispute_resolved"
  | "sanad_issued"
  | "late_return_warning";

export async function notifyRentalEvent(
  eventType: RentalEventType,
  recipient: { email?: string; phoneE164?: string; fullName: string },
  data: Record<string, string>
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  if (recipient.email) {
    results.push(
      await sendEmail({
        to: recipient.email,
        subject: buildSubject(eventType, data),
        templateId: eventType,
        variables: { ...data, recipientName: recipient.fullName },
      })
    );
  }

  if (recipient.phoneE164) {
    results.push(
      await sendSms({
        phoneE164: recipient.phoneE164,
        message: buildSmsMessage(eventType, data),
      })
    );
  }

  return results;
}

function buildSubject(eventType: RentalEventType, data: Record<string, string>): string {
  const ref = data.rentalReference ?? "";
  const subjects: Record<RentalEventType, string> = {
    rental_created: `MLR: Rental ${ref} Created — Review Your Commitment`,
    rental_confirmed: `MLR: Rental ${ref} Confirmed — Payment Received`,
    rental_delivered: `MLR: Rental ${ref} Delivered`,
    rental_returned: `MLR: Rental ${ref} Return Received`,
    rental_closed: `MLR: Rental ${ref} Closed Successfully`,
    rental_cancelled: `MLR: Rental ${ref} Cancelled`,
    payment_captured: `MLR: Payment Confirmation for ${ref}`,
    payout_released: `MLR: Payout Released — ${data.amount ?? ""}`,
    dispute_opened: `MLR: Dispute Opened for Rental ${ref}`,
    dispute_resolved: `MLR: Dispute Resolved for Rental ${ref}`,
    sanad_issued: `MLR: Legal Commitment (Sanad) Issued for ${ref}`,
    late_return_warning: `MLR: Return Overdue — Rental ${ref}`,
  };
  return subjects[eventType];
}

function buildSmsMessage(eventType: RentalEventType, data: Record<string, string>): string {
  const ref = data.rentalReference ?? "";
  const messages: Record<RentalEventType, string> = {
    rental_created: `MLR: Your rental ${ref} has been created. Please sign the legal commitment to proceed.`,
    rental_confirmed: `MLR: Payment confirmed for rental ${ref}. Your item will be shipped soon.`,
    rental_delivered: `MLR: Your rental item for ${ref} has been delivered. Enjoy!`,
    rental_returned: `MLR: We received the return for rental ${ref}. Inspection in progress.`,
    rental_closed: `MLR: Rental ${ref} has been closed. Thank you for using MLR.`,
    rental_cancelled: `MLR: Rental ${ref} has been cancelled.`,
    payment_captured: `MLR: Payment of ${data.amount ?? ""} captured for rental ${ref}.`,
    payout_released: `MLR: Payout of ${data.amount ?? ""} has been released to your account.`,
    dispute_opened: `MLR: A dispute has been opened for rental ${ref}. Our team will review it.`,
    dispute_resolved: `MLR: The dispute for rental ${ref} has been resolved.`,
    sanad_issued: `MLR: Your Sanad (legal commitment) for rental ${ref} has been issued.`,
    late_return_warning: `MLR: URGENT — Rental ${ref} return is overdue. Please arrange return immediately to avoid penalties.`,
  };
  return messages[eventType];
}
