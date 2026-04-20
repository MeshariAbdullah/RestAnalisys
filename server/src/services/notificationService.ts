import crypto from "node:crypto";

const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMS_API_KEY = process.env.SMS_API_KEY ?? "";

export type NotificationChannel = "email" | "sms" | "push";
export type NotificationTemplate =
  | "welcome"
  | "nafath_verified"
  | "rental_created"
  | "rental_confirmed"
  | "rental_delivered"
  | "rental_return_reminder"
  | "rental_closed"
  | "dispute_opened"
  | "dispute_resolved"
  | "payout_sent"
  | "sanad_issued"
  | "account_blocked";

export interface NotificationPayload {
  channel: NotificationChannel;
  template: NotificationTemplate;
  recipientUserId: number;
  recipientEmail?: string;
  recipientPhone?: string;
  locale: "en" | "ar";
  variables: Record<string, string | number>;
}

export interface NotificationResult {
  notificationId: string;
  channel: NotificationChannel;
  status: "sent" | "queued" | "failed";
  sentAt?: string;
  provider: string;
}

const TEMPLATE_SUBJECTS: Record<NotificationTemplate, { en: string; ar: string }> = {
  welcome: {
    en: "Welcome to Managed Luxury Rental",
    ar: "مرحباً بك في منصة الإيجار الفاخر",
  },
  nafath_verified: {
    en: "Identity Verified Successfully",
    ar: "تم التحقق من الهوية بنجاح",
  },
  rental_created: {
    en: "Rental Request Created - {{reference}}",
    ar: "تم إنشاء طلب الإيجار - {{reference}}",
  },
  rental_confirmed: {
    en: "Rental Confirmed - {{reference}}",
    ar: "تم تأكيد الإيجار - {{reference}}",
  },
  rental_delivered: {
    en: "Your Rental Has Been Delivered",
    ar: "تم تسليم إيجارك",
  },
  rental_return_reminder: {
    en: "Return Reminder - {{daysLeft}} Days Left",
    ar: "تذكير بالإرجاع - {{daysLeft}} أيام متبقية",
  },
  rental_closed: {
    en: "Rental Closed - {{reference}}",
    ar: "تم إغلاق الإيجار - {{reference}}",
  },
  dispute_opened: {
    en: "Dispute Opened - {{disputeId}}",
    ar: "تم فتح نزاع - {{disputeId}}",
  },
  dispute_resolved: {
    en: "Dispute Resolved",
    ar: "تم حل النزاع",
  },
  payout_sent: {
    en: "Payout Sent - {{amount}} SAR",
    ar: "تم إرسال المبلغ - {{amount}} ريال",
  },
  sanad_issued: {
    en: "Sanad (Promissory Note) Issued",
    ar: "تم إصدار سند لأمر",
  },
  account_blocked: {
    en: "Account Suspended",
    ar: "تم تعليق الحساب",
  },
};

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ""));
}

export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  const notificationId = `NOTIF-${crypto.randomBytes(8).toString("hex")}`;
  const subject = TEMPLATE_SUBJECTS[payload.template]?.[payload.locale] ?? payload.template;
  const resolvedSubject = interpolate(subject, payload.variables);

  if (payload.channel === "email") {
    if (!SMTP_HOST) {
      console.log(
        `[notification:email:dev] to=${payload.recipientEmail} subject="${resolvedSubject}" vars=${JSON.stringify(payload.variables)}`
      );
      return {
        notificationId,
        channel: "email",
        status: "sent",
        sentAt: new Date().toISOString(),
        provider: "dev-console",
      };
    }
    // Production: send via SMTP / SES / SendGrid
    throw new Error("Email provider not configured");
  }

  if (payload.channel === "sms") {
    if (!SMS_API_KEY) {
      console.log(
        `[notification:sms:dev] to=${payload.recipientPhone} template=${payload.template} vars=${JSON.stringify(payload.variables)}`
      );
      return {
        notificationId,
        channel: "sms",
        status: "sent",
        sentAt: new Date().toISOString(),
        provider: "dev-console",
      };
    }
    // Production: send via Unifonic / Twilio
    throw new Error("SMS provider not configured");
  }

  // Push notifications — future
  console.log(`[notification:push:dev] user=${payload.recipientUserId} template=${payload.template}`);
  return {
    notificationId,
    channel: "push",
    status: "queued",
    provider: "dev-console",
  };
}

export async function notifyUser(
  userId: number,
  email: string | null,
  phone: string | null,
  template: NotificationTemplate,
  variables: Record<string, string | number>,
  locale: "en" | "ar" = "ar"
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  if (email) {
    results.push(
      await sendNotification({
        channel: "email",
        template,
        recipientUserId: userId,
        recipientEmail: email,
        locale,
        variables,
      })
    );
  }

  if (phone) {
    results.push(
      await sendNotification({
        channel: "sms",
        template,
        recipientUserId: userId,
        recipientPhone: phone,
        locale,
        variables,
      })
    );
  }

  return results;
}
