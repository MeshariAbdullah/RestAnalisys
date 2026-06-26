/**
 * Notification service (PLACEHOLDER).
 *
 * Provides email and SMS delivery. In dev mode, notifications are logged to
 * console. Drop real credentials into .env to switch to production providers.
 *
 * Supported providers:
 *  - Email: SendGrid, Mailgun, or Amazon SES
 *  - SMS: Twilio, Unifonic (Saudi-focused)
 */

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER ?? "";
const EMAIL_API_KEY = process.env.EMAIL_API_KEY ?? "";
const SMS_PROVIDER = process.env.SMS_PROVIDER ?? "";
const SMS_API_KEY = process.env.SMS_API_KEY ?? "";
const PLATFORM_NAME = "MLR - Managed Luxury Rental";
const FROM_EMAIL = process.env.FROM_EMAIL ?? "noreply@mlr.sa";

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

export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<NotificationResult> {
  if (!EMAIL_API_KEY) {
    console.log(`[notification:email] TO: ${payload.to} | SUBJECT: ${payload.subject}`);
    console.log(`[notification:email] BODY: ${payload.bodyText ?? payload.bodyHtml.slice(0, 200)}`);
    return { channel: "email", success: true, messageId: `DEV-EMAIL-${Date.now()}` };
  }

  // Production: implement provider-specific HTTP call
  throw new Error("Email provider not configured");
}

export async function sendSms(payload: SmsPayload): Promise<NotificationResult> {
  if (!SMS_API_KEY) {
    console.log(`[notification:sms] TO: ${payload.to} | MSG: ${payload.message}`);
    return { channel: "sms", success: true, messageId: `DEV-SMS-${Date.now()}` };
  }

  // Production: implement provider-specific HTTP call
  throw new Error("SMS provider not configured");
}

// ── Templated notifications ───────────────────────────────────────────

export async function notifyRentalCreated(renterEmail: string, renterPhone: string | null, data: {
  reference: string;
  assetTitle: string;
  totalSar: string;
  startDate: string;
  endDate: string;
}): Promise<void> {
  await sendEmail({
    to: renterEmail,
    subject: `${PLATFORM_NAME}: Rental ${data.reference} Created`,
    bodyHtml: `
      <h2>Rental Created</h2>
      <p>Your rental <strong>${data.reference}</strong> for <strong>${data.assetTitle}</strong> has been created.</p>
      <p>Total: ${data.totalSar} SAR | Period: ${data.startDate} to ${data.endDate}</p>
      <p>Please sign the legal commitment and complete payment to confirm your booking.</p>
    `,
    bodyText: `Rental ${data.reference} created for ${data.assetTitle}. Total: ${data.totalSar} SAR. Period: ${data.startDate} to ${data.endDate}. Sign the commitment and pay to confirm.`,
  }).catch(err => console.error("[notification] rental created email failed:", err));

  if (renterPhone) {
    await sendSms({
      to: renterPhone,
      message: `MLR: Rental ${data.reference} created. Total: ${data.totalSar} SAR. Sign the commitment to confirm.`,
    }).catch(err => console.error("[notification] rental created SMS failed:", err));
  }
}

export async function notifyPaymentConfirmed(renterEmail: string, renterPhone: string | null, data: {
  reference: string;
  assetTitle: string;
  totalSar: string;
  invoiceNumber: string;
}): Promise<void> {
  await sendEmail({
    to: renterEmail,
    subject: `${PLATFORM_NAME}: Payment Confirmed — ${data.reference}`,
    bodyHtml: `
      <h2>Payment Confirmed</h2>
      <p>Payment for rental <strong>${data.reference}</strong> (${data.assetTitle}) has been captured.</p>
      <p>Amount: ${data.totalSar} SAR | Invoice: ${data.invoiceNumber}</p>
      <p>We will schedule delivery shortly.</p>
    `,
    bodyText: `Payment confirmed for ${data.reference}. Amount: ${data.totalSar} SAR. Invoice: ${data.invoiceNumber}.`,
  }).catch(err => console.error("[notification] payment email failed:", err));

  if (renterPhone) {
    await sendSms({
      to: renterPhone,
      message: `MLR: Payment of ${data.totalSar} SAR confirmed for ${data.reference}. Delivery will be scheduled soon.`,
    }).catch(err => console.error("[notification] payment SMS failed:", err));
  }
}

