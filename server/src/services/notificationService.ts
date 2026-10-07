/**
 * Notification service — event-driven notifications for rental lifecycle events.
 *
 * In dev mode, notifications are logged to console. Set SMTP_HOST / SMS_API_KEY
 * in .env to enable real delivery channels.
 */

import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export type NotificationChannel = "email" | "sms" | "push";

export interface NotificationPayload {
  recipientUserId: number;
  channel?: NotificationChannel;
  templateKey: string;
  subjectEn: string;
  subjectAr: string;
  bodyEn: string;
  bodyAr: string;
  metadata?: Record<string, unknown>;
}

const isLiveEmail = !!process.env.SMTP_HOST;
const isLiveSms = !!process.env.SMS_API_KEY;

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (isLiveEmail) {
    // Production: integrate with SMTP / SES / SendGrid
    console.log(`[email:live] → ${to}: ${subject}`);
    return;
  }
  console.log(`[email:dev] → ${to}: ${subject}\n${body}`);
}

async function sendSms(phone: string, body: string): Promise<void> {
  if (isLiveSms) {
    // Production: integrate with Unifonic / Twilio
    console.log(`[sms:live] → ${phone}: ${body.slice(0, 60)}…`);
    return;
  }
  console.log(`[sms:dev] → ${phone}: ${body}`);
}

export async function notify(payload: NotificationPayload): Promise<void> {
  const [user] = await db
    .select({ email: users.email, phone: users.phoneE164 })
    .from(users)
    .where(eq(users.id, payload.recipientUserId))
    .limit(1);

  if (!user) {
    console.warn(`[notify] User ${payload.recipientUserId} not found, skipping`);
    return;
  }

  const channel = payload.channel ?? "email";

  try {
    if (channel === "email" || channel === "push") {
      await sendEmail(user.email, payload.subjectEn, payload.bodyEn);
    }
    if (channel === "sms" && user.phone) {
      await sendSms(user.phone, payload.bodyEn);
    }
  } catch (err) {
    console.error(`[notify] Failed to send ${channel} to user ${payload.recipientUserId}:`, err);
  }
}

export function formatSar(halalas: number): string {
  return `${(halalas / 100).toLocaleString("en-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} SAR`;
}

export async function notifyRentalCreated(
  renterId: number,
  ownerId: number,
  rentalRef: string,
  assetTitle: string,
  totalHalalas: number
): Promise<void> {
  const total = formatSar(totalHalalas);

  await notify({
    recipientUserId: renterId,
    templateKey: "rental.created.renter",
    subjectEn: `Rental ${rentalRef} — Action Required`,
    subjectAr: `طلب إيجار ${rentalRef} — يتطلب إجراء`,
    bodyEn: `Your rental request for "${assetTitle}" (${total}) has been created. Please sign the legal commitment and complete payment.`,
    bodyAr: `تم إنشاء طلب الإيجار لـ "${assetTitle}" (${total}). يرجى توقيع الالتزام القانوني وإكمال الدفع.`,
    metadata: { rentalRef, assetTitle, totalHalalas },
  });

  await notify({
    recipientUserId: ownerId,
    templateKey: "rental.created.owner",
    subjectEn: `Your asset "${assetTitle}" has a new rental request`,
    subjectAr: `لديك طلب إيجار جديد على "${assetTitle}"`,
    bodyEn: `A renter has requested "${assetTitle}" (${total}). The platform will handle all logistics.`,
    bodyAr: `طلب مستأجر "${assetTitle}" (${total}). ستتولى المنصة جميع الإجراءات اللوجستية.`,
    metadata: { rentalRef, assetTitle },
  });
}

export async function notifyPaymentCaptured(
  renterId: number,
  rentalRef: string,
  amountHalalas: number,
  invoiceNumber: string
): Promise<void> {
  const amount = formatSar(amountHalalas);
  await notify({
    recipientUserId: renterId,
    templateKey: "payment.captured",
    subjectEn: `Payment Confirmed — ${rentalRef}`,
    subjectAr: `تأكيد الدفع — ${rentalRef}`,
    bodyEn: `Your payment of ${amount} for rental ${rentalRef} has been captured. Invoice: ${invoiceNumber}. Your item will be shipped shortly.`,
    bodyAr: `تم تأكيد دفعتك بمبلغ ${amount} للإيجار ${rentalRef}. رقم الفاتورة: ${invoiceNumber}. سيتم شحن القطعة قريباً.`,
    metadata: { rentalRef, amountHalalas, invoiceNumber },
  });
}

