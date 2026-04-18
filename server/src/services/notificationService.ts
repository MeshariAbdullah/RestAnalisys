/**
 * Notification service — email + SMS stubs.
 *
 * In production, swap in a real provider:
 *   Email: AWS SES / SendGrid / Mailgun
 *   SMS:   Twilio / Unifonic (Saudi-focused)
 *
 * Both channels support bilingual templates (EN + AR) since the platform
 * serves the Saudi market.
 */

import crypto from "node:crypto";

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER ?? ""; // ses | sendgrid | mailgun
const EMAIL_API_KEY = process.env.EMAIL_API_KEY ?? "";
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@mlr.sa";

const SMS_PROVIDER = process.env.SMS_PROVIDER ?? ""; // twilio | unifonic
const SMS_API_KEY = process.env.SMS_API_KEY ?? "";
const SMS_FROM = process.env.SMS_FROM ?? "MLR";

export type NotificationChannel = "email" | "sms" | "both";

export interface EmailPayload {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
}

export interface SmsPayload {
  to: string; // E.164 format
  body: string;
}

export interface NotificationResult {
  channel: NotificationChannel;
  messageId: string;
  status: "sent" | "queued" | "failed";
  provider: string;
}

export async function sendEmail(payload: EmailPayload): Promise<NotificationResult> {
  if (!EMAIL_API_KEY) {
    const messageId = `EMAIL-DEV-${crypto.randomBytes(6).toString("hex")}`;
    console.log(`[notification:email] DEV → ${payload.to} | ${payload.subject}`);
    return {
      channel: "email",
      messageId,
      status: "sent",
      provider: "dev-stub",
    };
  }
  throw new Error(`Email provider "${EMAIL_PROVIDER}" not configured`);
}

export async function sendSms(payload: SmsPayload): Promise<NotificationResult> {
  if (!SMS_API_KEY) {
    const messageId = `SMS-DEV-${crypto.randomBytes(6).toString("hex")}`;
    console.log(`[notification:sms] DEV → ${payload.to} | ${payload.body.slice(0, 60)}…`);
    return {
      channel: "sms",
      messageId,
      status: "sent",
      provider: "dev-stub",
    };
  }
  throw new Error(`SMS provider "${SMS_PROVIDER}" not configured`);
}

// ── Template helpers ──────────────────────────────────────────────────────────

export interface RentalNotificationData {
  renterName: string;
  renterEmail: string;
  renterPhone?: string;
  rentalReference: string;
  assetTitle: string;
  totalSar: string;
  startDate: string;
  endDate: string;
}

export async function notifyRentalCreated(data: RentalNotificationData): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  results.push(
    await sendEmail({
      to: data.renterEmail,
      subject: `Rental ${data.rentalReference} — Please sign your commitment | يرجى توقيع التزامك`,
      bodyHtml: `
        <div dir="ltr">
          <h2>Your rental request has been approved</h2>
          <p>Dear ${data.renterName},</p>
          <p>Your rental <strong>${data.rentalReference}</strong> for <strong>${data.assetTitle}</strong> has been approved by our risk engine.</p>
          <p><strong>Period:</strong> ${data.startDate} → ${data.endDate}</p>
          <p><strong>Total:</strong> ${data.totalSar}</p>
          <p>Please sign the legal commitment to proceed.</p>
        </div>
        <hr/>
        <div dir="rtl">
          <h2>تمت الموافقة على طلب الإيجار الخاص بك</h2>
          <p>عزيزي ${data.renterName}،</p>
          <p>تمت الموافقة على طلب الإيجار <strong>${data.rentalReference}</strong> للمنتج <strong>${data.assetTitle}</strong>.</p>
          <p>يرجى توقيع الالتزام القانوني للمتابعة.</p>
        </div>
      `,
    })
  );

  if (data.renterPhone) {
    results.push(
      await sendSms({
        to: data.renterPhone,
        body: `MLR: Rental ${data.rentalReference} approved. Please sign your commitment to proceed. | تمت الموافقة على الإيجار ${data.rentalReference}. يرجى التوقيع.`,
      })
    );
  }

  return results;
}

