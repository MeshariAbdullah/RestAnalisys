type Channel = "email" | "sms" | "push";

interface NotificationPayload {
  userId: number;
  channel: Channel;
  template: string;
  data: Record<string, unknown>;
  to?: string;
}

const isDev = !process.env.SMTP_HOST;

async function sendEmail(to: string, template: string, data: Record<string, unknown>): Promise<void> {
  if (isDev) {
    console.log(`[notification:email] → ${to} | template=${template} | data=${JSON.stringify(data)}`);
    return;
  }
  // Production: integrate with SendGrid, Mailgun, or AWS SES
}

async function sendSms(to: string, template: string, data: Record<string, unknown>): Promise<void> {
  if (isDev) {
    console.log(`[notification:sms] → ${to} | template=${template} | data=${JSON.stringify(data)}`);
    return;
  }
  // Production: integrate with Twilio, Unifonic (Saudi), or AWS SNS
}

export async function notify(payload: NotificationPayload): Promise<void> {
  try {
    if (payload.channel === "email") {
      await sendEmail(payload.to ?? "", payload.template, payload.data);
    } else if (payload.channel === "sms") {
      await sendSms(payload.to ?? "", payload.template, payload.data);
    }
  } catch (err) {
    console.error(`[notification:error] Failed to send ${payload.channel} for user=${payload.userId}:`, err);
  }
}

export async function notifyRentalCreated(rental: {
  id: number;
  reference: string;
  renterId: number;
  renterEmail?: string;
  assetTitle: string;
  totalPayableHalalas: number;
}): Promise<void> {
  await notify({
    userId: rental.renterId,
    channel: "email",
    template: "rental_created",
    to: rental.renterEmail,
    data: {
      reference: rental.reference,
      asset: rental.assetTitle,
      total: rental.totalPayableHalalas / 100,
    },
  });
}

export async function notifyPaymentCaptured(payment: {
  userId: number;
  userEmail?: string;
  rentalReference: string;
  amountHalalas: number;
  invoiceNumber?: string;
}): Promise<void> {
  await notify({
    userId: payment.userId,
    channel: "email",
    template: "payment_captured",
    to: payment.userEmail,
    data: {
      reference: payment.rentalReference,
      amount: payment.amountHalalas / 100,
      invoice: payment.invoiceNumber,
    },
  });
}

export async function notifyRentalStatusChange(data: {
  userId: number;
  userEmail?: string;
  userPhone?: string;
  rentalReference: string;
  newStatus: string;
}): Promise<void> {
  await notify({
    userId: data.userId,
    channel: "email",
    template: "rental_status_change",
    to: data.userEmail,
    data: { reference: data.rentalReference, status: data.newStatus },
  });
  if (data.userPhone) {
    await notify({
      userId: data.userId,
      channel: "sms",
      template: "rental_status_sms",
      to: data.userPhone,
      data: { reference: data.rentalReference, status: data.newStatus },
    });
  }
}

export async function notifyDisputeOpened(data: {
  adminEmail?: string;
  rentalReference: string;
  category: string;
  summary: string;
}): Promise<void> {
  await notify({
    userId: 0,
    channel: "email",
    template: "dispute_opened_admin",
    to: data.adminEmail ?? "admin@mlr.sa",
    data: {
      reference: data.rentalReference,
      category: data.category,
      summary: data.summary,
    },
  });
}

export async function notifyOwnerPayout(data: {
  ownerId: number;
  ownerEmail?: string;
  netHalalas: number;
  rentalReference: string;
}): Promise<void> {
  await notify({
    userId: data.ownerId,
    channel: "email",
    template: "owner_payout",
    to: data.ownerEmail,
    data: {
      amount: data.netHalalas / 100,
      reference: data.rentalReference,
    },
  });
}
