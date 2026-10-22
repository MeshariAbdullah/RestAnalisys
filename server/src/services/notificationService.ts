import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

interface NotifyParams {
  userId: number;
  type: string;
  title: string;
  body: string;
  linkUrl?: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
}

export async function notify(params: NotifyParams) {
  const [row] = await db
    .insert(notifications)
    .values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      linkUrl: params.linkUrl,
      relatedEntityType: params.relatedEntityType,
      relatedEntityId: params.relatedEntityId,
    })
    .returning();
  return row;
}

export async function notifyMultiple(items: NotifyParams[]) {
  if (items.length === 0) return [];
  return db
    .insert(notifications)
    .values(
      items.map((p) => ({
        userId: p.userId,
        type: p.type,
        title: p.title,
        body: p.body,
        linkUrl: p.linkUrl,
        relatedEntityType: p.relatedEntityType,
        relatedEntityId: p.relatedEntityId,
      }))
    )
    .returning();
}

export function rentalNotification(
  userId: number,
  event: string,
  rentalRef: string,
  rentalId: number,
  detail: string
) {
  return notify({
    userId,
    type: `rental.${event}`,
    title: `Rental ${rentalRef}`,
    body: detail,
    linkUrl: `/my-rentals`,
    relatedEntityType: "rental",
    relatedEntityId: rentalId,
  });
}

export function assetNotification(
  userId: number,
  event: string,
  assetTitle: string,
  assetId: number,
  detail: string
) {
  return notify({
    userId,
    type: `asset.${event}`,
    title: assetTitle,
    body: detail,
    linkUrl: `/owner/assets/${assetId}`,
    relatedEntityType: "asset",
    relatedEntityId: assetId,
  });
}
