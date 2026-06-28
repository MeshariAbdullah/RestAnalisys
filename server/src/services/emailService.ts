/**
 * Email service — dev-mode stub.
 *
 * In development, emails are logged to the console. In production,
 * set EMAIL_PROVIDER + credentials in .env to use a real provider
 * (SendGrid, Mailgun, SES, etc.).
 */

const IS_DEV = !process.env.EMAIL_API_KEY;

interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(msg: EmailMessage): Promise<{ messageId: string }> {
  if (IS_DEV) {
    const id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[email-stub] ${id} → ${msg.to} | ${msg.subject}`);
    return { messageId: id };
  }

  // Production: integrate with SendGrid / Mailgun / SES
  // const provider = process.env.EMAIL_PROVIDER ?? "sendgrid";
  // ... real HTTP call ...
  throw new Error("Production email provider not configured");
}

export async function sendRentalConfirmation(to: string, rentalRef: string, totalSar: string) {
  return sendEmail({
    to,
    subject: `MLR — Rental ${rentalRef} Confirmed`,
    text: `Your rental ${rentalRef} has been confirmed. Total payable: ${totalSar}. You will receive shipping updates soon.`,
  });
}

export async function sendPaymentReceipt(to: string, rentalRef: string, amountSar: string, invoiceNumber: string) {
  return sendEmail({
    to,
    subject: `MLR — Payment Receipt for ${rentalRef}`,
    text: `Payment of ${amountSar} received for rental ${rentalRef}. Invoice: ${invoiceNumber}.`,
  });
}

export async function sendShipmentUpdate(to: string, trackingNumber: string, status: string) {
  return sendEmail({
    to,
    subject: `MLR — Shipment Update`,
    text: `Your shipment ${trackingNumber} is now: ${status}.`,
  });
}

export async function sendDisputeOpened(to: string, disputeId: number, summary: string) {
  return sendEmail({
    to,
    subject: `MLR — Dispute #${disputeId} Opened`,
    text: `A dispute has been opened: ${summary}. Our team will review it shortly.`,
  });
}

export async function sendDisputeResolved(to: string, disputeId: number, resolution: string) {
  return sendEmail({
    to,
    subject: `MLR — Dispute #${disputeId} Resolved`,
    text: `Your dispute #${disputeId} has been resolved: ${resolution}.`,
  });
}
