import crypto from "node:crypto";

export type NotificationChannel = "email" | "sms" | "push";
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export interface NotificationPayload {
  recipientUserId: number;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  templateKey: string;
  templateVars: Record<string, string | number>;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
}

export interface NotificationResult {
  id: string;
  channel: NotificationChannel;
  status: "sent" | "queued" | "failed";
  provider: string;
  sentAt?: string;
  error?: string;
}

const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@mlr.sa";
const EMAIL_API_KEY = process.env.EMAIL_API_KEY ?? "";
const SMS_API_KEY = process.env.SMS_API_KEY ?? "";

export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  const id = `NOTIF-${crypto.randomBytes(8).toString("hex")}`;

  if (payload.channel === "email") {
    return sendEmail(id, payload);
  }
  if (payload.channel === "sms") {
    return sendSms(id, payload);
  }
  return { id, channel: payload.channel, status: "queued", provider: "stub" };
}

async function sendEmail(id: string, p: NotificationPayload): Promise<NotificationResult> {
  if (!EMAIL_API_KEY) {
    console.log(`[notification:email] DEV → to=${p.recipientEmail} subject="${p.subject}" template=${p.templateKey}`);
    return { id, channel: "email", status: "sent", provider: "dev-stub", sentAt: new Date().toISOString() };
  }
  throw new Error("Email provider not configured");
}

async function sendSms(id: string, p: NotificationPayload): Promise<NotificationResult> {
  if (!SMS_API_KEY) {
    console.log(`[notification:sms] DEV → to=${p.recipientPhone} template=${p.templateKey}`);
    return { id, channel: "sms", status: "sent", provider: "dev-stub", sentAt: new Date().toISOString() };
  }
  throw new Error("SMS provider not configured");
}

// ── Convenience helpers for common events ──────────────────────────────────

export async function notifyRentalCreated(data: {
  renterEmail: string;
  renterUserId: number;
  rentalReference: string;
  assetTitle: string;
  totalSar: string;
}): Promise<void> {
  try {
    await sendNotification({
      recipientUserId: data.renterUserId,
      recipientEmail: data.renterEmail,
      channel: "email",
      priority: "high",
      templateKey: "rental_created",
      subject: `Rental ${data.rentalReference} — Awaiting Signature`,
      templateVars: {
        rentalReference: data.rentalReference,
        assetTitle: data.assetTitle,
        totalSar: data.totalSar,
      },
    });
  } catch (err) {
    console.error("[notification] rental_created failed:", err);
  }
}

export async function notifyPaymentCaptured(data: {
  renterEmail: string;
  renterUserId: number;
  rentalReference: string;
  amountSar: string;
  invoiceNumber: string;
}): Promise<void> {
  try {
    await sendNotification({
      recipientUserId: data.renterUserId,
      recipientEmail: data.renterEmail,
      channel: "email",
      priority: "normal",
      templateKey: "payment_captured",
      subject: `Payment Received — ${data.rentalReference}`,
      templateVars: {
        rentalReference: data.rentalReference,
        amountSar: data.amountSar,
        invoiceNumber: data.invoiceNumber,
      },
    });
  } catch (err) {
    console.error("[notification] payment_captured failed:", err);
  }
}

export async function notifyAssetApproved(data: {
  ownerEmail: string;
  ownerUserId: number;
  assetTitle: string;
}): Promise<void> {
  try {
    await sendNotification({
      recipientUserId: data.ownerUserId,
      recipientEmail: data.ownerEmail,
      channel: "email",
      priority: "normal",
      templateKey: "asset_approved",
      subject: `Your Asset "${data.assetTitle}" Has Been Approved`,
      templateVars: { assetTitle: data.assetTitle },
    });
  } catch (err) {
    console.error("[notification] asset_approved failed:", err);
  }
}

export async function notifyAssetRejected(data: {
  ownerEmail: string;
  ownerUserId: number;
  assetTitle: string;
  reason: string;
}): Promise<void> {
  try {
    await sendNotification({
      recipientUserId: data.ownerUserId,
      recipientEmail: data.ownerEmail,
      channel: "email",
      priority: "normal",
      templateKey: "asset_rejected",
      subject: `Asset Submission Update — "${data.assetTitle}"`,
      templateVars: { assetTitle: data.assetTitle, reason: data.reason },
    });
  } catch (err) {
    console.error("[notification] asset_rejected failed:", err);
  }
}

export async function notifyDisputeOpened(data: {
  adminEmail: string;
  adminUserId: number;
  rentalReference: string;
  category: string;
  summary: string;
}): Promise<void> {
  try {
    await sendNotification({
      recipientUserId: data.adminUserId,
      recipientEmail: data.adminEmail,
      channel: "email",
      priority: "urgent",
      templateKey: "dispute_opened",
      subject: `New Dispute — ${data.rentalReference} [${data.category}]`,
      templateVars: {
        rentalReference: data.rentalReference,
        category: data.category,
        summary: data.summary,
      },
    });
  } catch (err) {
    console.error("[notification] dispute_opened failed:", err);
  }
}

export async function notifyPayoutReleased(data: {
  ownerEmail: string;
  ownerUserId: number;
  netSar: string;
  rentalReference: string;
}): Promise<void> {
  try {
    await sendNotification({
      recipientUserId: data.ownerUserId,
      recipientEmail: data.ownerEmail,
      channel: "email",
      priority: "normal",
      templateKey: "payout_released",
      subject: `Payout Sent — ${data.netSar} SAR`,
      templateVars: {
        netSar: data.netSar,
        rentalReference: data.rentalReference,
      },
    });
  } catch (err) {
    console.error("[notification] payout_released failed:", err);
  }
}

export async function notifyRentalOverdue(data: {
  renterEmail: string;
  renterUserId: number;
  rentalReference: string;
  assetTitle: string;
  daysPastDue: number;
}): Promise<void> {
  try {
    await sendNotification({
      recipientUserId: data.renterUserId,
      recipientEmail: data.renterEmail,
      channel: "email",
      priority: "urgent",
      templateKey: "rental_overdue",
      subject: `OVERDUE: Return Required — ${data.rentalReference}`,
      templateVars: {
        rentalReference: data.rentalReference,
        assetTitle: data.assetTitle,
        daysPastDue: data.daysPastDue,
      },
    });
  } catch (err) {
    console.error("[notification] rental_overdue failed:", err);
  }
}
