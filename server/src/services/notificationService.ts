import crypto from "node:crypto";

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER ?? "+966500000000";
const SENDGRID_KEY = process.env.SENDGRID_API_KEY ?? "";
const SENDGRID_FROM = process.env.SENDGRID_FROM_EMAIL ?? "noreply@mlr.sa";

export type NotificationChannel = "sms" | "email" | "push";
export type NotificationCategory =
  | "rental_created"
  | "rental_confirmed"
  | "rental_delivered"
  | "rental_returned"
  | "rental_closed"
  | "payment_captured"
  | "payment_refunded"
  | "late_return_warning"
  | "late_return_alert"
  | "dispute_opened"
  | "dispute_resolved"
  | "sanad_issued"
  | "sanad_executed"
  | "inspection_complete"
  | "asset_approved"
  | "asset_rejected"
  | "payout_sent"
  | "identity_verified";

export interface SendSmsRequest {
  to: string;
  body: string;
  category: NotificationCategory;
  userId?: number;
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  category: NotificationCategory;
  userId?: number;
}

export interface NotificationResult {
  channel: NotificationChannel;
  messageId: string;
  status: "sent" | "queued" | "failed";
  provider: string;
  devMode: boolean;
}

const devLog: Array<{ timestamp: string; channel: NotificationChannel; to: string; body: string }> = [];

export async function sendSms(req: SendSmsRequest): Promise<NotificationResult> {
  if (!TWILIO_SID || !TWILIO_TOKEN) {
    const messageId = `SMS-DEV-${crypto.randomBytes(6).toString("hex")}`;
    devLog.push({
      timestamp: new Date().toISOString(),
      channel: "sms",
      to: req.to,
      body: req.body,
    });
    console.log(`[notification:sms:dev] → ${req.to}: ${req.body.slice(0, 80)}…`);
    return { channel: "sms", messageId, status: "sent", provider: "dev", devMode: true };
  }
  throw new Error("Twilio production client not configured");
}

export async function sendEmail(req: SendEmailRequest): Promise<NotificationResult> {
  if (!SENDGRID_KEY) {
    const messageId = `EMAIL-DEV-${crypto.randomBytes(6).toString("hex")}`;
    devLog.push({
      timestamp: new Date().toISOString(),
      channel: "email",
      to: req.to,
      body: req.subject,
    });
    console.log(`[notification:email:dev] → ${req.to}: ${req.subject}`);
    return { channel: "email", messageId, status: "sent", provider: "dev", devMode: true };
  }
  throw new Error("SendGrid production client not configured");
}

export function getDevLog() {
  return [...devLog];
}

