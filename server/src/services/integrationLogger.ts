import { db } from "../db/index.js";
import { integrationEvents } from "../db/schema.js";

export async function logIntegrationEvent(input: {
  provider: string;
  eventType: string;
  referenceId?: string;
  payload?: unknown;
  error?: string;
}): Promise<void> {
  try {
    await db.insert(integrationEvents).values({
      provider: input.provider,
      eventType: input.eventType,
      referenceId: input.referenceId ?? null,
      payloadJson: (input.payload as object) ?? null,
      processed: !input.error,
      processedAt: input.error ? null : new Date(),
      error: input.error ?? null,
    });
  } catch (err) {
    console.error("[integration_events] write failed:", err);
  }
}
