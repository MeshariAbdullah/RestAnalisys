import { db } from "../db/index.js";
import { integrationEvents } from "../db/schema.js";

export async function logIntegrationEvent(opts: {
  provider: string;
  eventType: string;
  referenceId?: string;
  payload: unknown;
  error?: string;
}): Promise<void> {
  try {
    await db.insert(integrationEvents).values({
      provider: opts.provider,
      eventType: opts.eventType,
      referenceId: opts.referenceId ?? null,
      payloadJson: opts.payload as object,
      processed: !opts.error,
      processedAt: opts.error ? null : new Date(),
      error: opts.error ?? null,
    });
  } catch {
    // Never let integration logging break the main flow
  }
}
