export interface EmailInput {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export async function sendEmail(input: EmailInput): Promise<{ messageId: string }> {
  if (!process.env.SMTP_HOST) {
    const messageId = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[email:dev] To: ${input.to} | Subject: ${input.subject} | ID: ${messageId}`);
    return { messageId };
  }

  throw new Error("Production SMTP not configured — set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS");
}
