import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

interface NotifyInput {
  userId: number;
  type: string;
  title: string;
  body: string;
  linkTo?: string;
  payload?: Record<string, unknown>;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      linkTo: input.linkTo ?? null,
      payloadJson: (input.payload as object) ?? null,
    });
  } catch (err) {
    console.error("[notify] write failed:", err);
  }
}

export async function notifyMultiple(inputs: NotifyInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await db.insert(notifications).values(
      inputs.map((i) => ({
        userId: i.userId,
        type: i.type,
        title: i.title,
        body: i.body,
        linkTo: i.linkTo ?? null,
        payloadJson: (i.payload as object) ?? null,
      }))
    );
  } catch (err) {
    console.error("[notify] bulk write failed:", err);
  }
}
