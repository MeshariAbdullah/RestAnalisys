import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

interface CreateNotificationParams {
  userId: number;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams) {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      linkUrl: params.linkUrl ?? null,
      metadata: params.metadata ?? null,
    })
    .returning();
  return notification;
}

export async function notifyRentalStatusChange(
  userId: number,
  rentalReference: string,
  rentalId: number,
  newStatus: string
) {
  const statusMessages: Record<string, { title: string; message: string }> = {
    pending_legal_signing: {
      title: "Contract Ready for Signing",
      message: `Rental ${rentalReference} requires your legal commitment signature.`,
    },
    pending_payment: {
      title: "Payment Required",
      message: `Rental ${rentalReference} is ready for payment.`,
    },
    confirmed: {
      title: "Rental Confirmed",
      message: `Payment received for ${rentalReference}. Preparing for delivery.`,
    },
    out_for_delivery: {
      title: "Item Shipped",
      message: `Your rental ${rentalReference} is on its way to you.`,
    },
    active: {
      title: "Item Delivered",
      message: `Rental ${rentalReference} has been delivered. Enjoy!`,
    },
    under_inspection: {
      title: "Return Received",
      message: `Your return for ${rentalReference} is being inspected.`,
    },
    closed: {
      title: "Rental Completed",
      message: `Rental ${rentalReference} has been successfully completed.`,
    },
    closed_with_penalty: {
      title: "Rental Closed with Penalty",
      message: `Rental ${rentalReference} has been closed with a penalty charge.`,
    },
    cancelled: {
      title: "Rental Cancelled",
      message: `Rental ${rentalReference} has been cancelled.`,
    },
    enforcement: {
      title: "Legal Enforcement",
      message: `Rental ${rentalReference} has been escalated to legal enforcement.`,
    },
  };

  const info = statusMessages[newStatus];
  if (!info) return;

  return createNotification({
    userId,
    type: "rental_status",
    title: info.title,
    message: info.message,
    linkUrl: `/my-rentals/${rentalId}`,
    metadata: { rentalId, status: newStatus },
  });
}

export async function notifyAssetStatusChange(
  ownerId: number,
  assetTitle: string,
  assetId: number,
  newStatus: string
) {
  const statusMessages: Record<string, { title: string; message: string }> = {
    in_inspection: {
      title: "Asset Under Inspection",
      message: `Your asset "${assetTitle}" is being inspected.`,
    },
    inspection_reported: {
      title: "Inspection Complete",
      message: `Inspection for "${assetTitle}" is complete. Please review the valuation.`,
    },
    listed: {
      title: "Asset Listed",
      message: `"${assetTitle}" is now live and visible to renters.`,
    },
    rejected: {
      title: "Asset Rejected",
      message: `Your submission "${assetTitle}" was not approved.`,
    },
    rented_out: {
      title: "Asset Rented",
      message: `"${assetTitle}" has been rented out. You'll earn your share when it's returned.`,
    },
  };

  const info = statusMessages[newStatus];
  if (!info) return;

  return createNotification({
    userId: ownerId,
    type: "asset_status",
    title: info.title,
    message: info.message,
    linkUrl: `/owner/assets/${assetId}`,
    metadata: { assetId, status: newStatus },
  });
}
