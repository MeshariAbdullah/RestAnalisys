/**
 * Notification service (PLACEHOLDER).
 *
 * Sends email and SMS notifications for key rental lifecycle events.
 * In dev mode (no credentials), logs to console. In production, swap in
 * a real provider (SES, Mailgun, Twilio, Unifonic, etc.).
 */

import crypto from "node:crypto";

const EMAIL_PROVIDER_KEY = process.env.EMAIL_PROVIDER_KEY ?? "";
const SMS_PROVIDER_KEY = process.env.SMS_PROVIDER_KEY ?? "";

export type NotificationChannel = "email" | "sms" | "push";

export interface NotificationPayload {
  channel: NotificationChannel;
  recipientUserId: number;
  recipientEmail?: string;
  recipientPhone?: string;
  templateKey: string;
  locale: "en" | "ar";
  subject?: string;
  variables: Record<string, string | number>;
}

export interface NotificationResult {
  messageId: string;
  channel: NotificationChannel;
  status: "sent" | "queued" | "failed";
  provider: string;
  sentAt: string;
}

const TEMPLATES: Record<string, { subjectEn: string; subjectAr: string; bodyEn: string; bodyAr: string }> = {
  "rental.created": {
    subjectEn: "Rental Created — {{rentalReference}}",
    subjectAr: "تم إنشاء عقد الإيجار — {{rentalReference}}",
    bodyEn: "Your rental {{rentalReference}} has been created. Please sign the legal commitment and complete payment to confirm.",
    bodyAr: "تم إنشاء عقد الإيجار {{rentalReference}}. يرجى توقيع التعهد وإتمام الدفع للتأكيد.",
  },
  "rental.confirmed": {
    subjectEn: "Rental Confirmed — {{rentalReference}}",
    subjectAr: "تم تأكيد الإيجار — {{rentalReference}}",
    bodyEn: "Payment received. Your rental {{rentalReference}} is confirmed. We will deliver the item to your address.",
    bodyAr: "تم استلام الدفع. تم تأكيد عقد الإيجار {{rentalReference}}. سنقوم بتوصيل القطعة إلى عنوانك.",
  },
  "rental.delivered": {
    subjectEn: "Item Delivered — {{rentalReference}}",
    subjectAr: "تم توصيل القطعة — {{rentalReference}}",
    bodyEn: "The item for rental {{rentalReference}} has been delivered. Enjoy! Please return it by {{endDate}}.",
    bodyAr: "تم توصيل القطعة لعقد الإيجار {{rentalReference}}. استمتع! يرجى إرجاعها بحلول {{endDate}}.",
  },
  "rental.return_reminder": {
    subjectEn: "Return Reminder — {{rentalReference}}",
    subjectAr: "تذكير بالإرجاع — {{rentalReference}}",
    bodyEn: "Your rental {{rentalReference}} is due for return on {{endDate}}. Please arrange the return to avoid late penalties.",
    bodyAr: "موعد إرجاع عقد الإيجار {{rentalReference}} هو {{endDate}}. يرجى ترتيب الإرجاع لتجنب غرامات التأخير.",
  },
  "rental.overdue": {
    subjectEn: "OVERDUE — {{rentalReference}}",
    subjectAr: "متأخر — {{rentalReference}}",
    bodyEn: "Your rental {{rentalReference}} is overdue. Please return the item immediately to avoid enforcement action.",
    bodyAr: "عقد الإيجار {{rentalReference}} متأخر. يرجى إرجاع القطعة فوراً لتجنب إجراءات التنفيذ.",
  },
  "rental.closed": {
    subjectEn: "Rental Closed — {{rentalReference}}",
    subjectAr: "تم إغلاق الإيجار — {{rentalReference}}",
    bodyEn: "Rental {{rentalReference}} has been closed successfully. Thank you for using MLR.",
    bodyAr: "تم إغلاق عقد الإيجار {{rentalReference}} بنجاح. شكراً لاستخدامك منصة MLR.",
  },
  "owner.payout": {
    subjectEn: "Payout Processed — {{amount}}",
    subjectAr: "تم معالجة المبلغ — {{amount}}",
    bodyEn: "A payout of {{amount}} has been processed to your account for rental {{rentalReference}}.",
    bodyAr: "تم تحويل مبلغ {{amount}} إلى حسابك عن عقد الإيجار {{rentalReference}}.",
  },
  "asset.approved": {
    subjectEn: "Asset Approved — {{assetTitle}}",
    subjectAr: "تمت الموافقة على القطعة — {{assetTitle}}",
    bodyEn: "Your asset \"{{assetTitle}}\" has been approved. Please ship it to our warehouse.",
    bodyAr: "تمت الموافقة على قطعتك \"{{assetTitle}}\". يرجى شحنها إلى مستودعنا.",
  },
  "asset.listed": {
    subjectEn: "Asset Listed — {{assetTitle}}",
    subjectAr: "تم عرض القطعة — {{assetTitle}}",
    bodyEn: "Your asset \"{{assetTitle}}\" is now live and available for renters.",
    bodyAr: "قطعتك \"{{assetTitle}}\" أصبحت متاحة للمستأجرين.",
  },
};

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? `{{${key}}}`));
}

export async function sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const messageId = `MSG-${crypto.randomBytes(8).toString("hex")}`;
  const template = TEMPLATES[payload.templateKey];

  if (template) {
    const subject = payload.locale === "ar"
      ? interpolate(template.subjectAr, payload.variables)
      : interpolate(template.subjectEn, payload.variables);
    const body = payload.locale === "ar"
      ? interpolate(template.bodyAr, payload.variables)
      : interpolate(template.bodyEn, payload.variables);

    if (payload.channel === "email" && !EMAIL_PROVIDER_KEY) {
      console.log(`[notification:email:dev] To: ${payload.recipientEmail ?? `user#${payload.recipientUserId}`}`);
      console.log(`  Subject: ${subject}`);
      console.log(`  Body: ${body}`);
    }
    if (payload.channel === "sms" && !SMS_PROVIDER_KEY) {
      console.log(`[notification:sms:dev] To: ${payload.recipientPhone ?? `user#${payload.recipientUserId}`}`);
      console.log(`  Message: ${body}`);
    }
  }

  return {
    messageId,
    channel: payload.channel,
    status: "sent",
    provider: payload.channel === "email"
      ? (EMAIL_PROVIDER_KEY ? "ses" : "dev-console")
      : (SMS_PROVIDER_KEY ? "unifonic" : "dev-console"),
    sentAt: new Date().toISOString(),
  };
}

export async function sendRentalNotification(
  templateKey: string,
  recipientUserId: number,
  recipientEmail: string | undefined,
  variables: Record<string, string | number>
): Promise<NotificationResult> {
  return sendNotification({
    channel: "email",
    recipientUserId,
    recipientEmail,
    templateKey,
    locale: "ar",
    variables,
  });
}
