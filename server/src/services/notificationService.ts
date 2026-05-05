import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";

type NotificationType =
  | "rental.created"
  | "rental.approved"
  | "rental.rejected"
  | "rental.confirmed"
  | "rental.delivered"
  | "rental.returned"
  | "rental.closed"
  | "rental.cancelled"
  | "rental.late_warning"
  | "asset.approved"
  | "asset.rejected"
  | "asset.listed"
  | "asset.rented"
  | "inspection.completed"
  | "legal.pending_signature"
  | "legal.signed"
  | "payment.captured"
  | "payment.refunded"
  | "payout.released"
  | "dispute.opened"
  | "dispute.resolved"
  | "penalty.applied"
  | "review.received";

interface NotificationTemplate {
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
}

const TEMPLATES: Record<string, (vars: Record<string, string>) => NotificationTemplate> = {
  "rental.created": (v) => ({
    title: "Rental Request Created",
    titleAr: "تم إنشاء طلب إيجار",
    body: `Your rental request ${v.reference} for "${v.assetTitle}" has been created and is under risk review.`,
    bodyAr: `تم إنشاء طلب الإيجار ${v.reference} للقطعة "${v.assetTitle}" وهو تحت المراجعة.`,
  }),
  "rental.confirmed": (v) => ({
    title: "Rental Confirmed",
    titleAr: "تم تأكيد الإيجار",
    body: `Your rental ${v.reference} has been confirmed. We're preparing your item for delivery.`,
    bodyAr: `تم تأكيد إيجارك ${v.reference}. نقوم بتجهيز القطعة للتوصيل.`,
  }),
  "rental.delivered": (v) => ({
    title: "Item Delivered",
    titleAr: "تم توصيل القطعة",
    body: `Your rental ${v.reference} has been delivered. Enjoy your luxury item!`,
    bodyAr: `تم توصيل إيجارك ${v.reference}. استمتع بقطعتك الفاخرة!`,
  }),
  "rental.closed": (v) => ({
    title: "Rental Closed",
    titleAr: "تم إغلاق الإيجار",
    body: `Your rental ${v.reference} has been closed successfully.`,
    bodyAr: `تم إغلاق إيجارك ${v.reference} بنجاح.`,
  }),
  "rental.late_warning": (v) => ({
    title: "Late Return Warning",
    titleAr: "تحذير تأخر الإرجاع",
    body: `Your rental ${v.reference} is past the return date. Late fees may apply.`,
    bodyAr: `إيجارك ${v.reference} تجاوز تاريخ الإرجاع. قد تُطبَّق رسوم تأخير.`,
  }),
  "asset.approved": (v) => ({
    title: "Asset Approved",
    titleAr: "تمت الموافقة على القطعة",
    body: `Your asset "${v.assetTitle}" has been approved. Please ship it to our warehouse.`,
    bodyAr: `تمت الموافقة على قطعتك "${v.assetTitle}". يرجى شحنها إلى مستودعنا.`,
  }),
  "asset.rejected": (v) => ({
    title: "Asset Rejected",
    titleAr: "تم رفض القطعة",
    body: `Your asset "${v.assetTitle}" has been rejected. Reason: ${v.reason ?? "N/A"}`,
    bodyAr: `تم رفض قطعتك "${v.assetTitle}". السبب: ${v.reason ?? "غير محدد"}`,
  }),
  "asset.listed": (v) => ({
    title: "Asset Listed",
    titleAr: "تم عرض القطعة",
    body: `Your asset "${v.assetTitle}" is now listed and available for rent.`,
    bodyAr: `قطعتك "${v.assetTitle}" معروضة الآن ومتاحة للإيجار.`,
  }),
  "asset.rented": (v) => ({
    title: "Your Asset Was Rented",
    titleAr: "تم تأجير قطعتك",
    body: `Your asset "${v.assetTitle}" has been rented out (${v.reference}).`,
    bodyAr: `تم تأجير قطعتك "${v.assetTitle}" (${v.reference}).`,
  }),
  "inspection.completed": (v) => ({
    title: "Inspection Complete",
    titleAr: "اكتمل الفحص",
    body: `The inspection for "${v.assetTitle}" is complete. Please review the valuation.`,
    bodyAr: `اكتمل فحص "${v.assetTitle}". يرجى مراجعة التقييم.`,
  }),
  "payment.captured": (v) => ({
    title: "Payment Successful",
    titleAr: "تم الدفع بنجاح",
    body: `Payment of ${v.amount} for rental ${v.reference} has been captured.`,
    bodyAr: `تم تحصيل مبلغ ${v.amount} للإيجار ${v.reference}.`,
  }),
  "payout.released": (v) => ({
    title: "Payout Released",
    titleAr: "تم تحويل الأرباح",
    body: `A payout of ${v.amount} has been released to your account.`,
    bodyAr: `تم تحويل مبلغ ${v.amount} إلى حسابك.`,
  }),
  "dispute.opened": (v) => ({
    title: "Dispute Opened",
    titleAr: "تم فتح نزاع",
    body: `A dispute has been opened for rental ${v.reference}: ${v.summary}`,
    bodyAr: `تم فتح نزاع على الإيجار ${v.reference}: ${v.summary}`,
  }),
  "dispute.resolved": (v) => ({
    title: "Dispute Resolved",
    titleAr: "تم حل النزاع",
    body: `The dispute for rental ${v.reference} has been resolved.`,
    bodyAr: `تم حل النزاع على الإيجار ${v.reference}.`,
  }),
  "penalty.applied": (v) => ({
    title: "Penalty Applied",
    titleAr: "تم تطبيق غرامة",
    body: `A penalty of ${v.amount} has been applied to rental ${v.reference}.`,
    bodyAr: `تم تطبيق غرامة بقيمة ${v.amount} على الإيجار ${v.reference}.`,
  }),
  "review.received": (v) => ({
    title: "New Review Received",
    titleAr: "تم استلام تقييم جديد",
    body: `You received a ${v.rating}-star review for "${v.assetTitle}".`,
    bodyAr: `حصلت على تقييم ${v.rating} نجوم على "${v.assetTitle}".`,
  }),
};

export async function sendNotification(args: {
  userId: number;
  type: NotificationType;
  vars: Record<string, string>;
  entityType?: string;
  entityId?: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const templateFn = TEMPLATES[args.type];
  if (!templateFn) {
    console.error(`[notifications] unknown type: ${args.type}`);
    return;
  }

  const tpl = templateFn(args.vars);

  try {
    await db.insert(notifications).values({
      userId: args.userId,
      channel: "in_app",
      type: args.type,
      title: tpl.title,
      titleAr: tpl.titleAr,
      body: tpl.body,
      bodyAr: tpl.bodyAr,
      entityType: args.entityType,
      entityId: args.entityId,
      metadata: args.metadata as object,
    });
  } catch (err) {
    console.error("[notifications] write failed:", err);
  }
}

export async function getUserNotifications(userId: number, limit = 50) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadCount(userId: number): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return rows.length;
}

export async function markAsRead(notificationId: number, userId: number): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllAsRead(userId: number): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}
