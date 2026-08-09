import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

export interface NotifyInput {
  userId: number;
  title: string;
  body: string;
  category: "rental" | "asset" | "payment" | "legal" | "system";
  referenceType?: "rental" | "asset" | "payment" | "dispute";
  referenceId?: number;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      title: input.title,
      body: input.body,
      category: input.category,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
    });
  } catch (err) {
    console.error("[notification] write failed:", err);
  }
}

export async function notifyMany(inputs: NotifyInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await db.insert(notifications).values(
      inputs.map((input) => ({
        userId: input.userId,
        title: input.title,
        body: input.body,
        category: input.category,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
      }))
    );
  } catch (err) {
    console.error("[notification] batch write failed:", err);
  }
}
