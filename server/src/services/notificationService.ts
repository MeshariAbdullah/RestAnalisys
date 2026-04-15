/**
 * Notification service — persists a bilingual (EN/AR) notification row for a
 * given user. Used from rental, legal and payout flows so dashboards can pick
 * them up with a simple GET /notifications/mine poll.
 *
 * All notification writes are best-effort: a failure here must never block the
 * primary flow (a payment capture, a legal signing, etc.). Errors are logged
 * but swallowed.
 */

import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

export type NotificationType =
  | "rental.legal_ready"
  | "rental.payment_pending"
  | "rental.confirmed"
  | "rental.out_for_delivery"
  | "rental.delivered"
  | "rental.returned"
  | "rental.closed"
  | "rental.closed_with_penalty"
  | "rental.enforcement"
  | "rental.cancelled"
  | "payout.released"
  | "asset.valuation_ready"
  | "asset.rejected"
  | "asset.approved"
  | "sanad.discharged"
  | "sanad.execution_started";

export interface NotifyArgs {
  userId: number;
  type: NotificationType;
  subjectType: "rental" | "asset" | "payout" | "sanad" | "user";
  subjectId?: number;
  titleEn: string;
  titleAr: string;
  bodyEn?: string;
  bodyAr?: string;
  actionUrl?: string;
}

export async function notify(args: NotifyArgs): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: args.userId,
      type: args.type,
      subjectType: args.subjectType,
      subjectId: args.subjectId,
      titleEn: args.titleEn,
      titleAr: args.titleAr,
      bodyEn: args.bodyEn,
      bodyAr: args.bodyAr,
      actionUrl: args.actionUrl,
    });
  } catch (err) {
    console.error("[notify] failed", args.type, err);
  }
}

/**
 * Bilingual copy templates for rental lifecycle notifications. Each template
 * returns the pair of strings so services can fire a consistent message.
 */
export const rentalCopy = {
  confirmed(ref: string) {
    return {
      titleEn: `Rental ${ref} confirmed`,
      titleAr: `تم تأكيد الإيجار ${ref}`,
      bodyEn: "Payment captured. We will schedule the delivery shortly.",
      bodyAr: "تم استلام الدفع. سنقوم بجدولة التوصيل قريبًا.",
    };
  },
  outForDelivery(ref: string) {
    return {
      titleEn: `Rental ${ref} is out for delivery`,
      titleAr: `الإيجار ${ref} في طريقه للتوصيل`,
    };
  },
  delivered(ref: string) {
    return {
      titleEn: `Rental ${ref} delivered`,
      titleAr: `تم تسليم الإيجار ${ref}`,
      bodyEn: "Your luxury item is now with you. Enjoy!",
      bodyAr: "قطعتك الفاخرة بين يديك الآن. استمتع!",
    };
  },
  returned(ref: string) {
    return {
      titleEn: `Rental ${ref} returned`,
      titleAr: `تم إرجاع الإيجار ${ref}`,
      bodyEn: "We received the item and our inspector is evaluating it.",
      bodyAr: "استلمنا القطعة ويقوم المفتش بتقييمها.",
    };
  },
  closedClean(ref: string) {
    return {
      titleEn: `Rental ${ref} closed cleanly`,
      titleAr: `تم إغلاق الإيجار ${ref} بشكل نظيف`,
      bodyEn: "The Sanad has been discharged. Your trust score increased.",
      bodyAr: "تم إلغاء السند وزاد مستوى ثقتك.",
    };
  },
  closedPenalty(ref: string) {
    return {
      titleEn: `Rental ${ref} closed with a penalty`,
      titleAr: `تم إغلاق الإيجار ${ref} مع غرامة`,
      bodyEn: "Please pay the outstanding penalty to fully discharge the Sanad.",
      bodyAr: "الرجاء سداد الغرامة المستحقة لإلغاء السند بالكامل.",
    };
  },
  enforcement(ref: string, outcome: string) {
    return {
      titleEn: `Rental ${ref} moved to enforcement (${outcome})`,
      titleAr: `تمت إحالة الإيجار ${ref} للتنفيذ (${outcome})`,
      bodyEn: "We may submit your Sanad to Najiz execution if unresolved.",
      bodyAr: "قد يتم تقديم سندك إلى ناجز للتنفيذ إذا لم يتم الحل.",
    };
  },
};
