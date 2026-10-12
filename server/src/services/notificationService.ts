/**
 * Notification service — stub for email and SMS notifications.
 *
 * In production, swap the placeholders for real providers:
 *   - Email: SendGrid, AWS SES, or Mailgun
 *   - SMS: Twilio, Unifonic (Saudi-focused), or AWS SNS
 *
 * Every notification is recorded in-memory for now (replace with a real
 * queue like BullMQ or SQS in production).
 */

export type NotificationChannel = "email" | "sms" | "push";

export interface NotificationPayload {
  userId: number;
  channel: NotificationChannel;
  template: string;
  subject?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  data: Record<string, unknown>;
}

export interface NotificationResult {
  id: string;
  channel: NotificationChannel;
  status: "sent" | "queued" | "failed";
  sentAt: string;
}

const sentLog: NotificationResult[] = [];

function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function sendEmail(payload: NotificationPayload): Promise<NotificationResult> {
  const id = generateId();
  const result: NotificationResult = {
    id,
    channel: "email",
    status: process.env.EMAIL_PROVIDER ? "sent" : "queued",
    sentAt: new Date().toISOString(),
  };

  if (process.env.EMAIL_PROVIDER) {
    console.log(`[notification] Email sent to ${payload.recipientEmail}: ${payload.subject}`);
  } else {
    console.log(
      `[notification] Email STUB → ${payload.recipientEmail} | template=${payload.template} | subject=${payload.subject}`
    );
  }

  sentLog.push(result);
  return result;
}

async function sendSms(payload: NotificationPayload): Promise<NotificationResult> {
  const id = generateId();
  const result: NotificationResult = {
    id,
    channel: "sms",
    status: process.env.SMS_PROVIDER ? "sent" : "queued",
    sentAt: new Date().toISOString(),
  };

  if (process.env.SMS_PROVIDER) {
    console.log(`[notification] SMS sent to ${payload.recipientPhone}`);
  } else {
    console.log(
      `[notification] SMS STUB → ${payload.recipientPhone} | template=${payload.template}`
    );
  }

  sentLog.push(result);
  return result;
}

export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  switch (payload.channel) {
    case "email":
      return sendEmail(payload);
    case "sms":
      return sendSms(payload);
    case "push":
      const id = generateId();
      const result: NotificationResult = {
        id,
        channel: "push",
        status: "queued",
        sentAt: new Date().toISOString(),
      };
      console.log(
        `[notification] Push STUB → userId=${payload.userId} | template=${payload.template}`
      );
      sentLog.push(result);
      return result;
    default:
      throw new Error(`Unknown notification channel: ${payload.channel}`);
  }
}

export async function notifyRentalCreated(args: {
  renterId: number;
  renterEmail: string;
  rentalReference: string;
  assetTitle: string;
  totalPayableHalalas: number;
}): Promise<void> {
  await sendNotification({
    userId: args.renterId,
    channel: "email",
    template: "rental_created",
    subject: `Rental ${args.rentalReference} — Awaiting Legal Signature`,
    recipientEmail: args.renterEmail,
    data: {
      rentalReference: args.rentalReference,
      assetTitle: args.assetTitle,
      totalSar: (args.totalPayableHalalas / 100).toFixed(2),
    },
  });
}

export async function notifyRentalConfirmed(args: {
  renterId: number;
  renterEmail: string;
  ownerId: number;
  ownerEmail: string;
  rentalReference: string;
  assetTitle: string;
}): Promise<void> {
  await sendNotification({
    userId: args.renterId,
    channel: "email",
    template: "rental_confirmed_renter",
    subject: `Rental ${args.rentalReference} — Payment Confirmed`,
    recipientEmail: args.renterEmail,
    data: { rentalReference: args.rentalReference, assetTitle: args.assetTitle },
  });
  await sendNotification({
    userId: args.ownerId,
    channel: "email",
    template: "rental_confirmed_owner",
    subject: `Your asset "${args.assetTitle}" has been rented`,
    recipientEmail: args.ownerEmail,
    data: { rentalReference: args.rentalReference, assetTitle: args.assetTitle },
  });
}

export async function notifyAssetStatusChange(args: {
  ownerId: number;
  ownerEmail: string;
  assetTitle: string;
  oldStatus: string;
  newStatus: string;
}): Promise<void> {
  await sendNotification({
    userId: args.ownerId,
    channel: "email",
    template: "asset_status_change",
    subject: `Asset "${args.assetTitle}" — Status Update`,
    recipientEmail: args.ownerEmail,
    data: {
      assetTitle: args.assetTitle,
      oldStatus: args.oldStatus,
      newStatus: args.newStatus,
    },
  });
}

export async function notifyLateReturn(args: {
  renterId: number;
  renterEmail: string;
  renterPhone?: string;
  rentalReference: string;
  assetTitle: string;
  daysOverdue: number;
}): Promise<void> {
  await sendNotification({
    userId: args.renterId,
    channel: "email",
    template: "late_return_warning",
    subject: `OVERDUE: Rental ${args.rentalReference} — ${args.daysOverdue} day(s) past due`,
    recipientEmail: args.renterEmail,
    data: {
      rentalReference: args.rentalReference,
      assetTitle: args.assetTitle,
      daysOverdue: args.daysOverdue,
    },
  });
  if (args.renterPhone) {
    await sendNotification({
      userId: args.renterId,
      channel: "sms",
      template: "late_return_sms",
      recipientPhone: args.renterPhone,
      data: {
        rentalReference: args.rentalReference,
        daysOverdue: args.daysOverdue,
      },
    });
  }
}

export async function notifyDisputeOpened(args: {
  userId: number;
  userEmail: string;
  rentalReference: string;
  category: string;
}): Promise<void> {
  await sendNotification({
    userId: args.userId,
    channel: "email",
    template: "dispute_opened",
    subject: `Dispute opened for rental ${args.rentalReference}`,
    recipientEmail: args.userEmail,
    data: {
      rentalReference: args.rentalReference,
      category: args.category,
    },
  });
}

export async function notifyPayoutReleased(args: {
  ownerId: number;
  ownerEmail: string;
  netSar: string;
  rentalReference: string;
}): Promise<void> {
  await sendNotification({
    userId: args.ownerId,
    channel: "email",
    template: "payout_released",
    subject: `Payout of ${args.netSar} SAR released`,
    recipientEmail: args.ownerEmail,
    data: {
      netSar: args.netSar,
      rentalReference: args.rentalReference,
    },
  });
}

export function getRecentNotifications(limit = 50): NotificationResult[] {
  return sentLog.slice(-limit).reverse();
}
