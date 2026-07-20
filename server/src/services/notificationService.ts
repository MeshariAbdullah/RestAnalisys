import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export type NotificationChannel = "email" | "sms" | "push";
export type NotificationType =
  | "rental_created"
  | "rental_confirmed"
  | "rental_delivered"
  | "rental_return_due"
  | "rental_overdue"
  | "rental_closed"
  | "asset_approved"
  | "asset_rejected"
  | "inspection_complete"
  | "payout_released"
  | "dispute_opened"
  | "dispute_resolved"
  | "sanad_issued"
  | "sanad_execution"
  | "payment_captured"
  | "payment_failed"
  | "account_blocked";

interface NotificationPayload {
  type: NotificationType;
  recipientUserId: number;
  channels?: NotificationChannel[];
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  metadata?: Record<string, unknown>;
}

interface NotificationResult {
  sent: boolean;
  channels: NotificationChannel[];
  recipientEmail?: string;
  recipientPhone?: string;
}

const IS_DEV = !process.env.SMTP_HOST && !process.env.SMS_API_KEY;

export async function sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const [user] = await db.select().from(users).where(eq(users.id, payload.recipientUserId)).limit(1);
  if (!user) {
    return { sent: false, channels: [] };
  }

  const channels = payload.channels ?? ["email"];

  if (IS_DEV) {
    console.log(`[NOTIFICATION:${payload.type}] → ${user.email} | ${payload.titleEn}`);
    return {
      sent: true,
      channels,
      recipientEmail: user.email,
      recipientPhone: user.phoneE164 ?? undefined,
    };
  }

  for (const channel of channels) {
    switch (channel) {
      case "email":
        await sendEmail({
          to: user.email,
          subject: payload.titleEn,
          body: payload.bodyEn,
        });
        break;
      case "sms":
        if (user.phoneE164) {
          await sendSms({ to: user.phoneE164, body: payload.bodyAr });
        }
        break;
      case "push":
        break;
    }
  }

  return {
    sent: true,
    channels,
    recipientEmail: user.email,
    recipientPhone: user.phoneE164 ?? undefined,
  };
}

async function sendEmail(_opts: { to: string; subject: string; body: string }): Promise<void> {
  // Placeholder: integrate with SendGrid/SES/Mailgun via SMTP_HOST env
}

async function sendSms(_opts: { to: string; body: string }): Promise<void> {
  // Placeholder: integrate with Unifonic/Twilio via SMS_API_KEY env
}

export async function notifyRentalCreated(rentalId: number, renterId: number, reference: string) {
  return sendNotification({
    type: "rental_created",
    recipientUserId: renterId,
    channels: ["email"],
    titleEn: `Rental ${reference} — Legal Signing Required`,
    titleAr: `طلب إيجار ${reference} — يتطلب التوقيع`,
    bodyEn: `Your rental request ${reference} has been approved by the risk engine. Please review and sign the legal commitment to proceed.`,
    bodyAr: `تمت الموافقة على طلب الإيجار ${reference}. يرجى مراجعة وتوقيع الالتزام القانوني للمتابعة.`,
    metadata: { rentalId },
  });
}

export async function notifyRentalConfirmed(rentalId: number, renterId: number, reference: string) {
  return sendNotification({
    type: "rental_confirmed",
    recipientUserId: renterId,
    channels: ["email", "sms"],
    titleEn: `Rental ${reference} — Payment Confirmed`,
    titleAr: `طلب إيجار ${reference} — تم تأكيد الدفع`,
    bodyEn: `Payment for rental ${reference} has been captured. Your item will be prepared for delivery.`,
    bodyAr: `تم تأكيد الدفع لطلب الإيجار ${reference}. سيتم تجهيز القطعة للتوصيل.`,
    metadata: { rentalId },
  });
}

export async function notifyReturnDue(rentalId: number, renterId: number, reference: string, dueDate: string) {
  return sendNotification({
    type: "rental_return_due",
    recipientUserId: renterId,
    channels: ["email", "sms"],
    titleEn: `Reminder: Return Due for ${reference}`,
    titleAr: `تذكير: موعد إرجاع ${reference}`,
    bodyEn: `Your rental ${reference} is due for return on ${dueDate}. Please arrange the return to avoid penalties.`,
    bodyAr: `موعد إرجاع الإيجار ${reference} هو ${dueDate}. يرجى ترتيب الإرجاع لتجنب الغرامات.`,
    metadata: { rentalId, dueDate },
  });
}

export async function notifyOverdue(rentalId: number, renterId: number, reference: string, daysPast: number) {
  return sendNotification({
    type: "rental_overdue",
    recipientUserId: renterId,
    channels: ["email", "sms"],
    titleEn: `OVERDUE: Rental ${reference} — ${daysPast} day(s) past due`,
    titleAr: `متأخر: الإيجار ${reference} — ${daysPast} يوم متأخر`,
    bodyEn: `Your rental ${reference} is ${daysPast} day(s) overdue. Return the item immediately to avoid legal enforcement of your Sanad (promissory note).`,
    bodyAr: `الإيجار ${reference} متأخر ${daysPast} يوم. يرجى إعادة القطعة فوراً لتجنب تنفيذ السند الإذني.`,
    metadata: { rentalId, daysPast },
  });
}

export async function notifyAssetApproved(ownerId: number, assetTitle: string) {
  return sendNotification({
    type: "asset_approved",
    recipientUserId: ownerId,
    channels: ["email"],
    titleEn: `Asset Approved: ${assetTitle}`,
    titleAr: `تمت الموافقة على: ${assetTitle}`,
    bodyEn: `Your asset "${assetTitle}" has been approved. Please arrange shipment to our warehouse for inspection.`,
    bodyAr: `تمت الموافقة على "${assetTitle}". يرجى ترتيب الشحن إلى مستودعنا للفحص.`,
  });
}

export async function notifyAssetRejected(ownerId: number, assetTitle: string, reason: string) {
  return sendNotification({
    type: "asset_rejected",
    recipientUserId: ownerId,
    channels: ["email"],
    titleEn: `Asset Rejected: ${assetTitle}`,
    titleAr: `تم رفض: ${assetTitle}`,
    bodyEn: `Your asset "${assetTitle}" was not accepted. Reason: ${reason}`,
    bodyAr: `لم يتم قبول "${assetTitle}". السبب: ${reason}`,
  });
}

export async function notifyPayoutReleased(ownerId: number, netSar: number, reference: string) {
  return sendNotification({
    type: "payout_released",
    recipientUserId: ownerId,
    channels: ["email"],
    titleEn: `Payout Released — ${netSar.toFixed(2)} SAR`,
    titleAr: `تم تحويل المبلغ — ${netSar.toFixed(2)} ر.س`,
    bodyEn: `Your payout of ${netSar.toFixed(2)} SAR for rental ${reference} has been released to your account.`,
    bodyAr: `تم تحويل مبلغ ${netSar.toFixed(2)} ر.س لطلب الإيجار ${reference} إلى حسابك.`,
  });
}

export async function notifyDisputeOpened(assignedUserId: number, disputeId: number, category: string) {
  return sendNotification({
    type: "dispute_opened",
    recipientUserId: assignedUserId,
    channels: ["email"],
    titleEn: `New Dispute #${disputeId} — ${category}`,
    titleAr: `نزاع جديد #${disputeId} — ${category}`,
    bodyEn: `A new ${category} dispute has been opened and assigned to you.`,
    bodyAr: `تم فتح نزاع جديد من نوع ${category} وتم تعيينه لك.`,
    metadata: { disputeId },
  });
}