export async function notifyRentalDelivered(data: {
  renterEmail: string;
  renterName: string;
  rentalReference: string;
  assetTitle: string;
  endDate: string;
}): Promise<NotificationResult> {
  return sendEmail({
    to: data.renterEmail,
    subject: `${data.assetTitle} delivered — Return by ${data.endDate} | تم التوصيل`,
    bodyHtml: `
      <div dir="ltr">
        <h2>Your item has been delivered</h2>
        <p>Dear ${data.renterName},</p>
        <p>Your rental <strong>${data.rentalReference}</strong> (<strong>${data.assetTitle}</strong>) has been delivered.</p>
        <p><strong>Return by:</strong> ${data.endDate}</p>
        <p>Please handle the item with care. Late returns may affect your trust score.</p>
      </div>
    `,
  });
}

export async function notifyReturnReminder(data: {
  renterEmail: string;
  renterPhone?: string;
  renterName: string;
  rentalReference: string;
  assetTitle: string;
  endDate: string;
  daysRemaining: number;
}): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  results.push(
    await sendEmail({
      to: data.renterEmail,
      subject: `Reminder: Return ${data.assetTitle} in ${data.daysRemaining} day(s) | تذكير بموعد الإرجاع`,
      bodyHtml: `
        <div dir="ltr">
          <h2>Return reminder</h2>
          <p>Dear ${data.renterName},</p>
          <p>Your rental <strong>${data.rentalReference}</strong> for <strong>${data.assetTitle}</strong> is due for return on <strong>${data.endDate}</strong> (${data.daysRemaining} day(s) remaining).</p>
          <p>Please initiate the return process to avoid late fees and trust score penalties.</p>
        </div>
        <hr/>
        <div dir="rtl">
          <h2>تذكير بموعد الإرجاع</h2>
          <p>يرجى إرجاع المنتج <strong>${data.assetTitle}</strong> بحلول <strong>${data.endDate}</strong>.</p>
        </div>
      `,
    })
  );

  if (data.renterPhone) {
    results.push(
      await sendSms({
        to: data.renterPhone,
        body: `MLR: Return ${data.assetTitle} by ${data.endDate} (${data.daysRemaining} day(s) left). Ref: ${data.rentalReference} | تذكير بإرجاع المنتج`,
      })
    );
  }

  return results;
}

export async function notifyDisputeOpened(data: {
  adminEmail: string;
  rentalReference: string;
  category: string;
  summary: string;
}): Promise<NotificationResult> {
  return sendEmail({
    to: data.adminEmail,
    subject: `Dispute opened — ${data.rentalReference} [${data.category}]`,
    bodyHtml: `
      <div dir="ltr">
        <h2>New dispute requires attention</h2>
        <p><strong>Rental:</strong> ${data.rentalReference}</p>
        <p><strong>Category:</strong> ${data.category}</p>
        <p><strong>Summary:</strong> ${data.summary}</p>
      </div>
    `,
  });
}

export async function notifyOwnerPayout(data: {
  ownerEmail: string;
  ownerName: string;
  rentalReference: string;
  netSar: string;
}): Promise<NotificationResult> {
  return sendEmail({
    to: data.ownerEmail,
    subject: `Payout released — ${data.netSar} | تم تحويل المبلغ`,
    bodyHtml: `
      <div dir="ltr">
        <h2>Your payout has been released</h2>
        <p>Dear ${data.ownerName},</p>
        <p>A payout of <strong>${data.netSar}</strong> for rental <strong>${data.rentalReference}</strong> has been released to your bank account.</p>
      </div>
      <hr/>
      <div dir="rtl">
        <h2>تم تحويل المبلغ إلى حسابك</h2>
        <p>تم تحويل مبلغ <strong>${data.netSar}</strong> للإيجار <strong>${data.rentalReference}</strong>.</p>
      </div>
    `,
  });
}
