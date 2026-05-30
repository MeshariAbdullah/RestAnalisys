import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";

export type NotificationChannel = "in_app" | "email" | "sms";
export type NotificationType =
  | "rental_created"
  | "rental_approved"
  | "rental_rejected"
  | "rental_payment_received"
  | "rental_shipped"
  | "rental_delivered"
  | "rental_return_due"
  | "rental_overdue"
  | "rental_closed"
  | "asset_approved"
  | "asset_rejected"
  | "asset_inspection_complete"
  | "dispute_opened"
  | "dispute_resolved"
  | "payout_released"
  | "sanad_issued"
  | "sanad_matured"
  | "account_blocked"
  | "system_alert";

interface SendNotificationInput {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  channel?: NotificationChannel;
  metadata?: Record<string, unknown>;
}

const IS_DEV = !process.env.SMTP_HOST;

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (IS_DEV) {
    console.log(`[notification:email:dev] to=${to} subject="${subject}"`);
    return;
  }
  console.log(`[notification:email:prod] to=${to} subject="${subject}"`);
}

async function sendSms(phone: string, message: string): Promise<void> {
  if (IS_DEV) {
    console.log(`[notification:sms:dev] phone=${phone} message="${message.slice(0, 50)}..."`);
    return;
  }
  console.log(`[notification:sms:prod] phone=${phone}`);
}

export async function sendNotification(input: SendNotificationInput): Promise<void> {
  const channel = input.channel ?? "in_app";

  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      channel,
      title: input.title,
      body: input.body,
      metadataJson: input.metadata ?? null,
    });
  } catch (err) {
    console.error("[notification] failed to persist:", err);
  }

  if (channel === "email") {
    await sendEmail("", input.title, input.body);
  } else if (channel === "sms") {
    await sendSms("", input.body);
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

export async function markNotificationRead(notificationId: number, userId: number) {
  return db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.id, notificationId), eq(notifications.userId, userId))
    )
    .returning();
}

export async function markAllRead(userId: number) {
  return db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.readAt, null as any))
    );
}

export async function getUnreadCount(userId: number): Promise<number> {
  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.readAt, null as any))
    );
  return rows.length;
}