export async function notifyRentalDelivered(renterEmail: string, data: {
  reference: string;
  assetTitle: string;
  endDate: string;
}): Promise<void> {
  await sendEmail({
    to: renterEmail,
    subject: `${PLATFORM_NAME}: ${data.assetTitle} Delivered — ${data.reference}`,
    bodyHtml: `
      <h2>Item Delivered</h2>
      <p>Your rental item <strong>${data.assetTitle}</strong> (${data.reference}) has been marked as delivered.</p>
      <p>Please return the item by <strong>${data.endDate}</strong> to avoid late return penalties.</p>
    `,
    bodyText: `${data.assetTitle} delivered for ${data.reference}. Return by ${data.endDate}.`,
  }).catch(err => console.error("[notification] delivery email failed:", err));
}

export async function notifyOwnerAssetApproved(ownerEmail: string, data: {
  assetTitle: string;
  status: "approved" | "rejected";
  rejectionReason?: string;
}): Promise<void> {
  const approved = data.status === "approved";
  await sendEmail({
    to: ownerEmail,
    subject: `${PLATFORM_NAME}: Asset ${approved ? "Approved" : "Rejected"} — ${data.assetTitle}`,
    bodyHtml: approved
      ? `<h2>Asset Approved</h2><p>Your asset <strong>${data.assetTitle}</strong> has been approved. Please ship it to our facility for inspection.</p>`
      : `<h2>Asset Rejected</h2><p>Your asset <strong>${data.assetTitle}</strong> was not approved. Reason: ${data.rejectionReason ?? "N/A"}</p>`,
    bodyText: approved
      ? `Asset ${data.assetTitle} approved. Ship to our facility for inspection.`
      : `Asset ${data.assetTitle} rejected. Reason: ${data.rejectionReason ?? "N/A"}`,
  }).catch(err => console.error("[notification] asset approval email failed:", err));
}

export async function notifyOwnerPayout(ownerEmail: string, data: {
  reference: string;
  netSar: string;
  assetTitle: string;
}): Promise<void> {
  await sendEmail({
    to: ownerEmail,
    subject: `${PLATFORM_NAME}: Payout Released — ${data.netSar} SAR`,
    bodyHtml: `
      <h2>Payout Released</h2>
      <p>A payout of <strong>${data.netSar} SAR</strong> has been released for rental of <strong>${data.assetTitle}</strong> (${data.reference}).</p>
      <p>The amount will be deposited to your registered bank account.</p>
    `,
    bodyText: `Payout of ${data.netSar} SAR released for ${data.assetTitle} (${data.reference}).`,
  }).catch(err => console.error("[notification] payout email failed:", err));
}

export async function notifyLateReturn(renterEmail: string, renterPhone: string | null, data: {
  reference: string;
  assetTitle: string;
  endDate: string;
  daysLate: number;
}): Promise<void> {
  await sendEmail({
    to: renterEmail,
    subject: `${PLATFORM_NAME}: URGENT — Late Return for ${data.reference}`,
    bodyHtml: `
      <h2>Late Return Notice</h2>
      <p>Your rental <strong>${data.reference}</strong> (${data.assetTitle}) was due on <strong>${data.endDate}</strong>.</p>
      <p>It is now <strong>${data.daysLate} day(s)</strong> overdue. Please initiate the return immediately to avoid penalties and potential Sanad enforcement.</p>
    `,
    bodyText: `URGENT: Rental ${data.reference} is ${data.daysLate} day(s) late. Return ${data.assetTitle} immediately to avoid penalties.`,
  }).catch(err => console.error("[notification] late return email failed:", err));

  if (renterPhone) {
    await sendSms({
      to: renterPhone,
      message: `MLR URGENT: Rental ${data.reference} is ${data.daysLate} day(s) overdue. Return immediately to avoid penalties.`,
    }).catch(err => console.error("[notification] late return SMS failed:", err));
  }
}