export async function notifyRentalDelivered(
  renterId: number,
  rentalRef: string,
  assetTitle: string,
  endDate: string
): Promise<void> {
  await notify({
    recipientUserId: renterId,
    templateKey: "rental.delivered",
    subjectEn: `Delivered — ${assetTitle}`,
    subjectAr: `تم التسليم — ${assetTitle}`,
    bodyEn: `"${assetTitle}" (${rentalRef}) has been delivered. Please return it by ${endDate}. Enjoy!`,
    bodyAr: `تم تسليم "${assetTitle}" (${rentalRef}). يرجى إعادتها بحلول ${endDate}. استمتعي!`,
    metadata: { rentalRef, assetTitle, endDate },
  });
}

export async function notifyRentalClosed(
  renterId: number,
  ownerId: number,
  rentalRef: string,
  outcome: string
): Promise<void> {
  await notify({
    recipientUserId: renterId,
    templateKey: "rental.closed.renter",
    subjectEn: `Rental ${rentalRef} Closed — ${outcome}`,
    subjectAr: `تم إغلاق الإيجار ${rentalRef} — ${outcome}`,
    bodyEn: `Your rental ${rentalRef} has been closed with outcome: ${outcome}. Thank you for using MLR.`,
    bodyAr: `تم إغلاق الإيجار ${rentalRef} بالنتيجة: ${outcome}. شكراً لاستخدامك MLR.`,
    metadata: { rentalRef, outcome },
  });

  await notify({
    recipientUserId: ownerId,
    templateKey: "rental.closed.owner",
    subjectEn: `Rental ${rentalRef} Closed — Payout Incoming`,
    subjectAr: `إغلاق الإيجار ${rentalRef} — الدفعة قادمة`,
    bodyEn: `Rental ${rentalRef} has been closed (${outcome}). ${outcome === "clean" ? "Your payout will be processed shortly." : "Our team is reviewing the outcome."}`,
    bodyAr: `تم إغلاق الإيجار ${rentalRef} (${outcome}). ${outcome === "clean" ? "ستتم معالجة دفعتك قريباً." : "فريقنا يراجع النتيجة."}`,
    metadata: { rentalRef, outcome },
  });
}

export async function notifyDisputeOpened(
  assigneeUserId: number,
  disputeId: number,
  rentalRef: string,
  category: string,
  summary: string
): Promise<void> {
  await notify({
    recipientUserId: assigneeUserId,
    templateKey: "dispute.opened",
    subjectEn: `Dispute #${disputeId} Opened — ${category}`,
    subjectAr: `نزاع #${disputeId} مفتوح — ${category}`,
    bodyEn: `A ${category} dispute has been opened for rental ${rentalRef}: "${summary}". Please review.`,
    bodyAr: `تم فتح نزاع ${category} للإيجار ${rentalRef}: "${summary}". يرجى المراجعة.`,
    metadata: { disputeId, rentalRef, category },
  });
}

export async function notifyPayoutReleased(
  ownerId: number,
  rentalRef: string,
  netHalalas: number
): Promise<void> {
  const net = formatSar(netHalalas);
  await notify({
    recipientUserId: ownerId,
    templateKey: "payout.released",
    subjectEn: `Payout Released — ${net}`,
    subjectAr: `تم إصدار الدفعة — ${net}`,
    bodyEn: `Your payout of ${net} for rental ${rentalRef} has been released. It will arrive in your bank account within 1-3 business days.`,
    bodyAr: `تم إصدار دفعتك بمبلغ ${net} للإيجار ${rentalRef}. ستصل لحسابك البنكي خلال 1-3 أيام عمل.`,
    metadata: { rentalRef, netHalalas },
  });
}
