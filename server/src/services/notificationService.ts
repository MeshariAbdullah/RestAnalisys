import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { formatHalalas } from "../utils/money.js";

export type NotificationChannel = "email" | "sms" | "push";
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export interface NotificationPayload {
  recipientUserId: number;
  channel: NotificationChannel;
  priority: NotificationPriority;
  templateKey: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  metadata?: Record<string, unknown>;
}

interface SendResult {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
}

const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@mlr.sa";
const SMS_API_KEY = process.env.SMS_API_KEY ?? "";
const EMAIL_API_KEY = process.env.EMAIL_API_KEY ?? "";

async function sendEmail(to: string, subject: string, body: string): Promise<SendResult> {
  if (!EMAIL_API_KEY) {
    console.log(`[notification:email] DEV → to=${to} subject="${subject}"`);
    return { success: true, channel: "email", messageId: `EMAIL-DEV-${Date.now()}` };
  }
  // Production: integrate with SendGrid / SES / Mailgun
  return { success: true, channel: "email", messageId: `EMAIL-${Date.now()}` };
}

async function sendSms(phone: string, body: string): Promise<SendResult> {
  if (!SMS_API_KEY) {
    console.log(`[notification:sms] DEV → to=${phone} body="${body.slice(0, 60)}..."`);
    return { success: true, channel: "sms", messageId: `SMS-DEV-${Date.now()}` };
  }
  // Production: integrate with Twilio / Unifonic (Saudi)
  return { success: true, channel: "sms", messageId: `SMS-${Date.now()}` };
}

export async function sendNotification(payload: NotificationPayload): Promise<SendResult> {
  const [user] = await db
    .select({ email: users.email, phone: users.phoneE164 })
    .from(users)
    .where(eq(users.id, payload.recipientUserId))
    .limit(1);

  if (!user) {
    return { success: false, channel: payload.channel, error: "User not found" };
  }

  if (payload.channel === "email") {
    return sendEmail(user.email, payload.titleEn, payload.bodyEn);
  }

  if (payload.channel === "sms" && user.phone) {
    return sendSms(user.phone, payload.bodyAr);
  }

  return { success: false, channel: payload.channel, error: "Channel unavailable" };
}

// ── Pre-built notification templates ────────────────────────────────────────

export async function notifyRentalCreated(renterId: number, reference: string, totalHalalas: number) {
  return sendNotification({
    recipientUserId: renterId,
    channel: "email",
    priority: "high",
    templateKey: "rental.created",
    titleEn: `Rental ${reference} Created`,
    titleAr: `تم إنشاء الإيجار ${reference}`,
    bodyEn: `Your rental ${reference} has been created. Total payable: ${formatHalalas(totalHalalas)}. Please sign the legal commitment to proceed.`,
    bodyAr: `تم إنشاء عقد الإيجار ${reference}. المبلغ المستحق: ${formatHalalas(totalHalalas)}. يرجى توقيع التعهد القانوني للمتابعة.`,
    metadata: { reference, totalHalalas },
  });
}

export async function notifyPaymentConfirmed(renterId: number, reference: string, amountHalalas: number) {
  return sendNotification({
    recipientUserId: renterId,
    channel: "email",
    priority: "normal",
    templateKey: "payment.confirmed",
    titleEn: `Payment Confirmed — ${reference}`,
    titleAr: `تم تأكيد الدفع — ${reference}`,
    bodyEn: `Payment of ${formatHalalas(amountHalalas)} for rental ${reference} has been captured. Your item will be shipped soon.`,
    bodyAr: `تم تحصيل مبلغ ${formatHalalas(amountHalalas)} لعقد الإيجار ${reference}. سيتم شحن القطعة قريباً.`,
    metadata: { reference, amountHalalas },
  });
}

export async function notifyDelivery(renterId: number, reference: string) {
  return sendNotification({
    recipientUserId: renterId,
    channel: "sms",
    priority: "high",
    templateKey: "rental.delivered",
    titleEn: `Item Delivered — ${reference}`,
    titleAr: `تم تسليم القطعة — ${reference}`,
    bodyEn: `Your rental item for ${reference} has been delivered. Enjoy your experience!`,
    bodyAr: `تم تسليم قطعة الإيجار ${reference}. استمتع بتجربتك!`,
  });
}

export async function notifyOwnerAssetRented(ownerId: number, assetTitle: string, reference: string) {
  return sendNotification({
    recipientUserId: ownerId,
    channel: "email",
    priority: "normal",
    templateKey: "owner.asset_rented",
    titleEn: `Your asset "${assetTitle}" has been rented`,
    titleAr: `تم تأجير قطعتك "${assetTitle}"`,
    bodyEn: `Good news! Your item "${assetTitle}" has been rented out (Ref: ${reference}). You'll receive your payout after the rental closes.`,
    bodyAr: `أخبار سارة! تم تأجير قطعتك "${assetTitle}" (المرجع: ${reference}). ستستلم مستحقاتك بعد إغلاق العقد.`,
    metadata: { assetTitle, reference },
  });
}

export async function notifyOwnerPayout(ownerId: number, netHalalas: number, reference: string) {
  return sendNotification({
    recipientUserId: ownerId,
    channel: "email",
    priority: "normal",
    templateKey: "owner.payout",
    titleEn: `Payout processed — ${formatHalalas(netHalalas)}`,
    titleAr: `تم تحويل مستحقاتك — ${formatHalalas(netHalalas)}`,
    bodyEn: `Your payout of ${formatHalalas(netHalalas)} for rental ${reference} has been processed. It should arrive in your bank account within 1-3 business days.`,
    bodyAr: `تم تحويل مستحقاتك بمبلغ ${formatHalalas(netHalalas)} لعقد الإيجار ${reference}. ستصل إلى حسابك البنكي خلال 1-3 أيام عمل.`,
    metadata: { netHalalas, reference },
  });
}

export async function notifyOverdueRental(renterId: number, reference: string, daysPastDue: number) {
  return sendNotification({
    recipientUserId: renterId,
    channel: "sms",
    priority: "urgent",
    templateKey: "rental.overdue",
    titleEn: `Overdue Rental — ${reference}`,
    titleAr: `تأخر الإرجاع — ${reference}`,
    bodyEn: `Your rental ${reference} is ${daysPastDue} day(s) past the return date. Please return the item immediately to avoid legal enforcement.`,
    bodyAr: `عقد الإيجار ${reference} متأخر ${daysPastDue} يوم عن موعد الإرجاع. يرجى إعادة القطعة فوراً لتجنب الإجراءات القانونية.`,
    metadata: { reference, daysPastDue },
  });
}

export async function notifyDisputeOpened(assigneeId: number, disputeId: number, rentalReference: string) {
  return sendNotification({
    recipientUserId: assigneeId,
    channel: "email",
    priority: "high",
    templateKey: "dispute.opened",
    titleEn: `New Dispute #${disputeId} — ${rentalReference}`,
    titleAr: `نزاع جديد #${disputeId} — ${rentalReference}`,
    bodyEn: `A new dispute has been opened for rental ${rentalReference}. Please review and take action.`,
    bodyAr: `تم فتح نزاع جديد لعقد الإيجار ${rentalReference}. يرجى المراجعة واتخاذ الإجراء المناسب.`,
    metadata: { disputeId, rentalReference },
  });
}
