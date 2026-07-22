import { db } from "../db/index.js";
import { integrationEvents } from "../db/schema.js";

export type IntegrationProvider = "nafath" | "nafith" | "hyperpay" | "zatca" | "spl" | "courier";

export interface IntegrationEventInput {
  provider: IntegrationProvider;
  eventType: string;
  referenceId?: string;
  payload?: unknown;
}

export async function recordIntegrationEvent(input: IntegrationEventInput): Promise<void> {
  try {
    await db.insert(integrationEvents).values({
      provider: input.provider,
      eventType: input.eventType,
      referenceId: input.referenceId ?? null,
      payloadJson: (input.payload as object) ?? null,
      processed: true,
      processedAt: new Date(),
    });
  } catch (err) {
    console.error("[integration_event] write failed:", err);
  }
}
