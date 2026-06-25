import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";

export type NotificationType =
  | "rental_created"
  | "rental_confirmed"
  | "rental_delivered"
  | "rental_returned"
  | "rental_closed"
  | "rental_cancelled"
  | "asset_approved"
  | "asset_rejected"
  | "inspection_completed"
  | "valuation_ready"
  | "payment_captured"
  | "payout_released"
  | "dispute_opened"
  | "dispute_resolved"
  | "sanad_issued"
  | "sanad_executed"
  | "late_return_warning"
  | "system_alert";

export interface NotificationPayload {
  userId: number;
  type: NotificationType;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  entityType?: string;
  entityId?: number;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

const TEMPLATES: Record<string, { title: string; titleAr: string; body: string; bodyAr: string }> = {
  rental_created: {
    title: "Rental Created",
    titleAr: "تم إنشاء الإيجار",
    body: "Your rental request #{ref} has been created and is pending legal signing.",
    bodyAr: "تم إنشاء طلب الإيجار #{ref} وهو بانتظار التوقيع القانوني.",
  },
  rental_confirmed: {
    title: "Rental Confirmed",
    titleAr: "تم تأكيد الإيجار",
    body: "Rental #{ref} is confirmed. Your item will be shipped soon.",
    bodyAr: "تم تأكيد الإيجار #{ref}. سيتم شحن القطعة قريباً.",
  },
  rental_delivered: {
    title: "Item Delivered",
    titleAr: "تم التوصيل",
    body: "Your rental item for #{ref} has been delivered.",
    bodyAr: "تم توصيل قطعة الإيجار #{ref}.",
  },
  rental_closed: {
    title: "Rental Closed",
    titleAr: "تم إغلاق الإيجار",
    body: "Rental #{ref} has been closed successfully.",
    bodyAr: "تم إغلاق الإيجار #{ref} بنجاح.",
  },
  asset_approved: {
    title: "Asset Approved",
    titleAr: "تمت الموافقة على القطعة",
    body: "Your asset '#{title}' has been approved and will proceed to inspection.",
    bodyAr: "تمت الموافقة على قطعتك '#{title}' وستنتقل للفحص.",
  },
  asset_rejected: {
    title: "Asset Rejected",
    titleAr: "تم رفض القطعة",
    body: "Your asset '#{title}' was not approved: #{reason}",
    bodyAr: "لم تتم الموافقة على قطعتك '#{title}': #{reason}",
  },
  payment_captured: {
    title: "Payment Successful",
    titleAr: "تم الدفع بنجاح",
    body: "Payment of #{amount} SAR for rental #{ref} has been captured.",
    bodyAr: "تم تحصيل مبلغ #{amount} ريال للإيجار #{ref}.",
  },
  payout_released: {
    title: "Payout Released",
    titleAr: "تم تحويل المبلغ",
    body: "A payout of #{amount} SAR has been released to your account.",
    bodyAr: "تم تحويل مبلغ #{amount} ريال إلى حسابك.",
  },
  dispute_opened: {
    title: "Dispute Opened",
    titleAr: "تم فتح نزاع",
    body: "A dispute has been opened for rental #{ref}.",
    bodyAr: "تم فتح نزاع للإيجار #{ref}.",
  },
  dispute_resolved: {
    title: "Dispute Resolved",
    titleAr: "تم حل النزاع",
    body: "The dispute for rental #{ref} has been resolved.",
    bodyAr: "تم حل النزاع الخاص بالإيجار #{ref}.",
  },
  rental_cancelled: {
    title: "Rental Cancelled",
    titleAr: "تم إلغاء الإيجار",
    body: "Rental #{ref} has been cancelled.",
    bodyAr: "تم إلغاء الإيجار #{ref}.",
  },
  late_return_warning: {
    title: "Late Return Warning",
    titleAr: "تحذير تأخر إرجاع",
    body: "Rental #{ref} is past its return date. Please return the item promptly.",
    bodyAr: "الإيجار #{ref} تجاوز تاريخ الإرجاع. يرجى إرجاع القطعة في أقرب وقت.",
  },
};

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/#\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

export async function createNotification(payload: NotificationPayload): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      titleAr: payload.titleAr,
      body: payload.body,
      bodyAr: payload.bodyAr,
      entityType: payload.entityType,
      entityId: payload.entityId,
      actionUrl: payload.actionUrl,
      metadataJson: (payload.metadata as object) ?? null,
    });
  } catch (err) {
    console.error("[notification] write failed:", err);
  }
}

export async function notifyFromTemplate(
  userId: number,
  type: NotificationType,
  vars: Record<string, string>,
  opts?: { entityType?: string; entityId?: number; actionUrl?: string }
): Promise<void> {
  const tmpl = TEMPLATES[type];
  if (!tmpl) {
    console.error(`[notification] unknown template: ${type}`);
    return;
  }
  await createNotification({
    userId,
    type,
    title: interpolate(tmpl.title, vars),
    titleAr: interpolate(tmpl.titleAr, vars),
    body: interpolate(tmpl.body, vars),
    bodyAr: interpolate(tmpl.bodyAr, vars),
    entityType: opts?.entityType,
    entityId: opts?.entityId,
    actionUrl: opts?.actionUrl,
  });
}

export async function getUserNotifications(
  userId: number,
  opts?: { unreadOnly?: boolean; limit?: number }
) {
  const limit = opts?.limit ?? 50;
  const conditions = [eq(notifications.userId, userId)];
  if (opts?.unreadOnly) {
    conditions.push(eq(notifications.read, false));
  }
  return db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(notificationId: number, userId: number): Promise<boolean> {
  const result = await db
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning();
  return result.length > 0;
}

export async function markAllRead(userId: number): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}
