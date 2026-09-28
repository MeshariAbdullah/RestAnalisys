export type NotificationChannel = "sms" | "email" | "push";

export interface NotificationPayload {
  userId: number;
  channel: NotificationChannel;
  templateKey: string;
  templateData: Record<string, string | number>;
  locale?: "ar" | "en";
}

export async function sendNotification(payload: NotificationPayload): Promise<{ sent: boolean; provider: string }> {
  const provider = process.env.NOTIFICATION_PROVIDER;
  if (!provider) {
    console.log(`[notification:dev] ${payload.channel} → user ${payload.userId}: ${payload.templateKey}`, payload.templateData);
    return { sent: true, provider: "dev-console" };
  }

  // Production: integrate with Unifonic (SMS), SES (email), or Firebase (push)
  throw new Error(`Notification provider "${provider}" not yet implemented`);
}

export async function notifyStatusChange(opts: {
  userId: number;
  entityType: string;
  entityId: number;
  oldStatus: string;
  newStatus: string;
}): Promise<void> {
  const templates: Record<string, { channel: NotificationChannel; key: string }> = {
    "rental:pending_payment": { channel: "email", key: "rental_ready_for_payment" },
    "rental:confirmed": { channel: "sms", key: "rental_confirmed" },
    "rental:active": { channel: "sms", key: "rental_active" },
    "rental:closed": { channel: "email", key: "rental_closed" },
    "asset:listed": { channel: "email", key: "asset_listed" },
    "asset:inspection_reported": { channel: "email", key: "asset_valuation_ready" },
    "dispute:resolved_for_renter": { channel: "email", key: "dispute_resolved" },
    "dispute:resolved_for_owner": { channel: "email", key: "dispute_resolved" },
  };

  const lookup = `${opts.entityType}:${opts.newStatus}`;
  const template = templates[lookup];
  if (!template) return;

  try {
    await sendNotification({
      userId: opts.userId,
      channel: template.channel,
      templateKey: template.key,
      templateData: {
        entityType: opts.entityType,
        entityId: opts.entityId,
        oldStatus: opts.oldStatus,
        newStatus: opts.newStatus,
      },
    });
  } catch (err) {
    console.error("[notification] failed to send:", err);
  }
}
