import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

interface CreateNotificationParams {
  userId: number;
  type: string;
  titleEn: string;
  titleAr: string;
  bodyEn?: string;
  bodyAr?: string;
  entityType?: string;
  entityId?: number;
}

export async function createNotification(params: CreateNotificationParams) {
  const [row] = await db.insert(notifications).values(params).returning();
  return row;
}

export async function notifyUser(
  userId: number,
  type: string,
  titles: { en: string; ar: string },
  bodies?: { en: string; ar: string },
  entity?: { type: string; id: number }
) {
  return createNotification({
    userId,
    type,
    titleEn: titles.en,
    titleAr: titles.ar,
    bodyEn: bodies?.en,
    bodyAr: bodies?.ar,
    entityType: entity?.type,
    entityId: entity?.id,
  });
}
