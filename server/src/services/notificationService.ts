import { db } from "../db/index.js";
import { notifications, type NewNotification } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

export type NotificationType =
  | "rental_status"
  | "asset_status"
  | "payment"
  | "legal"
  | "dispute"
  | "inspection"
  | "shipment"
  | "system"
  | "alert";

export interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  title: string;
  titleAr?: string;
  body: string;
  bodyAr?: string;
  entityType?: string;
  entityId?: number;
  actionUrl?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      titleAr: input.titleAr,
      body: input.body,
      bodyAr: input.bodyAr,
      entityType: input.entityType,
      entityId: input.entityId,
      actionUrl: input.actionUrl,
    })
    .returning();
  return notification;
}

export async function createBulkNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) return [];
  const values = inputs.map((input) => ({
    userId: input.userId,
    type: input.type,
    title: input.title,
    titleAr: input.titleAr,
    body: input.body,
    bodyAr: input.bodyAr,
    entityType: input.entityType,
    entityId: input.entityId,
    actionUrl: input.actionUrl,
  }));
  return db.insert(notifications).values(values).returning();
}

export async function getUserNotifications(
  userId: number,
  opts: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
) {
  const { limit = 20, offset = 0, unreadOnly = false } = opts;

  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) conditions.push(eq(notifications.read, false));

  const rows = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

  return rows;
}

export async function getUnreadCount(userId: number): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return result?.count ?? 0;
}

export async function markAsRead(notificationId: number, userId: number) {
  const [updated] = await db
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning();
  return updated;
}

export async function markAllAsRead(userId: number) {
  await db
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}

export async function notifyRentalStatusChange(
  userId: number,
  rentalId: number,
  rentalRef: string,
  newStatus: string
) {
  const statusMessages: Record<string, { en: string; ar: string }> = {
    confirmed: { en: "Your rental has been confirmed", ar: "تم تأكيد طلب الإيجار" },
    out_for_delivery: { en: "Your rental is out for delivery", ar: "طلبك في الطريق إليك" },
    active: { en: "Your rental has been delivered", ar: "تم تسليم طلب الإيجار" },
    return_in_transit: { en: "Return shipment is in transit", ar: "شحنة الإرجاع في الطريق" },
    closed: { en: "Your rental has been closed successfully", ar: "تم إغلاق الإيجار بنجاح" },
    closed_with_penalty: { en: "Your rental has been closed with a penalty", ar: "تم إغلاق الإيجار مع غرامة" },
    cancelled: { en: "Your rental has been cancelled", ar: "تم إلغاء طلب الإيجار" },
    in_dispute: { en: "A dispute has been opened for your rental", ar: "تم فتح نزاع لطلب الإيجار" },
  };

  const msg = statusMessages[newStatus];
  if (!msg) return;

  return createNotification({
    userId,
    type: "rental_status",
    title: `Rental ${rentalRef}`,
    titleAr: `إيجار ${rentalRef}`,
    body: msg.en,
    bodyAr: msg.ar,
    entityType: "rental",
    entityId: rentalId,
    actionUrl: `/rentals/${rentalId}`,
  });
}

export async function notifyAssetStatusChange(
  userId: number,
  assetId: number,
  assetTitle: string,
  newStatus: string
) {
  const statusMessages: Record<string, { en: string; ar: string }> = {
    rejected: { en: "Your asset submission has been rejected", ar: "تم رفض طلب إضافة المنتج" },
    awaiting_shipment: { en: "Your asset has been approved — schedule shipment", ar: "تمت الموافقة على منتجك — حدد موعد الشحن" },
    inspection_reported: { en: "Inspection complete — review valuation", ar: "تم الفحص — راجع التقييم" },
    listed: { en: "Your asset is now live for rent", ar: "منتجك متاح الآن للإيجار" },
    rented_out: { en: "Your asset has been rented", ar: "تم تأجير منتجك" },
    completed: { en: "Rental cycle complete — asset back in inventory", ar: "دورة الإيجار اكتملت — المنتج في المخزن" },
  };

  const msg = statusMessages[newStatus];
  if (!msg) return;

  return createNotification({
    userId,
    type: "asset_status",
    title: assetTitle,
    titleAr: assetTitle,
    body: msg.en,
    bodyAr: msg.ar,
    entityType: "asset",
    entityId: assetId,
    actionUrl: `/assets/${assetId}`,
  });
}

export async function notifyPayment(
  userId: number,
  rentalId: number,
  amountSar: string,
  type: "charged" | "refunded" | "payout"
) {
  const messages = {
    charged: { en: `Payment of ${amountSar} SAR captured`, ar: `تم خصم ${amountSar} ر.س` },
    refunded: { en: `Refund of ${amountSar} SAR processed`, ar: `تم استرداد ${amountSar} ر.س` },
    payout: { en: `Payout of ${amountSar} SAR released`, ar: `تم صرف ${amountSar} ر.س` },
  };

  const msg = messages[type];
  return createNotification({
    userId,
    type: "payment",
    title: msg.en,
    titleAr: msg.ar,
    body: msg.en,
    bodyAr: msg.ar,
    entityType: "rental",
    entityId: rentalId,
    actionUrl: `/rentals/${rentalId}`,
  });
}
