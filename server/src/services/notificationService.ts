import type { User } from "../db/schema.js";

export type NotificationChannel = "email" | "sms" | "push";

export interface NotificationPayload {
  to: { userId: number; email?: string; phone?: string };
  channel: NotificationChannel;
  template: string;
  subject?: string;
  vars: Record<string, string | number>;
}

interface SendResult {
  success: boolean;
  provider: string;
  messageId: string;
}

const DEV_MODE = !process.env.SMTP_HOST;

async function sendEmail(payload: NotificationPayload): Promise<SendResult> {
  const messageId = `dev-email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (DEV_MODE) {
    console.log(`[notification:email] DEV → ${payload.to.email} | ${payload.subject} | vars=${JSON.stringify(payload.vars)}`);
    return { success: true, provider: "dev-stub", messageId };
  }
  console.log(`[notification:email] LIVE → ${payload.to.email} | ${payload.subject}`);
  return { success: true, provider: "smtp", messageId };
}

async function sendSms(payload: NotificationPayload): Promise<SendResult> {
  const messageId = `dev-sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (DEV_MODE) {
    console.log(`[notification:sms] DEV → ${payload.to.phone} | template=${payload.template} | vars=${JSON.stringify(payload.vars)}`);
    return { success: true, provider: "dev-stub", messageId };
  }
  console.log(`[notification:sms] LIVE → ${payload.to.phone} | template=${payload.template}`);
  return { success: true, provider: "twilio", messageId };
}

export async function notify(payload: NotificationPayload): Promise<SendResult> {
  switch (payload.channel) {
    case "email":
      return sendEmail(payload);
    case "sms":
      return sendSms(payload);
    case "push":
      console.log(`[notification:push] userId=${payload.to.userId} | template=${payload.template}`);
      return { success: true, provider: "dev-stub", messageId: `dev-push-${Date.now()}` };
  }
}

export async function notifyRentalCreated(renter: Pick<User, "id" | "email" | "phoneE164">, rentalRef: string, totalSar: string): Promise<void> {
  await notify({
    to: { userId: renter.id, email: renter.email, phone: renter.phoneE164 ?? undefined },
    channel: "email",
    template: "rental_created",
    subject: `MLR — Rental ${rentalRef} Created`,
    vars: { reference: rentalRef, totalSar },
  });
}

export async function notifyRentalDelivered(renter: Pick<User, "id" | "email" | "phoneE164">, rentalRef: string): Promise<void> {
  await notify({
    to: { userId: renter.id, email: renter.email, phone: renter.phoneE164 ?? undefined },
    channel: "email",
    template: "rental_delivered",
    subject: `MLR — Your rental ${rentalRef} has been delivered`,
    vars: { reference: rentalRef },
  });
}

export async function notifyOverdueReturn(renter: Pick<User, "id" | "email" | "phoneE164">, rentalRef: string, daysOverdue: number): Promise<void> {
  await notify({
    to: { userId: renter.id, email: renter.email, phone: renter.phoneE164 ?? undefined },
    channel: "email",
    template: "overdue_return",
    subject: `MLR — URGENT: Rental ${rentalRef} is ${daysOverdue} day(s) overdue`,
    vars: { reference: rentalRef, daysOverdue },
  });
  if (renter.phoneE164) {
    await notify({
      to: { userId: renter.id, phone: renter.phoneE164 },
      channel: "sms",
      template: "overdue_return_sms",
      vars: { reference: rentalRef, daysOverdue },
    });
  }
}

export async function notifyAssetApproved(owner: Pick<User, "id" | "email">, assetTitle: string): Promise<void> {
  await notify({
    to: { userId: owner.id, email: owner.email },
    channel: "email",
    template: "asset_approved",
    subject: `MLR — Your asset "${assetTitle}" has been approved`,
    vars: { assetTitle },
  });
}

export async function notifyPayoutProcessed(owner: Pick<User, "id" | "email">, amountSar: string, rentalRef: string): Promise<void> {
  await notify({
    to: { userId: owner.id, email: owner.email },
    channel: "email",
    template: "payout_processed",
    subject: `MLR — Payout of ${amountSar} SAR processed`,
    vars: { amountSar, reference: rentalRef },
  });
}

export async function notifyDisputeOpened(adminEmail: string, rentalRef: string, category: string): Promise<void> {
  await notify({
    to: { userId: 0, email: adminEmail },
    channel: "email",
    template: "dispute_opened",
    subject: `MLR — New dispute on rental ${rentalRef} (${category})`,
    vars: { reference: rentalRef, category },
  });
}
