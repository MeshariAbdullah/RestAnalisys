import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export type NotificationType =
  | "rental_created"
  | "rental_confirmed"
  | "rental_delivered"
  | "rental_returned"
  | "rental_closed"
  | "legal_signed"
  | "payment_captured"
  | "payment_failed"
  | "payment_refunded"
  | "dispute_opened"
  | "dispute_resolved"
  | "asset_approved"
  | "asset_rejected"
  | "sanad_issued"
  | "sanad_executed"
  | "payout_released"
  | "verification_code";

export type NotificationChannel = "email" | "sms" | "in_app";

export interface NotificationPayload {
  userId: number;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

interface NotificationRecord extends NotificationPayload {
  id: number;
  sentAt: string;
  status: "sent" | "failed" | "pending";
  error?: string;
}

const notificationLog: NotificationRecord[] = [];
let nextId = 1;

const EMAIL_ENABLED = !!process.env.SMTP_HOST;
const SMS_ENABLED = !!process.env.SMS_API_KEY;

export async function sendNotification(payload: NotificationPayload): Promise<NotificationRecord> {
  const record: NotificationRecord = {
    ...payload,
    id: nextId++,
    sentAt: new Date().toISOString(),
    status: "pending",
  };

  try {
    if (payload.channel === "email" && EMAIL_ENABLED) {
      // Production: send via SMTP
      // await sendEmail(payload);
      record.status = "sent";
    } else if (payload.channel === "sms" && SMS_ENABLED) {
      // Production: send via SMS gateway
      // await sendSms(payload);
      record.status = "sent";
    } else {
      // Dev mode: log and mark as sent
      console.log(`[notification] ${payload.channel}:${payload.type} → user:${payload.userId} — ${payload.body}`);
      record.status = "sent";
    }
  } catch (err) {
    record.status = "failed";
    record.error = (err as Error).message;
    console.error(`[notification] failed:`, err);
  }

  notificationLog.push(record);
  if (notificationLog.length > 10000) notificationLog.splice(0, 5000);

  return record;
}

export async function notifyUser(
  userId: number,
  type: NotificationType,
  body: string,
  subject?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return;

  await sendNotification({
    userId,
    type,
    channel: "in_app",
    subject,
    body,
    metadata,
  });

  if (user.emailVerified && user.email) {
    await sendNotification({
      userId,
      type,
      channel: "email",
      subject: subject ?? `MLR: ${type.replace(/_/g, " ")}`,
      body,
      metadata,
    });
  }

  if (user.phoneVerified && user.phoneE164) {
    await sendNotification({
      userId,
      type,
      channel: "sms",
      body,
      metadata,
    });
  }
}

export function getRecentNotifications(userId?: number, limit = 50): NotificationRecord[] {
  let results = notificationLog;
  if (userId) results = results.filter((n) => n.userId === userId);
  return results.slice(-limit).reverse();
}
