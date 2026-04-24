/**
 * Notification service — handles email, SMS, and in-app notifications.
 *
 * PLACEHOLDER: in production, wire up an SMTP provider (SendGrid, SES, Mailgun)
 * and an SMS provider (Twilio, Unifonic for KSA). In dev mode, notifications
 * are logged to console and stored in-memory for testing.
 */

import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { formatHalalas } from "../utils/money.js";

const SMTP_HOST = process.env.SMTP_HOST ?? "";
const FROM_EMAIL = process.env.FROM_EMAIL ?? "noreply@mlr.sa";
const PLATFORM_NAME = "MLR Platform";

export type NotificationChannel = "email" | "sms" | "in_app";
export type NotificationEvent =
  | "rental.created"
  | "rental.confirmed"
  | "rental.delivered"
  | "rental.returned"
  | "rental.closed"
  | "rental.cancelled"
  | "asset.submitted"
  | "asset.approved"
  | "asset.rejected"
  | "asset.listed"
  | "payment.captured"
  | "payment.refunded"
  | "payout.released"
  | "dispute.opened"
  | "dispute.resolved"
  | "sanad.issued"
  | "sanad.discharged"
  | "sanad.execution"
  | "legal.signed"
  | "user.blocked"
  | "user.unblocked";

interface NotificationPayload {
  event: NotificationEvent;
  userId: number;
  data: Record<string, unknown>;
  channels?: NotificationChannel[];
}

