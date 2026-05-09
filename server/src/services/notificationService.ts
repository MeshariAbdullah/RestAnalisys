import { v4 as uuidv4 } from "uuid";

export type NotificationChannel = "email" | "sms" | "push";

export interface NotificationPayload {
  to: string;
  channel: NotificationChannel;
  templateKey: string;
  locale: "ar" | "en";
  variables: Record<string, string | number>;
}

export interface NotificationResult {
  sent: boolean;
  messageId: string;
  channel: NotificationChannel;
  source: "live" | "stub";
}

const EMAIL_PROVIDER_KEY = process.env.EMAIL_PROVIDER_KEY;
const SMS_PROVIDER_KEY = process.env.SMS_PROVIDER_KEY;

const TEMPLATES: Record<string, { ar: string; en: string }> = {
  "rental.created": {
    ar: "تم إنشاء طلب الإيجار {reference} بنجاح. المبلغ الإجمالي: {total} ر.س",
    en: "Rental {reference} created successfully. Total: {total} SAR",
  },
  "rental.confirmed": {
    ar: "تم تأكيد طلب الإيجار {reference}. سيتم شحن القطعة قريباً.",
    en: "Rental {reference} confirmed. Your item will be shipped soon.",
  },
  "rental.delivered": {
    ar: "تم توصيل القطعة لطلب الإيجار {reference}. استمتع!",
    en: "Item for rental {reference} has been delivered. Enjoy!",
  },
  "rental.return_reminder": {
    ar: "تذكير: يجب إرجاع القطعة لطلب {reference} خلال {days} أيام.",
    en: "Reminder: Please return the item for rental {reference} within {days} days.",
  },
  "rental.overdue": {
    ar: "تنبيه: طلب الإيجار {reference} متأخر. يرجى الإرجاع فوراً لتجنب الغرامات.",
    en: "Alert: Rental {reference} is overdue. Please return immediately to avoid penalties.",
  },
  "asset.approved": {
    ar: "تمت الموافقة على القطعة '{title}'. سيتم جدولة الاستلام قريباً.",
    en: "Asset '{title}' has been approved. Pickup will be scheduled soon.",
  },
  "asset.rejected": {
    ar: "تم رفض القطعة '{title}'. السبب: {reason}",
    en: "Asset '{title}' was rejected. Reason: {reason}",
  },
  "asset.listed": {
    ar: "القطعة '{title}' معروضة الآن للإيجار.",
    en: "Asset '{title}' is now listed for rent.",
  },
  "inspection.completed": {
    ar: "اكتمل فحص القطعة '{title}'. القيمة المقدرة: {value} ر.س",
    en: "Inspection for '{title}' completed. Evaluated value: {value} SAR",
  },
  "payout.sent": {
    ar: "تم تحويل {amount} ر.س إلى حسابك البنكي.",
    en: "SAR {amount} has been transferred to your bank account.",
  },
  "dispute.opened": {
    ar: "تم فتح نزاع رقم {disputeId} بخصوص طلب {reference}.",
    en: "Dispute #{disputeId} opened for rental {reference}.",
  },
  "dispute.resolved": {
    ar: "تم حل النزاع رقم {disputeId}.",
    en: "Dispute #{disputeId} has been resolved.",
  },
  "sanad.signing_required": {
    ar: "يجب توقيع السند الإلكتروني لطلب {reference} عبر نافذ.",
    en: "Electronic Sanad for rental {reference} requires your signature via Nafith.",
  },
  "kyc.verified": {
    ar: "تم التحقق من هويتك بنجاح عبر نفاذ.",
    en: "Your identity has been verified successfully via Nafath.",
  },
};

function renderTemplate(
  templateKey: string,
  locale: "ar" | "en",
  variables: Record<string, string | number>
): string {
  const template = TEMPLATES[templateKey];
  if (!template) return `[${templateKey}]`;
  let text = template[locale];
  for (const [key, val] of Object.entries(variables)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, "g"), String(val));
  }
  return text;
}

export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  const messageId = `MSG-${uuidv4().slice(0, 12)}`;
  const rendered = renderTemplate(payload.templateKey, payload.locale, payload.variables);

  if (payload.channel === "email" && EMAIL_PROVIDER_KEY) {
    // TODO: Wire real email provider (SendGrid / SES / Mailgun)
    console.log(`[email:live] → ${payload.to}: ${rendered}`);
    return { sent: true, messageId, channel: "email", source: "live" };
  }

  if (payload.channel === "sms" && SMS_PROVIDER_KEY) {
    // TODO: Wire real SMS provider (Unifonic / Twilio)
    console.log(`[sms:live] → ${payload.to}: ${rendered}`);
    return { sent: true, messageId, channel: "sms", source: "live" };
  }

  console.log(`[${payload.channel}:stub] → ${payload.to}: ${rendered}`);
  return { sent: true, messageId, channel: payload.channel, source: "stub" };
}

export async function sendBulkNotification(
  payloads: NotificationPayload[]
): Promise<NotificationResult[]> {
  return Promise.all(payloads.map(sendNotification));
}

export function getAvailableTemplates(): string[] {
  return Object.keys(TEMPLATES);
}
