export type NotificationType =
  | "rental_created"
  | "rental_confirmed"
  | "rental_delivered"
  | "rental_returned"
  | "rental_closed"
  | "rental_cancelled"
  | "asset_approved"
  | "asset_rejected"
  | "dispute_opened"
  | "dispute_resolved"
  | "payout_released"
  | "legal_signing_required"
  | "late_return_warning"
  | "sanad_issued";

interface NotificationPayload {
  type: NotificationType;
  recipientUserId: number;
  recipientEmail?: string;
  recipientPhone?: string;
  subject: string;
  bodyEn: string;
  bodyAr: string;
  metadata?: Record<string, unknown>;
}

const IS_DEV = process.env.NODE_ENV !== "production";

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  if (IS_DEV) {
    console.log(`[NOTIFICATION] ${payload.type} → User #${payload.recipientUserId}`);
    console.log(`  Subject: ${payload.subject}`);
    console.log(`  EN: ${payload.bodyEn}`);
    console.log(`  AR: ${payload.bodyAr}`);
    return;
  }

  // Production: integrate with SendGrid/Twilio/Unifonic
  // Email
  if (payload.recipientEmail && process.env.SENDGRID_API_KEY) {
    // await sendEmail(payload);
  }
  // SMS (Unifonic for Saudi Arabia)
  if (payload.recipientPhone && process.env.UNIFONIC_API_KEY) {
    // await sendSms(payload);
  }
}

export function buildRentalCreatedNotification(args: {
  renterId: number;
  renterEmail: string;
  rentalReference: string;
  assetTitle: string;
  totalPayableSar: string;
}): NotificationPayload {
  return {
    type: "rental_created",
    recipientUserId: args.renterId,
    recipientEmail: args.renterEmail,
    subject: `Rental ${args.rentalReference} Created`,
    bodyEn: `Your rental request for "${args.assetTitle}" has been created. Total payable: ${args.totalPayableSar}. Please sign the legal commitment to proceed.`,
    bodyAr: `تم إنشاء طلب الإيجار الخاص بك لـ "${args.assetTitle}". المبلغ الإجمالي: ${args.totalPayableSar}. يرجى توقيع الالتزام القانوني للمتابعة.`,
    metadata: { rentalReference: args.rentalReference },
  };
}

export function buildAssetApprovedNotification(args: {
  ownerId: number;
  ownerEmail: string;
  assetTitle: string;
}): NotificationPayload {
  return {
    type: "asset_approved",
    recipientUserId: args.ownerId,
    recipientEmail: args.ownerEmail,
    subject: `Asset "${args.assetTitle}" Approved`,
    bodyEn: `Your asset "${args.assetTitle}" has been approved and is now awaiting shipment to our facility for inspection.`,
    bodyAr: `تمت الموافقة على الأصل "${args.assetTitle}" وهو الآن في انتظار الشحن إلى منشأتنا للفحص.`,
  };
}

export function buildLateReturnWarningNotification(args: {
  renterId: number;
  renterEmail: string;
  rentalReference: string;
  assetTitle: string;
  daysOverdue: number;
}): NotificationPayload {
  return {
    type: "late_return_warning",
    recipientUserId: args.renterId,
    recipientEmail: args.renterEmail,
    subject: `Late Return Warning - ${args.rentalReference}`,
    bodyEn: `Your rental "${args.assetTitle}" (${args.rentalReference}) is ${args.daysOverdue} day(s) overdue. Please return the item immediately to avoid penalties.`,
    bodyAr: `إيجارك "${args.assetTitle}" (${args.rentalReference}) متأخر بـ ${args.daysOverdue} يوم/أيام. يرجى إعادة القطعة فوراً لتجنب الغرامات.`,
  };
}

export function buildPayoutReleasedNotification(args: {
  ownerId: number;
  ownerEmail: string;
  netAmountSar: string;
  rentalReference: string;
}): NotificationPayload {
  return {
    type: "payout_released",
    recipientUserId: args.ownerId,
    recipientEmail: args.ownerEmail,
    subject: `Payout Released - ${args.rentalReference}`,
    bodyEn: `A payout of ${args.netAmountSar} has been released for rental ${args.rentalReference}. It will be deposited to your registered bank account.`,
    bodyAr: `تم إصدار دفعة بقيمة ${args.netAmountSar} للإيجار ${args.rentalReference}. سيتم إيداعها في حسابك البنكي المسجل.`,
  };
}