interface EmailContent {
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

const notificationLog: Array<{
  event: string;
  userId: number;
  channel: string;
  content: EmailContent;
  sentAt: string;
}> = [];

function generateEmailContent(event: NotificationEvent, data: Record<string, unknown>): EmailContent {
  const templates: Record<NotificationEvent, () => EmailContent> = {
    "rental.created": () => ({
      subject: `Rental Created — ${data.reference}`,
      bodyHtml: `<h2>Your Rental Has Been Created</h2>
        <p>Rental reference: <strong>${data.reference}</strong></p>
        <p>Asset: ${data.assetTitle}</p>
        <p>Period: ${data.startDate} to ${data.endDate}</p>
        <p>Total: ${formatHalalas(data.totalHalalas as number)}</p>
        <p>Please sign the legal commitment to proceed.</p>`,
      bodyText: `Rental ${data.reference} created. Asset: ${data.assetTitle}. Period: ${data.startDate} to ${data.endDate}. Total: ${formatHalalas(data.totalHalalas as number)}. Please sign the legal commitment.`,
    }),
    "rental.confirmed": () => ({
      subject: `Payment Confirmed — ${data.reference}`,
      bodyHtml: `<h2>Payment Confirmed</h2>
        <p>Rental <strong>${data.reference}</strong> is now confirmed.</p>
        <p>We will schedule delivery shortly.</p>`,
      bodyText: `Payment for rental ${data.reference} confirmed. Delivery will be scheduled.`,
    }),
    "rental.delivered": () => ({
      subject: `Item Delivered — ${data.reference}`,
      bodyHtml: `<h2>Your Item Has Been Delivered</h2>
        <p>Rental <strong>${data.reference}</strong> — your item is now with you.</p>
        <p>Please return by: ${data.endDate}</p>`,
      bodyText: `Item delivered for rental ${data.reference}. Return by: ${data.endDate}.`,
    }),
    "rental.returned": () => ({
      subject: `Item Received Back — ${data.reference}`,
      bodyHtml: `<h2>Item Returned</h2>
        <p>We have received the item for rental <strong>${data.reference}</strong>.</p>
        <p>It is now under inspection.</p>`,
      bodyText: `Item returned for rental ${data.reference}. Under inspection.`,
    }),
    "rental.closed": () => ({
      subject: `Rental Closed — ${data.reference}`,
      bodyHtml: `<h2>Rental Complete</h2>
        <p>Rental <strong>${data.reference}</strong> has been closed.</p>
        <p>Outcome: ${data.outcome}</p>
        <p>Thank you for using ${PLATFORM_NAME}.</p>`,
      bodyText: `Rental ${data.reference} closed. Outcome: ${data.outcome}.`,
    }),
    "rental.cancelled": () => ({
      subject: `Rental Cancelled — ${data.reference}`,
      bodyHtml: `<h2>Rental Cancelled</h2>
        <p>Rental <strong>${data.reference}</strong> has been cancelled.</p>
        <p>Reason: ${data.reason ?? "N/A"}</p>`,
      bodyText: `Rental ${data.reference} cancelled. Reason: ${data.reason ?? "N/A"}.`,
    }),
    "asset.submitted": () => ({
      subject: `Asset Submitted — ${data.title}`,
      bodyHtml: `<h2>Asset Submitted for Review</h2>
        <p>Your asset <strong>${data.title}</strong> (${data.brand}) has been submitted.</p>
        <p>Our team will review it within 24-48 hours.</p>`,
      bodyText: `Asset "${data.title}" submitted for review. Expect response in 24-48 hours.`,
    }),
    "asset.approved": () => ({
      subject: `Asset Approved — ${data.title}`,
      bodyHtml: `<h2>Asset Approved</h2>
        <p>Your asset <strong>${data.title}</strong> has been approved!</p>
        <p>Please ship it to our warehouse for inspection.</p>`,
      bodyText: `Asset "${data.title}" approved. Ship to our warehouse for inspection.`,
    }),
    "asset.rejected": () => ({
      subject: `Asset Not Approved — ${data.title}`,
      bodyHtml: `<h2>Asset Not Approved</h2>
        <p>Unfortunately, <strong>${data.title}</strong> was not approved.</p>
        <p>Reason: ${data.rejectionReason ?? "Does not meet platform criteria"}</p>`,
      bodyText: `Asset "${data.title}" not approved. Reason: ${data.rejectionReason ?? "Does not meet platform criteria"}.`,
    }),
    "asset.listed": () => ({
      subject: `Asset Live — ${data.title}`,
      bodyHtml: `<h2>Your Asset Is Now Live</h2>
        <p><strong>${data.title}</strong> is now listed on the platform.</p>
        <p>Daily rental price: ${formatHalalas(data.dailyPriceHalalas as number)}</p>`,
      bodyText: `Asset "${data.title}" is live. Daily price: ${formatHalalas(data.dailyPriceHalalas as number)}.`,
    }),
    "payment.captured": () => ({
      subject: `Payment Received — ${formatHalalas(data.amountHalalas as number)}`,
      bodyHtml: `<h2>Payment Captured</h2>
        <p>Amount: ${formatHalalas(data.amountHalalas as number)}</p>
        <p>Invoice: ${data.invoiceNumber ?? "N/A"}</p>`,
      bodyText: `Payment of ${formatHalalas(data.amountHalalas as number)} captured. Invoice: ${data.invoiceNumber ?? "N/A"}.`,
    }),
    "payment.refunded": () => ({
      subject: `Refund Processed — ${formatHalalas(data.amountHalalas as number)}`,
      bodyHtml: `<h2>Refund Processed</h2>
        <p>Refund amount: ${formatHalalas(data.amountHalalas as number)}</p>
        <p>It may take 3-5 business days to reflect in your account.</p>`,
      bodyText: `Refund of ${formatHalalas(data.amountHalalas as number)} processed. 3-5 business days to reflect.`,
    }),
    "payout.released": () => ({
      subject: `Payout Released — ${formatHalalas(data.netHalalas as number)}`,
      bodyHtml: `<h2>Owner Payout Released</h2>
        <p>Net payout: ${formatHalalas(data.netHalalas as number)}</p>
        <p>Funds will be transferred to your registered IBAN.</p>`,
      bodyText: `Payout of ${formatHalalas(data.netHalalas as number)} released to your IBAN.`,
    }),
    "dispute.opened": () => ({
      subject: `Dispute Opened — #${data.disputeId}`,
      bodyHtml: `<h2>Dispute Filed</h2>
        <p>A dispute has been opened for rental <strong>${data.reference}</strong>.</p>
        <p>Category: ${data.category}</p>
        <p>Our team will investigate within 48 hours.</p>`,
      bodyText: `Dispute #${data.disputeId} opened for rental ${data.reference}. Category: ${data.category}.`,
    }),
    "dispute.resolved": () => ({
      subject: `Dispute Resolved — #${data.disputeId}`,
      bodyHtml: `<h2>Dispute Resolved</h2>
        <p>Dispute #${data.disputeId} has been resolved.</p>
        <p>Resolution: ${data.resolution}</p>`,
      bodyText: `Dispute #${data.disputeId} resolved. Resolution: ${data.resolution}.`,
    }),
    "sanad.issued": () => ({
      subject: `Sanad Issued — ${data.nafithReference}`,
      bodyHtml: `<h2>Promissory Note Issued</h2>
        <p>A Nafith Sanad has been issued for your rental commitment.</p>
        <p>Reference: ${data.nafithReference}</p>
        <p>Amount: ${formatHalalas(data.principalHalalas as number)}</p>`,
      bodyText: `Sanad ${data.nafithReference} issued. Amount: ${formatHalalas(data.principalHalalas as number)}.`,
    }),
    "sanad.discharged": () => ({
      subject: `Sanad Discharged — ${data.nafithReference}`,
      bodyHtml: `<h2>Promissory Note Discharged</h2>
        <p>Sanad <strong>${data.nafithReference}</strong> has been discharged.</p>
        <p>No further obligations remain.</p>`,
      bodyText: `Sanad ${data.nafithReference} discharged. No further obligations.`,
    }),
    "sanad.execution": () => ({
      subject: `URGENT: Sanad Under Execution — ${data.nafithReference}`,
      bodyHtml: `<h2>Sanad Execution Initiated</h2>
        <p>Sanad <strong>${data.nafithReference}</strong> has been submitted for legal execution via Najiz.</p>
        <p>Case number: ${data.executionCaseNumber}</p>
        <p>Please contact us immediately to resolve this matter.</p>`,
      bodyText: `URGENT: Sanad ${data.nafithReference} under execution. Case: ${data.executionCaseNumber}. Contact us immediately.`,
    }),
    "legal.signed": () => ({
      subject: `Legal Commitment Signed — ${data.reference}`,
      bodyHtml: `<h2>Legal Commitment Signed</h2>
        <p>You have signed the legal commitment for rental <strong>${data.reference}</strong>.</p>
        <p>Commitment amount: ${formatHalalas(data.commitmentHalalas as number)}</p>
        <p>Please proceed with payment to confirm your rental.</p>`,
      bodyText: `Legal commitment signed for rental ${data.reference}. Amount: ${formatHalalas(data.commitmentHalalas as number)}. Proceed with payment.`,
    }),
    "user.blocked": () => ({
      subject: `Account Suspended — ${PLATFORM_NAME}`,
      bodyHtml: `<h2>Account Suspended</h2>
        <p>Your ${PLATFORM_NAME} account has been suspended.</p>
        <p>Reason: ${data.reason ?? "Policy violation"}</p>
        <p>Contact support for more information.</p>`,
      bodyText: `Account suspended. Reason: ${data.reason ?? "Policy violation"}. Contact support.`,
    }),
    "user.unblocked": () => ({
      subject: `Account Restored — ${PLATFORM_NAME}`,
      bodyHtml: `<h2>Account Restored</h2>
        <p>Your ${PLATFORM_NAME} account has been restored. You may now log in.</p>`,
      bodyText: `Your account has been restored. You may log in.`,
    }),
  };

  const template = templates[event];
  if (!template) {
    return {
      subject: `${PLATFORM_NAME} Notification`,
      bodyHtml: `<p>Event: ${event}</p><pre>${JSON.stringify(data, null, 2)}</pre>`,
      bodyText: `Event: ${event}. Data: ${JSON.stringify(data)}`,
    };
  }

  return template();
}

async function sendEmail(to: string, content: EmailContent): Promise<boolean> {
  if (!SMTP_HOST) {
    console.log(`[notification:email] To: ${to} | Subject: ${content.subject}`);
    return true;
  }

  // Production: implement SMTP/API call here
  // Example with SendGrid, SES, Mailgun, etc.
  throw new Error("SMTP production client not configured");
}

async function sendSms(phone: string, message: string): Promise<boolean> {
  const smsProvider = process.env.SMS_PROVIDER ?? "";
  if (!smsProvider) {
    console.log(`[notification:sms] To: ${phone} | Message: ${message}`);
    return true;
  }

  throw new Error("SMS production client not configured");
}

export async function notify(payload: NotificationPayload): Promise<void> {
  const channels = payload.channels ?? ["email"];

  try {
    const [user] = await db
      .select({ email: users.email, phone: users.phoneE164 })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) return;

    const emailContent = generateEmailContent(payload.event, payload.data);

    for (const channel of channels) {
      try {
        if (channel === "email" && user.email) {
          await sendEmail(user.email, emailContent);
          notificationLog.push({
            event: payload.event,
            userId: payload.userId,
            channel: "email",
            content: emailContent,
            sentAt: new Date().toISOString(),
          });
        }

        if (channel === "sms" && user.phone) {
          await sendSms(user.phone, emailContent.bodyText);
          notificationLog.push({
            event: payload.event,
            userId: payload.userId,
            channel: "sms",
            content: emailContent,
            sentAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error(`[notification] ${channel} failed for user ${payload.userId}:`, err);
      }
    }
  } catch (err) {
    console.error(`[notification] failed for event ${payload.event}:`, err);
  }
}

export function getRecentNotifications(limit = 50) {
  return notificationLog.slice(-limit);
}
