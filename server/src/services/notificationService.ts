import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

type NotificationType =
  | "rental_status"
  | "asset_status"
  | "payment"
  | "dispute"
  | "sanad"
  | "system"
  | "overdue_warning";

interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  title: string;
  titleAr?: string;
  body: string;
  bodyAr?: string;
  referenceType?: string;
  referenceId?: number;
}

export async function notify(input: CreateNotificationInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      titleAr: input.titleAr ?? null,
      body: input.body,
      bodyAr: input.bodyAr ?? null,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
    });
  } catch (err) {
    console.error("[notification] write failed:", err);
  }
}

export async function notifyMany(inputs: CreateNotificationInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await db.insert(notifications).values(
      inputs.map((n) => ({
        userId: n.userId,
        type: n.type,
        title: n.title,
        titleAr: n.titleAr ?? null,
        body: n.body,
        bodyAr: n.bodyAr ?? null,
        referenceType: n.referenceType ?? null,
        referenceId: n.referenceId ?? null,
      }))
    );
  } catch (err) {
    console.error("[notification] batch write failed:", err);
  }
}

export function rentalStatusNotification(
  userId: number,
  rentalReference: string,
  rentalId: number,
  newStatus: string
): CreateNotificationInput {
  const statusMessages: Record<string, { en: string; ar: string }> = {
    pending_legal_signing: {
      en: "Your booking is approved. Please sign the legal agreement.",
      ar: "تمت الموافقة على حجزك. يرجى توقيع الاتفاقية القانونية.",
    },
    pending_payment: {
      en: "Contract signed. Please complete payment.",
      ar: "تم التوقيع. يرجى إتمام الدفع.",
    },
    confirmed: {
      en: "Payment received. Your rental is confirmed!",
      ar: "تم استلام الدفعة. تم تأكيد إيجارك!",
    },
    out_for_delivery: {
      en: "Your item is on its way to you.",
      ar: "العنصر في طريقه إليك.",
    },
    active: {
      en: "Item delivered. Enjoy your rental!",
      ar: "تم التوصيل. استمتع بإيجارك!",
    },
    closed: {
      en: "Rental closed successfully. Thank you!",
      ar: "تم إغلاق الإيجار بنجاح. شكراً لك!",
    },
    cancelled: {
      en: "Your rental has been cancelled.",
      ar: "تم إلغاء إيجارك.",
    },
  };

  const msg = statusMessages[newStatus] ?? {
    en: `Rental status updated to: ${newStatus}`,
    ar: `تم تحديث حالة الإيجار إلى: ${newStatus}`,
  };

  return {
    userId,
    type: "rental_status",
    title: `Rental ${rentalReference}`,
    titleAr: `إيجار ${rentalReference}`,
    body: msg.en,
    bodyAr: msg.ar,
    referenceType: "rental",
    referenceId: rentalId,
  };
}

export function assetStatusNotification(
  userId: number,
  assetTitle: string,
  assetId: number,
  newStatus: string
): CreateNotificationInput {
  const statusMessages: Record<string, { en: string; ar: string }> = {
    awaiting_shipment: {
      en: `"${assetTitle}" approved! Please ship it to our warehouse.`,
      ar: `تمت الموافقة على "${assetTitle}"! يرجى شحنها إلى مستودعنا.`,
    },
    rejected: {
      en: `"${assetTitle}" was not approved for listing.`,
      ar: `لم تتم الموافقة على "${assetTitle}" للإدراج.`,
    },
    inspection_reported: {
      en: `Inspection complete for "${assetTitle}". Review the valuation.`,
      ar: `اكتمل الفحص لـ "${assetTitle}". راجع التقييم.`,
    },
    listed: {
      en: `"${assetTitle}" is now live on the marketplace!`,
      ar: `"${assetTitle}" الآن معروضة في السوق!`,
    },
    rented_out: {
      en: `"${assetTitle}" has been rented out.`,
      ar: `تم تأجير "${assetTitle}".`,
    },
  };

  const msg = statusMessages[newStatus] ?? {
    en: `Asset "${assetTitle}" status: ${newStatus}`,
    ar: `حالة "${assetTitle}": ${newStatus}`,
  };

  return {
    userId,
    type: "asset_status",
    title: assetTitle,
    titleAr: assetTitle,
    body: msg.en,
    bodyAr: msg.ar,
    referenceType: "asset",
    referenceId: assetId,
  };
}
