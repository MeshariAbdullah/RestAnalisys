import { db } from "../db/index.js";
import { integrationEvents } from "../db/schema.js";

export async function logIntegrationEvent(params: {
  provider: string;
  eventType: string;
  referenceId?: string;
  payload?: Record<string, unknown>;
}) {
  try {
    await db.insert(integrationEvents).values({
      provider: params.provider,
      eventType: params.eventType,
      referenceId: params.referenceId ?? null,
      payloadJson: (params.payload ?? {}) as object,
      processed: true,
      processedAt: new Date(),
    });
  } catch {
    // Never break the primary flow for logging failures
  }
}
