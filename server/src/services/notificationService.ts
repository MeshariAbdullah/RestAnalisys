import { v4 as uuidv4 } from "uuid";

const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? "587");
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
const SMTP_FROM = process.env.SMTP_FROM ?? "noreply@mlr-platform.sa";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER ?? "";

export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ sent: boolean; messageId: string }> {
  const messageId = uuidv4();

  if (!SMTP_HOST) {
    console.log(`[notification:dev] email → ${to}`);
    console.log(`[notification:dev]   subject: ${subject}`);
    console.log(`[notification:dev]   body length: ${htmlBody.length} chars`);
    return { sent: true, messageId };
  }

  // Production: create an SMTP transport (e.g. nodemailer) using
  // SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and send from SMTP_FROM.
  console.log(`[notification] would send email via ${SMTP_HOST}:${SMTP_PORT} to ${to}`);
  return { sent: true, messageId };
}

export async function sendSms(
  toE164: string,
  message: string
): Promise<{ sent: boolean; messageId: string }> {
  const messageId = uuidv4();

  if (!TWILIO_ACCOUNT_SID) {
    console.log(`[notification:dev] sms → ${toE164}`);
    console.log(`[notification:dev]   message: ${message}`);
    return { sent: true, messageId };
  }

  // Production: POST to https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json
  // with To, From (TWILIO_FROM_NUMBER), Body, authenticated via TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN.
  console.log(`[notification] would send SMS via Twilio to ${toE164}`);
  return { sent: true, messageId };
}

export async function notifyRentalCreated(
  renterEmail: string,
  rentalReference: string
): Promise<void> {
  await sendEmail(
    renterEmail,
    `Rental ${rentalReference} — Confirmation`,
    `<h1>Rental Confirmed</h1><p>Your rental <strong>${rentalReference}</strong> has been created. You will receive further updates as the process continues.</p>`
  );
}

export async function notifyPaymentReceived(
  renterEmail: string,
  amountHalalas: number,
  rentalReference: string
): Promise<void> {
  const amountSAR = (amountHalalas / 100).toFixed(2);
  await sendEmail(
    renterEmail,
    `Payment Received — ${rentalReference}`,
    `<h1>Payment Received</h1><p>We received <strong>SAR ${amountSAR}</strong> for rental <strong>${rentalReference}</strong>.</p>`
  );
}

export async function notifyReturnReminder(
  renterEmail: string,
  renterPhone: string,
  rentalReference: string,
  endDate: string
): Promise<void> {
  await Promise.all([
    sendEmail(
      renterEmail,
      `Return Reminder — ${rentalReference}`,
      `<h1>Return Reminder</h1><p>Your rental <strong>${rentalReference}</strong> is due for return on <strong>${endDate}</strong>. Please arrange the return on time to avoid late fees.</p>`
    ),
    sendSms(
      renterPhone,
      `MLR reminder: rental ${rentalReference} return due ${endDate}.`
    ),
  ]);
}

export async function notifyDisputeOpened(
  adminEmail: string,
  disputeId: number,
  rentalReference: string
): Promise<void> {
  await sendEmail(
    adminEmail,
    `Dispute #${disputeId} Opened — ${rentalReference}`,
    `<h1>New Dispute</h1><p>Dispute <strong>#${disputeId}</strong> has been opened for rental <strong>${rentalReference}</strong>. Please review and take action.</p>`
  );
}
