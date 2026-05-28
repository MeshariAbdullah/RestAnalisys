/**
 * Notification service — handles email and SMS dispatch.
 *
 * In dev mode (no SMTP_HOST), logs to console. When SMTP_HOST is configured,
 * sends real emails via nodemailer.
 */

const DEV_MODE = !process.env.SMTP_HOST;

interface EmailPayload {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
}

interface SmsPayload {
  to: string;
  message: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ messageId: string }> {
  if (DEV_MODE) {
    const messageId = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[NOTIFICATION:EMAIL] to=${payload.to} subject="${payload.subject}" messageId=${messageId}`);
    return { messageId };
  }

  // Dynamic import — nodemailer is an optional dependency for production use.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodemailer = await import("nodemailer" as string) as any;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "noreply@mlr.sa",
    to: payload.to,
    subject: payload.subject,
    html: payload.bodyHtml,
    text: payload.bodyText,
  });

  return { messageId: info.messageId as string };
}

export async function sendSms(payload: SmsPayload): Promise<{ messageId: string }> {
  const messageId = `sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (DEV_MODE) {
    console.log(`[NOTIFICATION:SMS] to=${payload.to} message="${payload.message}" messageId=${messageId}`);
    return { messageId };
  }
  // Real SMS integration (Unifonic, Twilio, etc.) would go here
  return { messageId };
}

export async function notifyRentalCreated(renterEmail: string, rentalRef: string): Promise<void> {
  await sendEmail({
    to: renterEmail,
    subject: `MLR - Rental ${rentalRef} Created`,
    bodyHtml: `
      <h2>Rental Created</h2>
      <p>Your rental <strong>${rentalRef}</strong> has been created. Please sign the legal commitment to proceed.</p>
      <p>Login to your MLR dashboard to complete the process.</p>
    `,
  });
}

export async function notifyRentalStatusChange(
  email: string,
  rentalRef: string,
  newStatus: string
): Promise<void> {
  const statusMessages: Record<string, string> = {
    confirmed: "Your payment has been captured. We are preparing your item for delivery.",
    out_for_delivery: "Your luxury item is out for delivery.",
    active: "Your item has been delivered. Enjoy!",
    under_inspection: "Your returned item is under inspection.",
    closed: "Your rental has been closed successfully. Thank you!",
    closed_with_penalty: "Your rental has been closed with a minor penalty applied.",
  };

  const message = statusMessages[newStatus];
  if (!message) return;

  await sendEmail({
    to: email,
    subject: `MLR - Rental ${rentalRef} Update`,
    bodyHtml: `<h2>Rental Update</h2><p>${message}</p><p>Reference: <strong>${rentalRef}</strong></p>`,
  });
}

export async function notifyOverdueRental(email: string, rentalRef: string, daysPastDue: number): Promise<void> {
  await sendEmail({
    to: email,
    subject: `MLR - URGENT: Rental ${rentalRef} is overdue`,
    bodyHtml: `
      <h2>Overdue Rental Notice</h2>
      <p>Your rental <strong>${rentalRef}</strong> is <strong>${daysPastDue} day(s)</strong> past the return date.</p>
      <p>Please return the item immediately to avoid penalties and legal action.</p>
    `,
  });
}

export async function notifyOwnerPayout(email: string, rentalRef: string, netSar: number): Promise<void> {
  await sendEmail({
    to: email,
    subject: `MLR - Payout for Rental ${rentalRef}`,
    bodyHtml: `
      <h2>Payout Processed</h2>
      <p>Your payout of <strong>${netSar.toFixed(2)} SAR</strong> for rental <strong>${rentalRef}</strong> has been processed.</p>
    `,
  });
}
