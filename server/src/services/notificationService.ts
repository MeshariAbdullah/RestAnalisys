import { db } from "../db/index.js";
import { notifications, users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { sendEmail } from "./emailService.js";

export interface NotifyInput {
  userId: number;
  category: string;
  title: string;
  titleAr?: string;
  body: string;
  bodyAr?: string;
  entityType?: string;
  entityId?: number;
  actionUrl?: string;
  channel?: "in_app" | "email" | "both";
}

export async function notify(input: NotifyInput): Promise<void> {
  const channel = input.channel ?? "both";

  try {
    await db.insert(notifications).values({
      userId: input.userId,
      channel,
      category: input.category,
      title: input.title,
      titleAr: input.titleAr,
      body: input.body,
      bodyAr: input.bodyAr,
      entityType: input.entityType,
      entityId: input.entityId,
      actionUrl: input.actionUrl,
    });

    if (channel === "email" || channel === "both") {
      const [user] = await db
        .select({ email: users.email, fullName: users.fullName })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (user) {
        await sendEmail({
          to: user.email,
          subject: input.title,
          body: input.body,
        });
      }
    }
  } catch (err) {
    console.error("[notification] failed:", err);
  }
}

export async function notifyMultiple(inputs: NotifyInput[]): Promise<void> {
  await Promise.allSettled(inputs.map(notify));
}
