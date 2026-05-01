import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { formatHalalas } from "../utils/money.js";

type Channel = "email" | "sms";

interface NotificationPayload {
  userId: number;
  channel: Channel;
  template: string;
  subject?: string;
  variables: Record<string, string | number>;
}

interface NotificationResult {
  success: boolean;
  channel: Channel;
  messageId?: string;
  error?: string;
}

const DEV_MODE = !process.env.EMAIL_API_KEY && !process.env.SMS_API_KEY;

async function sendEmail(to: string, subject: string, body: string): Promise<NotificationResult> {
  if (DEV_MODE) {
    console.log(`[notification:email] TO=${to} SUBJECT="${subject}"\n${body}\n`);
    return { success: true, channel: "email", messageId: `dev-${Date.now()}` };
  }

  // Production: integrate with SendGrid / AWS SES / Resend
  // const response = await fetch("https://api.sendgrid.com/v3/mail/send", { ... });
  return { success: false, channel: "email", error: "Email provider not configured" };
}

async function sendSms(to: string, body: string): Promise<NotificationResult> {
  if (DEV_MODE) {
    console.log(`[notification:sms] TO=${to} BODY="${body}"\n`);
    return { success: true, channel: "sms", messageId: `dev-${Date.now()}` };
  }

  // Production: integrate with Twilio / Unifonic (Saudi provider)
  // const response = await fetch("https://api.unifonic.com/rest/Messages/Send", { ... });
  return { success: false, channel: "sms", error: "SMS provider not configured" };
}

const TEMPLATES: Record<string, { subject: string; body: (v: Record<string, string | number>) => string; sms: (v: Record<string, string | number>) => string }> = {
  rental_created: {
    subject: "MLR — Rental Created",
    body: (v) => `Dear ${v.renterName},\n\nYour rental ${v.reference} has been created for "${v.assetTitle}".\nTotal: ${v.total}\nPlease sign the legal commitment to proceed.\n\n— MLR Platform`,
    sms: (v) => `MLR: Rental ${v.reference} created. Total ${v.total}. Sign commitment to proceed.`,
  },
  legal_signed: {
    subject: "MLR — Legal Commitment Signed",
    body: (v) => `Dear ${v.renterName},\n\nYour legal commitment for rental ${v.reference} has been signed.\nCommitment: ${v.commitment}\nPlease proceed with payment.\n\n— MLR Platform`,
    sms: (v) => `MLR: Legal commitment signed for ${v.reference}. Proceed to payment.`,
  },
  payment_captured: {
    subject: "MLR — Payment Confirmed",
    body: (v) => `Dear ${v.renterName},\n\nPayment of ${v.amount} for rental ${v.reference} has been captured.\nInvoice: ${v.invoiceNumber}\n\n— MLR Platform`,
    sms: (v) => `MLR: Payment ${v.amount} confirmed for ${v.reference}. Invoice ${v.invoiceNumber}.`,
  },
  rental_delivered: {
    subject: "MLR — Item Delivered",
    body: (v) => `Dear ${v.renterName},\n\nYour rental ${v.reference} ("${v.assetTitle}") has been delivered.\nReturn by: ${v.endDate}\n\n— MLR Platform`,
    sms: (v) => `MLR: ${v.assetTitle} delivered for rental ${v.reference}. Return by ${v.endDate}.`,
  },
  rental_closed: {
    subject: "MLR — Rental Closed",
    body: (v) => `Dear ${v.renterName},\n\nRental ${v.reference} has been closed (${v.outcome}).\nThank you for using MLR.\n\n— MLR Platform`,
    sms: (v) => `MLR: Rental ${v.reference} closed (${v.outcome}). Thank you!`,
  },
  owner_payout: {
    subject: "MLR — Payout Released",
    body: (v) => `Dear ${v.ownerName},\n\nA payout of ${v.amount} has been released for rental ${v.reference}.\n\n— MLR Platform`,
    sms: (v) => `MLR: Payout ${v.amount} released for rental ${v.reference}.`,
  },
  late_return_warning: {
    subject: "MLR — Late Return Warning",
    body: (v) => `Dear ${v.renterName},\n\nRental ${v.reference} is overdue. The return date was ${v.endDate}.\nPlease return the item immediately to avoid penalties.\n\n— MLR Platform`,
    sms: (v) => `MLR: WARNING — Rental ${v.reference} overdue since ${v.endDate}. Return immediately.`,
  },
  dispute_opened: {
    subject: "MLR — Dispute Opened",
    body: (v) => `A dispute has been opened for rental ${v.reference}.\nCategory: ${v.category}\nSummary: ${v.summary}\n\n— MLR Platform`,
    sms: (v) => `MLR: Dispute opened on rental ${v.reference} (${v.category}).`,
  },
  inspection_complete: {
    subject: "MLR — Inspection Complete",
    body: (v) => `Dear ${v.ownerName},\n\nInspection for your asset "${v.assetTitle}" is complete.\nCondition: ${v.grade} (${v.score}/100)\nMarket Value: ${v.marketValue}\n\nPlease review and approve the valuation.\n\n— MLR Platform`,
    sms: (v) => `MLR: Inspection done for "${v.assetTitle}". Grade: ${v.grade}. Review valuation in app.`,
  },
  asset_approved: {
    subject: "MLR — Asset Approved",
    body: (v) => `Dear ${v.ownerName},\n\nYour asset "${v.assetTitle}" has been approved by the platform.\nPlease ship it to our warehouse to proceed.\n\n— MLR Platform`,
    sms: (v) => `MLR: "${v.assetTitle}" approved! Ship to our warehouse to list.`,
  },
  sanad_expiring: {
    subject: "MLR — Sanad Approaching Maturity",
    body: (v) => `Dear ${v.renterName},\n\nThe Sanad for rental ${v.reference} is approaching maturity on ${v.maturityDate}.\nPlease ensure the item is returned on time.\n\n— MLR Platform`,
    sms: (v) => `MLR: Sanad for ${v.reference} maturing ${v.maturityDate}. Return item on time.`,
  },
};

