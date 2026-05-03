import { and, eq, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { db } from "../db/index.js";
import { ConflictError } from "./errors.js";

/**
 * Performs an optimistic-locking update: reads the row's updatedAt, then
 * applies the update only if updatedAt hasn't changed since the read.
 *
 * This prevents two concurrent requests from both reading the same state
 * and blindly overwriting each other's changes.
 */
export async function optimisticUpdate<T extends Record<string, any>>(opts: {
  table: any;
  id: number;
  currentUpdatedAt: Date;
  set: Record<string, any>;
}): Promise<T> {
  const { table, id, currentUpdatedAt, set } = opts;

  const now = new Date();
  const result = await db
    .update(table)
    .set({ ...set, updatedAt: now })
    .where(
      and(
        eq(table.id, id),
        eq(table.updatedAt, currentUpdatedAt)
      )
    )
    .returning();

  if (result.length === 0) {
    throw new ConflictError(
      "This record was modified by another request. Please refresh and try again."
    );
  }

  return result[0] as T;
}
