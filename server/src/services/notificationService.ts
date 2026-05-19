import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
// drizzle-orm operators available for future queries
// import { eq, and, desc } from "drizzle-orm";

export interface CreateNotificationInput {
  userId: number;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        metadata: input.metadata as object ?? null,
      })
      .returning();
    return notification;
  } catch (err) {
    console.error("[notification] create failed:", err);
    return null;
  }
}

export async function notifyRentalCreated(renterId: number, rentalRef: string, assetTitle: string) {
  return createNotification({
    userId: renterId,
    type: "rental_created",
    title: "Rental Request Created",
    message: `Your rental request ${rentalRef} for "${assetTitle}" has been created. Please sign the legal commitment to proceed.`,
    metadata: { rentalRef },
  });
}

export async function notifyOwnerRentalCreated(ownerId: number, rentalRef: string, assetTitle: string) {
  return createNotification({
    userId: ownerId,
    type: "rental_created",
    title: "New Rental on Your Asset",
    message: `A renter has requested to rent your "${assetTitle}" (Ref: ${rentalRef}).`,
    metadata: { rentalRef },
  });
}

export async function notifyAssetApproved(ownerId: number, assetTitle: string) {
  return createNotification({
    userId: ownerId,
    type: "asset_approved",
    title: "Asset Approved",
    message: `Your asset "${assetTitle}" has been approved. Please ship it to our facility for inspection.`,
  });
}

export async function notifyAssetRejected(ownerId: number, assetTitle: string, reason?: string) {
  return createNotification({
    userId: ownerId,
    type: "asset_rejected",
    title: "Asset Submission Rejected",
    message: `Your asset "${assetTitle}" has been rejected.${reason ? ` Reason: ${reason}` : ""}`,
  });
}

export async function notifyPaymentCaptured(renterId: number, rentalRef: string, amountHalalas: number) {
  const amountSar = (amountHalalas / 100).toFixed(2);
  return createNotification({
    userId: renterId,
    type: "payment_captured",
    title: "Payment Confirmed",
    message: `Payment of ${amountSar} SAR for rental ${rentalRef} has been captured. Your rental is confirmed!`,
    metadata: { rentalRef, amountHalalas },
  });
}

export async function notifyRentalClosed(renterId: number, rentalRef: string, outcome: string) {
  return createNotification({
    userId: renterId,
    type: "rental_closed",
    title: "Rental Closed",
    message: `Your rental ${rentalRef} has been closed with outcome: ${outcome}.`,
    metadata: { rentalRef, outcome },
  });
}

export async function notifyDisputeOpened(userId: number, rentalRef: string) {
  return createNotification({
    userId,
    type: "dispute_opened",
    title: "Dispute Opened",
    message: `A dispute has been opened for rental ${rentalRef}. Our team will review it shortly.`,
    metadata: { rentalRef },
  });
}

export async function notifyPayoutReleased(ownerId: number, netHalalas: number) {
  const netSar = (netHalalas / 100).toFixed(2);
  return createNotification({
    userId: ownerId,
    type: "payout_released",
    title: "Payout Released",
    message: `A payout of ${netSar} SAR has been released to your account.`,
    metadata: { netHalalas },
  });
}

export async function notifyOverdueWarning(renterId: number, rentalRef: string, daysPastDue: number) {
  return createNotification({
    userId: renterId,
    type: "overdue_warning",
    title: "Rental Overdue",
    message: `Your rental ${rentalRef} is ${daysPastDue} day(s) overdue. Please return the item immediately to avoid penalties.`,
    metadata: { rentalRef, daysPastDue },
  });
}
