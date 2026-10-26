type NotificationChannel = "email" | "sms" | "push";

interface NotificationPayload {
  userId: number;
  channel: NotificationChannel;
  templateKey: string;
  locale: "en" | "ar";
  data: Record<string, string | number>;
}

interface NotificationResult {
  delivered: boolean;
  channel: NotificationChannel;
  messageId: string;
  provider: string;
}

const DEV_MODE = !process.env.NOTIFICATION_PROVIDER_KEY;

async function sendDev(payload: NotificationPayload): Promise<NotificationResult> {
  const messageId = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  console.log(
    `[notification:dev] ${payload.channel} → user:${payload.userId} template:${payload.templateKey} data:${JSON.stringify(payload.data)}`
  );
  return { delivered: true, channel: payload.channel, messageId, provider: "dev-stub" };
}

async function sendProduction(payload: NotificationPayload): Promise<NotificationResult> {
  throw new Error(
    `Production notification provider not configured. Set NOTIFICATION_PROVIDER_KEY to enable.`
  );
}

async function send(payload: NotificationPayload): Promise<NotificationResult> {
  return DEV_MODE ? sendDev(payload) : sendProduction(payload);
}

export async function notifyRentalCreated(userId: number, rentalRef: string, totalSar: number) {
  return send({
    userId,
    channel: "email",
    templateKey: "rental_created",
    locale: "ar",
    data: { rentalRef, totalSar },
  });
}

export async function notifyRentalConfirmed(userId: number, rentalRef: string) {
  return send({
    userId,
    channel: "email",
    templateKey: "rental_confirmed",
    locale: "ar",
    data: { rentalRef },
  });
}

export async function notifyReturnReminder(userId: number, rentalRef: string, endDate: string) {
  return send({
    userId,
    channel: "sms",
    templateKey: "return_reminder",
    locale: "ar",
    data: { rentalRef, endDate },
  });
}

export async function notifyRentalClosed(userId: number, rentalRef: string, outcome: string) {
  return send({
    userId,
    channel: "email",
    templateKey: "rental_closed",
    locale: "ar",
    data: { rentalRef, outcome },
  });
}

export async function notifyOwnerPayout(userId: number, rentalRef: string, netSar: number) {
  return send({
    userId,
    channel: "email",
    templateKey: "owner_payout",
    locale: "ar",
    data: { rentalRef, netSar },
  });
}

export async function notifyDisputeOpened(userId: number, rentalRef: string, disputeId: number) {
  return send({
    userId,
    channel: "email",
    templateKey: "dispute_opened",
    locale: "ar",
    data: { rentalRef, disputeId },
  });
}

export async function notifyDisputeResolved(userId: number, rentalRef: string, resolution: string) {
  return send({
    userId,
    channel: "email",
    templateKey: "dispute_resolved",
    locale: "ar",
    data: { rentalRef, resolution },
  });
}

export async function notifySanadExecution(userId: number, rentalRef: string, sanadRef: string) {
  return send({
    userId,
    channel: "sms",
    templateKey: "sanad_execution",
    locale: "ar",
    data: { rentalRef, sanadRef },
  });
}
