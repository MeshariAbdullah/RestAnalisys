import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import type { NewNotification } from "../db/schema.js";

type NotificationType = NewNotification["type"];

interface NotifyParams {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
}

export async function notify(params: NotifyParams): Promise<void> {
  await db.insert(notifications).values({
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    linkUrl: params.linkUrl ?? null,
    metadata: (params.metadata as object) ?? {},
  });
}

export async function notifyRentalConfirmed(renterId: number, rentalRef: string, rentalId: number) {
  await notify({
    userId: renterId,
    type: "rental_confirmed",
    title: "Rental Confirmed",
    body: `Your rental ${rentalRef} has been confirmed and is being prepared for delivery.`,
    linkUrl: `/my-rentals`,
    metadata: { rentalId },
  });
}

export async function notifyRentalDelivered(renterId: number, rentalRef: string, rentalId: number) {
  await notify({
    userId: renterId,
    type: "rental_delivered",
    title: "Item Delivered",
    body: `Your rental ${rentalRef} has been delivered. Enjoy your luxury experience!`,
    linkUrl: `/my-rentals`,
    metadata: { rentalId },
  });
}

export async function notifyRentalClosed(renterId: number, ownerId: number, rentalRef: string, rentalId: number) {
  await notify({
    userId: renterId,
    type: "rental_closed",
    title: "Rental Closed",
    body: `Your rental ${rentalRef} has been closed. Thank you for choosing MLR!`,
    linkUrl: `/my-rentals`,
    metadata: { rentalId },
  });
  await notify({
    userId: ownerId,
    type: "rental_closed",
    title: "Rental Completed",
    body: `Rental ${rentalRef} for your asset has been completed. Payout will be processed shortly.`,
    linkUrl: `/owner/payouts`,
    metadata: { rentalId },
  });
}

export async function notifyAssetApproved(ownerId: number, assetTitle: string, assetId: number) {
  await notify({
    userId: ownerId,
    type: "asset_approved",
    title: "Asset Approved",
    body: `Your asset "${assetTitle}" has been approved. Please ship it to our warehouse for inspection.`,
    linkUrl: `/owner/assets/${assetId}`,
    metadata: { assetId },
  });
}

export async function notifyAssetRejected(ownerId: number, assetTitle: string, reason: string) {
  await notify({
    userId: ownerId,
    type: "asset_rejected",
    title: "Asset Rejected",
    body: `Your asset "${assetTitle}" was not approved. Reason: ${reason}`,
  });
}

export async function notifyAssetListed(ownerId: number, assetTitle: string, assetId: number) {
  await notify({
    userId: ownerId,
    type: "asset_listed",
    title: "Asset Listed",
    body: `Your asset "${assetTitle}" is now live on the marketplace!`,
    linkUrl: `/owner/assets/${assetId}`,
    metadata: { assetId },
  });
}

export async function notifyInspectionComplete(ownerId: number, assetTitle: string, assetId: number) {
  await notify({
    userId: ownerId,
    type: "inspection_complete",
    title: "Inspection Complete",
    body: `Inspection for "${assetTitle}" is complete. Please review the valuation.`,
    linkUrl: `/owner/assets/${assetId}`,
    metadata: { assetId },
  });
}

export async function notifyPaymentCaptured(renterId: number, rentalRef: string, amountSar: string) {
  await notify({
    userId: renterId,
    type: "payment_captured",
    title: "Payment Successful",
    body: `Payment of ${amountSar} SAR for rental ${rentalRef} has been captured.`,
    linkUrl: `/my-rentals`,
  });
}

export async function notifyPayoutReleased(ownerId: number, amountSar: string) {
  await notify({
    userId: ownerId,
    type: "payout_released",
    title: "Payout Released",
    body: `A payout of ${amountSar} SAR has been released to your account.`,
    linkUrl: `/owner/payouts`,
  });
}

export async function notifyDisputeOpened(userId: number, rentalRef: string) {
  await notify({
    userId,
    type: "dispute_opened",
    title: "Dispute Opened",
    body: `A dispute has been opened for rental ${rentalRef}. Our team will review it shortly.`,
  });
}

export async function notifyDisputeResolved(userId: number, rentalRef: string, resolution: string) {
  await notify({
    userId,
    type: "dispute_resolved",
    title: "Dispute Resolved",
    body: `The dispute for rental ${rentalRef} has been resolved: ${resolution}.`,
  });
}

export async function notifyReviewReceived(ownerId: number, assetTitle: string, rating: number) {
  await notify({
    userId: ownerId,
    type: "review_received",
    title: "New Review",
    body: `Your asset "${assetTitle}" received a ${rating}-star review.`,
  });
}
