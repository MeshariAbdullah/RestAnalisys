import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export type NotificationChannel = "email" | "sms" | "push";

export interface NotificationPayload {
  userId: number;
  channel: NotificationChannel;
  templateKey: string;
  subject?: string;
  bodyEn: string;
  bodyAr: string;
  metadata?: Record<string, unknown>;
}

const USE_LIVE = !!process.env.NOTIFICATION_API_KEY;

async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  if (!USE_LIVE) {
    console.log(`[notification:email:stub] to=${to} subject="${subject}"`);
    return true;
  }
  console.log(`[notification:email:live] to=${to} subject="${subject}"`);
  return true;
}

async function sendSms(phone: string, body: string): Promise<boolean> {
  if (!USE_LIVE) {
    console.log(`[notification:sms:stub] to=${phone} body="${body.slice(0, 60)}..."`);
    return true;
  }
  console.log(`[notification:sms:live] to=${phone}`);
  return true;
}

export async function notify(payload: NotificationPayload): Promise<boolean> {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user) {
      console.warn(`[notification] user ${payload.userId} not found`);
      return false;
    }

    if (payload.channel === "email") {
      return sendEmail(user.email, payload.subject ?? payload.templateKey, payload.bodyEn);
    }

    if (payload.channel === "sms" && user.phoneE164) {
      return sendSms(user.phoneE164, payload.bodyAr);
    }

    console.warn(`[notification] channel=${payload.channel} not available for user ${payload.userId}`);
    return false;
  } catch (err) {
    console.error("[notification] failed:", err);
    return false;
  }
}

export async function notifyRentalCreated(renterId: number, reference: string): Promise<void> {
  await notify({
    userId: renterId,
    channel: "email",
    templateKey: "rental_created",
    subject: `Rental ${reference} — Action Required`,
    bodyEn: `Your rental request ${reference} has been created. Please sign the legal commitment to proceed.`,
    bodyAr: `تم إنشاء طلب الإيجار ${reference}. يرجى توقيع الالتزام القانوني للمتابعة.`,
  });
}

export async function notifyRentalDelivered(renterId: number, reference: string): Promise<void> {
  await notify({
    userId: renterId,
    channel: "email",
    templateKey: "rental_delivered",
    subject: `Rental ${reference} — Item Delivered`,
    bodyEn: `Your rented item for ${reference} has been delivered. Enjoy your rental!`,
    bodyAr: `تم تسليم القطعة المستأجرة لطلب ${reference}. استمتع بإيجارك!`,
  });
}

export async function notifyOverdueReturn(
  renterId: number,
  reference: string,
  daysOverdue: number
): Promise<void> {
  await notify({
    userId: renterId,
    channel: "email",
    templateKey: "overdue_return",
    subject: `Rental ${reference} — Overdue Return (${daysOverdue} days)`,
    bodyEn: `Your rental ${reference} is ${daysOverdue} day(s) overdue. Please arrange the return immediately to avoid penalties.`,
    bodyAr: `إيجارك ${reference} متأخر ${daysOverdue} يوم/أيام. يرجى ترتيب الإرجاع فوراً لتجنب الغرامات.`,
  });
  await notify({
    userId: renterId,
    channel: "sms",
    templateKey: "overdue_return_sms",
    bodyEn: `MLR: Rental ${reference} is ${daysOverdue} days overdue. Return ASAP.`,
    bodyAr: `MLR: إيجار ${reference} متأخر ${daysOverdue} أيام. أرجع في أقرب وقت.`,
  });
}

export async function notifyOwnerPayout(ownerId: number, reference: string, netSar: number): Promise<void> {
  await notify({
    userId: ownerId,
    channel: "email",
    templateKey: "owner_payout",
    subject: `Payout Ready — ${reference}`,
    bodyEn: `Your payout of ${netSar.toFixed(2)} SAR for rental ${reference} has been processed.`,
    bodyAr: `تم تحويل مبلغ ${netSar.toFixed(2)} ريال سعودي لإيجار ${reference}.`,
  });
}

export async function notifyDisputeOpened(userId: number, rentalRef: string): Promise<void> {
  await notify({
    userId,
    channel: "email",
    templateKey: "dispute_opened",
    subject: `Dispute Opened — ${rentalRef}`,
    bodyEn: `A dispute has been opened for rental ${rentalRef}. Our team will investigate and respond within 48 hours.`,
    bodyAr: `تم فتح نزاع لإيجار ${rentalRef}. سيقوم فريقنا بالتحقيق والرد خلال 48 ساعة.`,
  });
}
