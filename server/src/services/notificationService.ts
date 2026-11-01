/**
 * Notification service — email + SMS delivery (PLACEHOLDER).
 *
 * In production, wire up to an email provider (SendGrid, Mailgun, SES) and an
 * SMS provider (Twilio, Unifonic for KSA). When no API keys are present, all
 * sends are logged to stdout and succeed — same dev-mode pattern as Nafath,
 * Nafith and the payment gateway.
 */

const EMAIL_API_KEY = process.env.EMAIL_API_KEY ?? "";
const SMS_API_KEY = process.env.SMS_API_KEY ?? "";
const PLATFORM_EMAIL = process.env.PLATFORM_EMAIL ?? "noreply@mlr.sa";
const PLATFORM_SMS_SENDER = process.env.PLATFORM_SMS_SENDER ?? "MLR";

export type NotificationChannel = "email" | "sms" | "both";

export interface EmailPayload {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export interface SmsPayload {
  to: string;
  body: string;
}

export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<NotificationResult> {
  if (!EMAIL_API_KEY) {
    console.log(
      `[notification:email] DEV → to=${payload.to} subject="${payload.subject}"`
    );
    return { channel: "email", success: true, messageId: `EMAIL-DEV-${Date.now()}` };
  }
  throw new Error("Email provider production client not configured");
}

export async function sendSms(payload: SmsPayload): Promise<NotificationResult> {
  if (!SMS_API_KEY) {
    console.log(
      `[notification:sms] DEV → to=${payload.to} body="${payload.body.slice(0, 60)}…"`
    );
    return { channel: "sms", success: true, messageId: `SMS-DEV-${Date.now()}` };
  }
  throw new Error("SMS provider production client not configured");
}

// ── Domain-specific notification helpers ──────────────────────────────────

export async function notifyRentalCreated(params: {
  renterEmail: string;
  renterPhone?: string;
  rentalReference: string;
  assetTitle: string;
  totalSar: string;
}): Promise<void> {
  await sendEmail({
    to: params.renterEmail,
    subject: `MLR — Rental ${params.rentalReference} created`,
    htmlBody: `
      <h2>Your rental request has been created</h2>
      <p><strong>Item:</strong> ${params.assetTitle}</p>
      <p><strong>Reference:</strong> ${params.rentalReference}</p>
      <p><strong>Total:</strong> ${params.totalSar}</p>
      <p>Please sign the legal commitment to proceed.</p>
    `,
  });
  if (params.renterPhone) {
    await sendSms({
      to: params.renterPhone,
      body: `MLR: Rental ${params.rentalReference} created for ${params.assetTitle}. Total: ${params.totalSar}. Sign the commitment to proceed.`,
    });
  }
}

export async function notifyRentalStatusChange(params: {
  renterEmail: string;
  renterPhone?: string;
  rentalReference: string;
  newStatus: string;
}): Promise<void> {
  const statusLabels: Record<string, string> = {
    confirmed: "Confirmed — payment received",
    out_for_delivery: "Out for delivery",
    active: "Delivered — enjoy your rental!",
    return_in_transit: "Return shipment in transit",
    under_inspection: "Returned — under inspection",
    closed: "Closed — thank you!",
    closed_with_penalty: "Closed with penalty charge",
    cancelled: "Cancelled",
  };
  const label = statusLabels[params.newStatus] ?? params.newStatus;

  await sendEmail({
    to: params.renterEmail,
    subject: `MLR — Rental ${params.rentalReference}: ${label}`,
    htmlBody: `
      <h2>Rental Status Update</h2>
      <p><strong>Reference:</strong> ${params.rentalReference}</p>
      <p><strong>Status:</strong> ${label}</p>
    `,
  });
  if (params.renterPhone) {
    await sendSms({
      to: params.renterPhone,
      body: `MLR: Rental ${params.rentalReference} is now "${label}".`,
    });
  }
}

export async function notifyOwnerAssetUpdate(params: {
  ownerEmail: string;
  assetTitle: string;
  update: string;
}): Promise<void> {
  await sendEmail({
    to: params.ownerEmail,
    subject: `MLR — Asset update: ${params.assetTitle}`,
    htmlBody: `
      <h2>Asset Update</h2>
      <p><strong>Asset:</strong> ${params.assetTitle}</p>
      <p>${params.update}</p>
    `,
  });
}

export async function notifyLateReturn(params: {
  renterEmail: string;
  renterPhone?: string;
  rentalReference: string;
  daysPastDue: number;
}): Promise<void> {
  await sendEmail({
    to: params.renterEmail,
    subject: `MLR — OVERDUE: Rental ${params.rentalReference}`,
    htmlBody: `
      <h2>Late Return Notice</h2>
      <p><strong>Reference:</strong> ${params.rentalReference}</p>
      <p>Your rental is <strong>${params.daysPastDue} day(s) overdue</strong>.</p>
      <p>Please return the item immediately to avoid penalties and Sanad enforcement.</p>
    `,
  });
  if (params.renterPhone) {
    await sendSms({
      to: params.renterPhone,
      body: `MLR OVERDUE: Rental ${params.rentalReference} is ${params.daysPastDue} day(s) late. Return immediately to avoid enforcement.`,
    });
  }
}
