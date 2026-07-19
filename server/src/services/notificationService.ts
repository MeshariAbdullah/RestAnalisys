import nodemailer from "nodemailer";

const DEV_MODE = !process.env.SMTP_HOST;

const transporter = DEV_MODE
  ? null
  : nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

interface SmsPayload {
  to: string;
  message: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ messageId: string }> {
  if (DEV_MODE) {
    console.log(`[DEV EMAIL] To: ${payload.to} | Subject: ${payload.subject}`);
    return { messageId: `dev-${Date.now()}` };
  }

  const info = await transporter!.sendMail({
    from: process.env.SMTP_FROM ?? "MLR Platform <no-reply@mlr.sa>",
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
  return { messageId: info.messageId };
}

export async function sendSms(payload: SmsPayload): Promise<{ sid: string }> {
  if (!process.env.SMS_API_KEY) {
    console.log(`[DEV SMS] To: ${payload.to} | Message: ${payload.message}`);
    return { sid: `dev-sms-${Date.now()}` };
  }

  // Production: integrate with Unifonic or any Saudi SMS provider
  const response = await fetch(process.env.SMS_API_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SMS_API_KEY}`,
    },
    body: JSON.stringify({
      recipient: payload.to,
      body: payload.message,
    }),
  });

  if (!response.ok) {
    throw new Error(`SMS send failed: ${response.status}`);
  }

  const data = (await response.json()) as { sid: string };
  return { sid: data.sid };
}

export async function notifyRentalCreated(renterEmail: string, rentalRef: string): Promise<void> {
  await sendEmail({
    to: renterEmail,
    subject: `MLR - Rental ${rentalRef} Created`,
    html: `<p>Your rental <strong>${rentalRef}</strong> has been created. Please complete the legal signing and payment to confirm your booking.</p>`,
  });
}

export async function notifyRentalConfirmed(renterEmail: string, rentalRef: string): Promise<void> {
  await sendEmail({
    to: renterEmail,
    subject: `MLR - Rental ${rentalRef} Confirmed`,
    html: `<p>Your rental <strong>${rentalRef}</strong> is confirmed! We will prepare your item for delivery.</p>`,
  });
}

export async function notifyAssetApproved(ownerEmail: string, assetTitle: string): Promise<void> {
  await sendEmail({
    to: ownerEmail,
    subject: `MLR - Asset "${assetTitle}" Approved`,
    html: `<p>Your asset <strong>${assetTitle}</strong> has been approved. Please ship it to our warehouse for inspection.</p>`,
  });
}

export async function notifyPasswordReset(email: string, resetToken: string): Promise<void> {
  const resetUrl = `${process.env.CLIENT_URL ?? "http://localhost:5173"}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: email,
    subject: "MLR - Password Reset Request",
    html: `<p>You requested a password reset. Click <a href="${resetUrl}">here</a> to set a new password. This link expires in 1 hour.</p><p>If you did not request this, ignore this email.</p>`,
  });
}

export async function notifyLateReturn(renterEmail: string, renterPhone: string | null, rentalRef: string, daysPastDue: number): Promise<void> {
  await sendEmail({
    to: renterEmail,
    subject: `MLR - OVERDUE: Rental ${rentalRef}`,
    html: `<p>Your rental <strong>${rentalRef}</strong> is <strong>${daysPastDue} day(s) overdue</strong>. Please return the item immediately to avoid penalties and legal enforcement.</p>`,
  });

  if (renterPhone) {
    await sendSms({
      to: renterPhone,
      message: `MLR: Rental ${rentalRef} is ${daysPastDue} days overdue. Return immediately to avoid legal action.`,
    });
  }
}
