import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import type { NewNotification } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

type NotificationCategory =
  | "rental"
  | "payment"
  | "asset"
  | "inspection"
  | "legal"
  | "dispute"
  | "shipment"
  | "system";

interface CreateNotificationInput {
  userId: number;
  category: NotificationCategory;
  title: string;
  titleAr?: string;
  body: string;
  bodyAr?: string;
  actionUrl?: string;
  entityType?: string;
  entityId?: number;
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  try {
    await db.insert(notifications).values(input as NewNotification);
  } catch (err) {
    console.error("[notification] write failed:", err);
  }
}

export async function createBulkNotifications(
  inputs: CreateNotificationInput[]
): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await db.insert(notifications).values(inputs as NewNotification[]);
  } catch (err) {
    console.error("[notification] bulk write failed:", err);
  }
}

export async function getUserNotifications(
  userId: number,
  limit = 50,
  offset = 0
) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getUnreadCount(userId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
  return Number(row?.count ?? 0);
}

export async function markAsRead(
  notificationId: number,
  userId: number
): Promise<boolean> {
  const result = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      )
    )
    .returning({ id: notifications.id });
  return result.length > 0;
}

export async function markAllAsRead(userId: number): Promise<number> {
  const result = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    )
    .returning({ id: notifications.id });
  return result.length;
}

export function notifyRentalCreated(
  renterId: number,
  ownerId: number,
  rentalId: number,
  assetTitle: string,
  reference: string
) {
  return createBulkNotifications([
    {
      userId: renterId,
      category: "rental",
      title: "Rental Request Created",
      titleAr: "تم إنشاء طلب الإيجار",
      body: `Your rental request ${reference} for "${assetTitle}" is pending risk review.`,
      bodyAr: `طلب الإيجار ${reference} لـ "${assetTitle}" قيد مراجعة المخاطر.`,
      actionUrl: `/my-rentals`,
      entityType: "rental",
      entityId: rentalId,
    },
    {
      userId: ownerId,
      category: "rental",
      title: "New Rental Request",
      titleAr: "طلب إيجار جديد",
      body: `A new rental request ${reference} has been made for your asset "${assetTitle}".`,
      bodyAr: `تم تقديم طلب إيجار جديد ${reference} لأصلك "${assetTitle}".`,
      actionUrl: `/owner`,
      entityType: "rental",
      entityId: rentalId,
    },
  ]);
}

export function notifyPaymentCaptured(
  userId: number,
  rentalReference: string,
  amountSar: string
) {
  return createNotification({
    userId,
    category: "payment",
    title: "Payment Captured",
    titleAr: "تم تحصيل الدفعة",
    body: `Payment of ${amountSar} SAR for rental ${rentalReference} has been captured.`,
    bodyAr: `تم تحصيل ${amountSar} ر.س لطلب الإيجار ${rentalReference}.`,
    actionUrl: `/my-rentals`,
    entityType: "rental",
  });
}

export function notifyAssetApproved(
  ownerId: number,
  assetId: number,
  assetTitle: string
) {
  return createNotification({
    userId: ownerId,
    category: "asset",
    title: "Asset Approved",
    titleAr: "تمت الموافقة على الأصل",
    body: `Your asset "${assetTitle}" has been approved. Please schedule shipment to the platform.`,
    bodyAr: `تمت الموافقة على أصلك "${assetTitle}". يرجى ترتيب الشحن إلى المنصة.`,
    actionUrl: `/owner/assets/${assetId}`,
    entityType: "asset",
    entityId: assetId,
  });
}

export function notifyAssetRejected(
  ownerId: number,
  assetId: number,
  assetTitle: string,
  reason?: string
) {
  return createNotification({
    userId: ownerId,
    category: "asset",
    title: "Asset Rejected",
    titleAr: "تم رفض الأصل",
    body: `Your asset "${assetTitle}" was not approved.${reason ? ` Reason: ${reason}` : ""}`,
    bodyAr: `لم تتم الموافقة على أصلك "${assetTitle}".${reason ? ` السبب: ${reason}` : ""}`,
    actionUrl: `/owner/assets/${assetId}`,
    entityType: "asset",
    entityId: assetId,
  });
}

export function notifyInspectionComplete(
  ownerId: number,
  assetId: number,
  assetTitle: string
) {
  return createNotification({
    userId: ownerId,
    category: "inspection",
    title: "Inspection Complete",
    titleAr: "اكتمل الفحص",
    body: `Inspection for "${assetTitle}" is complete. Please review the valuation.`,
    bodyAr: `اكتمل فحص "${assetTitle}". يرجى مراجعة التقييم.`,
    actionUrl: `/owner/assets/${assetId}`,
    entityType: "asset",
    entityId: assetId,
  });
}

export function notifyDisputeOpened(
  userId: number,
  disputeId: number,
  rentalReference: string
) {
  return createNotification({
    userId,
    category: "dispute",
    title: "Dispute Opened",
    titleAr: "تم فتح نزاع",
    body: `A dispute has been opened for rental ${rentalReference}.`,
    bodyAr: `تم فتح نزاع لطلب الإيجار ${rentalReference}.`,
    actionUrl: `/my-rentals`,
    entityType: "dispute",
    entityId: disputeId,
  });
}

export function notifyDisputeResolved(
  userId: number,
  disputeId: number,
  resolution: string
) {
  return createNotification({
    userId,
    category: "dispute",
    title: "Dispute Resolved",
    titleAr: "تم حل النزاع",
    body: `Your dispute has been resolved: ${resolution}.`,
    bodyAr: `تم حل النزاع الخاص بك: ${resolution}.`,
    entityType: "dispute",
    entityId: disputeId,
  });
}

export function notifyShipmentUpdate(
  userId: number,
  shipmentId: number,
  status: string,
  assetTitle: string
) {
  const statusLabels: Record<string, { en: string; ar: string }> = {
    picked_up: { en: "picked up", ar: "تم الاستلام" },
    in_transit: { en: "in transit", ar: "قيد التوصيل" },
    delivered: { en: "delivered", ar: "تم التوصيل" },
    failed: { en: "delivery failed", ar: "فشل التوصيل" },
  };
  const label = statusLabels[status] ?? { en: status, ar: status };
  return createNotification({
    userId,
    category: "shipment",
    title: "Shipment Update",
    titleAr: "تحديث الشحنة",
    body: `Shipment for "${assetTitle}" is now ${label.en}.`,
    bodyAr: `شحنة "${assetTitle}" الآن ${label.ar}.`,
    entityType: "shipment",
    entityId: shipmentId,
  });
}

export function notifyPayoutReleased(
  ownerId: number,
  amountSar: string,
  rentalReference: string
) {
  return createNotification({
    userId: ownerId,
    category: "payment",
    title: "Payout Released",
    titleAr: "تم تحويل الأرباح",
    body: `Payout of ${amountSar} SAR for rental ${rentalReference} has been released.`,
    bodyAr: `تم تحويل ${amountSar} ر.س لطلب الإيجار ${rentalReference}.`,
    actionUrl: `/owner/payouts`,
    entityType: "payment",
  });
}
