/**
 * Audit log helper. Every mutation in the system that touches money, legal
 * state, or identity should call `recordAudit()`.
 */

import { db } from "../db/index.js";
import { auditLogs } from "../db/schema.js";
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
