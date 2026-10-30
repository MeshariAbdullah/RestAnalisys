import { db } from "../db/index.js";
import { notifications, users } from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";

export async function createNotification(
  userId: number,
  type: string,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await db.insert(notifications).values({
    userId,
    type,
    title,
    message,
    metadataJson: metadata as object ?? null,
  });
}

export async function notifyAdmins(
  type: string,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.role, ["admin", "super_admin"]));

  if (admins.length === 0) return;

  await db.insert(notifications).values(
    admins.map((a) => ({
      userId: a.id,
      type,
      title,
      message,
      metadataJson: metadata as object ?? null,
    }))
  );
}
