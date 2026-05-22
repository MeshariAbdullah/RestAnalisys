/**
 * Notification service — creates user-facing notifications for key platform events.
 *
 * All messages include Arabic translations to support the Saudi user base.
 * Notifications are fire-and-forget (failures are logged but never break the
 * primary flow).
 */

import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

// ─────────────────────────────────────────────────────────────────────────────
// Core insert
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateNotificationInput {
  userId: number;
  type: string;
  title: string;
  titleAr?: string;
  body: string;
  bodyAr?: string;
  entityType?: string;
  entityId?: number;
}

export async function createNotification(data: CreateNotificationInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      titleAr: data.titleAr ?? null,
      body: data.body,
      bodyAr: data.bodyAr ?? null,
      entityType: data.entityType ?? null,
      entityId: data.entityId ?? null,
    });
  } catch (err) {
    // Never let notification failures break the primary flow
    console.error("[notification] write failed:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers for common notification types
// ─────────────────────────────────────────────────────────────────────────────

export async function notifyRentalCreated(
  renterId: number,
  rentalReference: string,
  assetTitle: string
): Promise<void> {
  await createNotification({
    userId: renterId,
    type: "rental_created",
    title: "Rental Request Created",
    titleAr: "تم إنشاء طلب الإيجار",
    body: `Your rental request ${rentalReference} for "${assetTitle}" has been created and is under review.`,
    bodyAr: `تم إنشاء طلب الإيجار ${rentalReference} للمنتج "${assetTitle}" وهو قيد المراجعة.`,
    entityType: "rental",
  });
}

export async function notifyRentalStatusChanged(
  userId: number,
  rentalReference: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  const statusLabelsAr: Record<string, string> = {
    pending_risk_review: "قيد مراجعة المخاطر",
    pending_legal_signing: "بانتظار التوقيع القانوني",
    pending_payment: "بانتظار الدفع",
    confirmed: "مؤكد",
    out_for_delivery: "في الطريق للتسليم",
    active: "نشط",
    return_in_transit: "في طريق الإعادة",
    under_inspection: "قيد الفحص",
    closed: "مغلق",
    closed_with_penalty: "مغلق مع غرامة",
    in_dispute: "في نزاع",
    enforcement: "قيد التنفيذ",
    cancelled: "ملغي",
  };

  const newStatusAr = statusLabelsAr[newStatus] ?? newStatus;

  await createNotification({
    userId,
    type: "rental_status_changed",
    title: "Rental Status Updated",
    titleAr: "تم تحديث حالة الإيجار",
    body: `Rental ${rentalReference} status changed from "${oldStatus}" to "${newStatus}".`,
    bodyAr: `تم تغيير حالة الإيجار ${rentalReference} إلى "${newStatusAr}".`,
    entityType: "rental",
  });
}

export async function notifyAssetApproved(
  ownerId: number,
  assetTitle: string
): Promise<void> {
  await createNotification({
    userId: ownerId,
    type: "asset_approved",
    title: "Asset Approved",
    titleAr: "تمت الموافقة على الأصل",
    body: `Your asset "${assetTitle}" has been approved and is ready for the next step.`,
    bodyAr: `تمت الموافقة على أصلك "${assetTitle}" وهو جاهز للخطوة التالية.`,
    entityType: "asset",
  });
}

export async function notifyAssetRejected(
  ownerId: number,
  assetTitle: string,
  reason: string
): Promise<void> {
  await createNotification({
    userId: ownerId,
    type: "asset_rejected",
    title: "Asset Rejected",
    titleAr: "تم رفض الأصل",
    body: `Your asset "${assetTitle}" has been rejected. Reason: ${reason}`,
    bodyAr: `تم رفض أصلك "${assetTitle}". السبب: ${reason}`,
    entityType: "asset",
  });
}

export async function notifyPaymentCaptured(
  renterId: number,
  rentalReference: string,
  amountHalalas: number
): Promise<void> {
  const amountSar = (amountHalalas / 100).toFixed(2);

  await createNotification({
    userId: renterId,
    type: "payment_captured",
    title: "Payment Captured",
    titleAr: "تم تحصيل الدفعة",
    body: `Payment of SAR ${amountSar} for rental ${rentalReference} has been captured successfully.`,
    bodyAr: `تم تحصيل مبلغ ${amountSar} ريال سعودي للإيجار ${rentalReference} بنجاح.`,
    entityType: "payment",
  });
}

export async function notifyInspectionComplete(
  ownerId: number,
  assetTitle: string
): Promise<void> {
  await createNotification({
    userId: ownerId,
    type: "inspection_complete",
    title: "Inspection Complete",
    titleAr: "اكتمل الفحص",
    body: `The inspection for your asset "${assetTitle}" has been completed. Please review the valuation.`,
    bodyAr: `اكتمل فحص أصلك "${assetTitle}". يرجى مراجعة التقييم.`,
    entityType: "asset",
  });
}

export async function notifyDisputeUpdate(
  userId: number,
  disputeId: number,
  newStatus: string
): Promise<void> {
  const disputeStatusAr: Record<string, string> = {
    open: "مفتوح",
    investigating: "قيد التحقيق",
    awaiting_evidence: "بانتظار الأدلة",
    resolved_for_renter: "تم الحل لصالح المستأجر",
    resolved_for_platform: "تم الحل لصالح المنصة",
    resolved_for_owner: "تم الحل لصالح المالك",
    escalated_to_legal: "تم التصعيد للشؤون القانونية",
    closed: "مغلق",
  };

  const statusAr = disputeStatusAr[newStatus] ?? newStatus;

  await createNotification({
    userId,
    type: "dispute_update",
    title: "Dispute Updated",
    titleAr: "تم تحديث النزاع",
    body: `Dispute #${disputeId} status has been updated to "${newStatus}".`,
    bodyAr: `تم تحديث حالة النزاع #${disputeId} إلى "${statusAr}".`,
    entityType: "dispute",
    entityId: disputeId,
  });
}