export async function notify(payload: NotificationPayload): Promise<NotificationResult> {
  const template = TEMPLATES[payload.template];
  if (!template) {
    return { success: false, channel: payload.channel, error: `Unknown template: ${payload.template}` };
  }

  const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!user) {
    return { success: false, channel: payload.channel, error: `User ${payload.userId} not found` };
  }

  try {
    if (payload.channel === "email") {
      return await sendEmail(user.email, payload.subject ?? template.subject, template.body(payload.variables));
    }
    if (payload.channel === "sms" && user.phoneE164) {
      return await sendSms(user.phoneE164, template.sms(payload.variables));
    }
    return { success: false, channel: payload.channel, error: "No phone number on file" };
  } catch (err) {
    console.error(`[notification] ${payload.channel} failed:`, err);
    return { success: false, channel: payload.channel, error: String(err) };
  }
}

export async function notifyBoth(userId: number, template: string, variables: Record<string, string | number>): Promise<void> {
  await Promise.allSettled([
    notify({ userId, channel: "email", template, variables }),
    notify({ userId, channel: "sms", template, variables }),
  ]);
}

export async function notifyRentalCreated(renterId: number, reference: string, assetTitle: string, totalHalalas: number): Promise<void> {
  const [renter] = await db.select().from(users).where(eq(users.id, renterId)).limit(1);
  await notifyBoth(renterId, "rental_created", {
    renterName: renter?.fullName ?? "Customer",
    reference,
    assetTitle,
    total: formatHalalas(totalHalalas),
  });
}

export async function notifyPaymentCaptured(renterId: number, reference: string, amountHalalas: number, invoiceNumber: string): Promise<void> {
  const [renter] = await db.select().from(users).where(eq(users.id, renterId)).limit(1);
  await notifyBoth(renterId, "payment_captured", {
    renterName: renter?.fullName ?? "Customer",
    reference,
    amount: formatHalalas(amountHalalas),
    invoiceNumber,
  });
}

export async function notifyLateReturn(renterId: number, reference: string, endDate: string): Promise<void> {
  const [renter] = await db.select().from(users).where(eq(users.id, renterId)).limit(1);
  await notifyBoth(renterId, "late_return_warning", {
    renterName: renter?.fullName ?? "Customer",
    reference,
    endDate,
  });
}

export async function notifyOwnerPayout(ownerId: number, reference: string, netHalalas: number): Promise<void> {
  const [owner] = await db.select().from(users).where(eq(users.id, ownerId)).limit(1);
  await notifyBoth(ownerId, "owner_payout", {
    ownerName: owner?.fullName ?? "Owner",
    reference,
    amount: formatHalalas(netHalalas),
  });
}

export async function notifyInspectionComplete(ownerId: number, assetTitle: string, grade: string, score: number, marketValueHalalas: number): Promise<void> {
  const [owner] = await db.select().from(users).where(eq(users.id, ownerId)).limit(1);
  await notifyBoth(ownerId, "inspection_complete", {
    ownerName: owner?.fullName ?? "Owner",
    assetTitle,
    grade,
    score,
    marketValue: formatHalalas(marketValueHalalas),
  });
}