const TEMPLATES: Record<NotificationCategory, { sms: string; emailSubject: string; emailBody: string }> = {
  rental_created: {
    sms: "تم إنشاء طلب إيجار جديد برقم {reference}. يرجى إكمال التوقيع القانوني.",
    emailSubject: "طلب إيجار جديد — {reference}",
    emailBody: "<h2>طلب إيجار جديد</h2><p>تم إنشاء طلب إيجار <b>{reference}</b> للمنتج <b>{assetTitle}</b>.</p><p>المبلغ الإجمالي: <b>{totalSar}</b></p><p>يرجى إكمال التوقيع القانوني والدفع لتأكيد الإيجار.</p>",
  },
  rental_confirmed: {
    sms: "تم تأكيد إيجارك {reference}. سيتم شحن المنتج قريباً.",
    emailSubject: "تأكيد الإيجار — {reference}",
    emailBody: "<h2>تأكيد الإيجار</h2><p>تم تأكيد إيجارك <b>{reference}</b>.</p><p>سيتم شحن المنتج إلى عنوانك قريباً.</p>",
  },
  rental_delivered: {
    sms: "تم تسليم المنتج لإيجار {reference}. استمتع!",
    emailSubject: "تم التسليم — {reference}",
    emailBody: "<h2>تم التسليم</h2><p>تم تسليم منتجك لإيجار <b>{reference}</b>.</p><p>يرجى إرجاعه بحلول {endDate}.</p>",
  },
  rental_returned: {
    sms: "تم استلام المنتج المُرجع لإيجار {reference}. جاري الفحص.",
    emailSubject: "استلام الإرجاع — {reference}",
    emailBody: "<h2>تم استلام الإرجاع</h2><p>تم استلام المنتج المُرجع لإيجار <b>{reference}</b>.</p><p>سيتم فحصه وإغلاق العقد.</p>",
  },
  rental_closed: {
    sms: "تم إغلاق إيجار {reference} بنجاح. شكراً لك!",
    emailSubject: "إغلاق الإيجار — {reference}",
    emailBody: "<h2>تم إغلاق الإيجار</h2><p>تم إغلاق إيجار <b>{reference}</b> بنجاح.</p><p>نتطلع لخدمتك مرة أخرى.</p>",
  },
  payment_captured: {
    sms: "تم خصم {amountSar} لإيجار {reference}.",
    emailSubject: "إيصال دفع — {reference}",
    emailBody: "<h2>إيصال دفع</h2><p>تم خصم <b>{amountSar}</b> بنجاح لإيجار <b>{reference}</b>.</p><p>رقم الفاتورة: {invoiceNumber}</p>",
  },
  payment_refunded: {
    sms: "تم استرداد {amountSar} لإيجار {reference}.",
    emailSubject: "إشعار استرداد — {reference}",
    emailBody: "<h2>إشعار استرداد</h2><p>تم استرداد <b>{amountSar}</b> لإيجار <b>{reference}</b>.</p>",
  },
  late_return_warning: {
    sms: "⚠️ تنبيه: إيجارك {reference} مقرر إرجاعه بتاريخ {endDate}. يرجى الإرجاع في الموعد.",
    emailSubject: "⚠️ تنبيه موعد إرجاع — {reference}",
    emailBody: "<h2>تنبيه موعد إرجاع</h2><p>إيجارك <b>{reference}</b> مقرر إرجاعه بتاريخ <b>{endDate}</b>.</p><p>يرجى ترتيب الإرجاع لتجنب الغرامات.</p>",
  },
  late_return_alert: {
    sms: "🚨 إيجارك {reference} تأخر عن موعد الإرجاع! قد تُفرض غرامات تأخير.",
    emailSubject: "🚨 تأخير إرجاع — {reference}",
    emailBody: "<h2>تأخير الإرجاع</h2><p>إيجارك <b>{reference}</b> تأخر عن موعد الإرجاع.</p><p>يرجى إرجاع المنتج فوراً لتجنب الغرامات الإضافية.</p>",
  },
  dispute_opened: {
    sms: "تم فتح نزاع على إيجار {reference}. سنراجع الأمر خلال 48 ساعة.",
    emailSubject: "فتح نزاع — {reference}",
    emailBody: "<h2>فتح نزاع</h2><p>تم فتح نزاع على إيجار <b>{reference}</b>.</p><p>سيقوم فريقنا بمراجعة الأمر وسنتواصل معك خلال 48 ساعة.</p>",
  },
  dispute_resolved: {
    sms: "تم حل النزاع على إيجار {reference}.",
    emailSubject: "حل النزاع — {reference}",
    emailBody: "<h2>حل النزاع</h2><p>تم حل النزاع على إيجار <b>{reference}</b>.</p>",
  },
  sanad_issued: {
    sms: "تم إصدار سند لأمر بقيمة {amountSar} لإيجار {reference}.",
    emailSubject: "إصدار سند لأمر — {reference}",
    emailBody: "<h2>إصدار سند لأمر</h2><p>تم إصدار سند لأمر بقيمة <b>{amountSar}</b> لإيجار <b>{reference}</b> عبر منصة نافذ.</p>",
  },
  sanad_executed: {
    sms: "🚨 تم تقديم سند إيجار {reference} للتنفيذ في ناجز.",
    emailSubject: "🚨 تنفيذ سند — {reference}",
    emailBody: "<h2>تنفيذ السند</h2><p>تم تقديم سند إيجار <b>{reference}</b> للتنفيذ عبر محكمة التنفيذ (ناجز).</p>",
  },
  inspection_complete: {
    sms: "تم فحص منتجك {assetTitle}. يرجى مراجعة التقييم والموافقة.",
    emailSubject: "اكتمال الفحص — {assetTitle}",
    emailBody: "<h2>اكتمال الفحص</h2><p>تم فحص منتجك <b>{assetTitle}</b>.</p><p>القيمة المقدرة: <b>{valueSar}</b></p><p>يرجى مراجعة التقييم والموافقة عليه.</p>",
  },
  asset_approved: {
    sms: "تمت الموافقة على منتجك {assetTitle}. يرجى إرساله للمنصة.",
    emailSubject: "الموافقة على المنتج — {assetTitle}",
    emailBody: "<h2>تمت الموافقة</h2><p>تمت الموافقة على منتجك <b>{assetTitle}</b>.</p><p>يرجى ترتيب إرساله إلى مستودع المنصة.</p>",
  },
  asset_rejected: {
    sms: "عذراً، تم رفض منتجك {assetTitle}. السبب: {reason}",
    emailSubject: "رفض المنتج — {assetTitle}",
    emailBody: "<h2>رفض المنتج</h2><p>عذراً، تم رفض منتجك <b>{assetTitle}</b>.</p><p>السبب: {reason}</p>",
  },
  payout_sent: {
    sms: "تم تحويل {amountSar} إلى حسابك البنكي عن إيجار {reference}.",
    emailSubject: "تحويل أرباح — {reference}",
    emailBody: "<h2>تحويل أرباح</h2><p>تم تحويل <b>{amountSar}</b> إلى حسابك البنكي عن إيجار <b>{reference}</b>.</p>",
  },
  identity_verified: {
    sms: "تم التحقق من هويتك بنجاح عبر نفاذ.",
    emailSubject: "تأكيد التحقق من الهوية",
    emailBody: "<h2>تم التحقق من الهوية</h2><p>تم التحقق من هويتك بنجاح عبر نفاذ.</p><p>يمكنك الآن استئجار المنتجات الفاخرة عبر المنصة.</p>",
  },
};

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export async function notifyUser(opts: {
  userId: number;
  phone?: string | null;
  email?: string | null;
  category: NotificationCategory;
  vars: Record<string, string>;
  channels?: NotificationChannel[];
}): Promise<NotificationResult[]> {
  const tmpl = TEMPLATES[opts.category];
  if (!tmpl) return [];

  const channels = opts.channels ?? ["sms", "email"];
  const results: NotificationResult[] = [];

  if (channels.includes("sms") && opts.phone) {
    const body = interpolate(tmpl.sms, opts.vars);
    results.push(await sendSms({ to: opts.phone, body, category: opts.category, userId: opts.userId }));
  }

  if (channels.includes("email") && opts.email) {
    const subject = interpolate(tmpl.emailSubject, opts.vars);
    const bodyHtml = interpolate(tmpl.emailBody, opts.vars);
    results.push(await sendEmail({ to: opts.email, subject, bodyHtml, category: opts.category, userId: opts.userId }));
  }

  return results;
}
