/**
 * Audit log helper. Every mutation in the system that touches money, legal
 * state, or identity should call `recordAudit()`.
 */

import { db } from "../db/index.js";
import { auditLogs, integrationEvents } from "../db/schema.js";
import type { AuthedRequest } from "../middleware/auth.js";

export interface AuditInput {
  req?: AuthedRequest;
  actorUserId?: number | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  before?: unknown;
  after?: unknown;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  const actorUserId = input.actorUserId ?? input.req?.user?.userId ?? null;
  const actorRole = input.actorRole ?? input.req?.user?.role ?? null;
  const ip = (input.req?.headers["x-forwarded-for"] as string) ?? input.req?.ip ?? null;
  const userAgent = (input.req?.headers["user-agent"] as string) ?? null;

  try {
    await db.insert(auditLogs).values({
      actorUserId: actorUserId ?? undefined,
      actorRole: actorRole ?? undefined,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? undefined,
      beforeJson: (input.before as object) ?? null,
      afterJson: (input.after as object) ?? null,
      ip: ip ?? undefined,
      userAgent: userAgent ?? undefined,
    });
  } catch (err) {
    // Never let audit failures break the primary flow
    console.error("[audit] write failed:", err);
  }
}

export async function recordIntegrationEvent(params: {
  provider: string;
  eventType: string;
  referenceId?: string;
  payload: unknown;
  processed?: boolean;
  error?: string;
}): Promise<void> {
  try {
    await db.insert(integrationEvents).values({
      provider: params.provider,
      eventType: params.eventType,
      referenceId: params.referenceId,
      payloadJson: params.payload as object,
      processed: params.processed ?? true,
      processedAt: params.processed !== false ? new Date() : undefined,
      error: params.error,
    });
  } catch {
    // Don't let integration logging failures break the main flow
  }
}
