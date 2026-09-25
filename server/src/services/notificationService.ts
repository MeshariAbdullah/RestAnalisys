import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

export async function createNotification(params: {
  userId: number;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
}) {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      entityType: params.entityType,
      entityId: params.entityId,
    })
    .returning();

  return notification;
}

export async function notifyRentalStatusChange(params: {
  userId: number;
  rentalReference: string;
  rentalId: number;
  newStatus: string;
}) {
  const statusMessages: Record<string, { title: string; message: string }> = {
    pending_legal_signing: {
      title: "Rental Approved",
      message: `Rental ${params.rentalReference} has been approved. Please sign the legal commitment to proceed.`,
    },
    pending_payment: {
      title: "Contract Signed",
      message: `Legal commitment for ${params.rentalReference} signed. Please complete the payment.`,
    },
    confirmed: {
      title: "Payment Confirmed",
      message: `Payment for ${params.rentalReference} confirmed. Your item will be shipped soon.`,
    },
    out_for_delivery: {
      title: "Item Shipped",
      message: `Your rental ${params.rentalReference} is out for delivery.`,
    },
    active: {
      title: "Item Delivered",
      message: `Rental ${params.rentalReference} has been delivered. Enjoy your rental!`,
    },
    under_inspection: {
      title: "Return Received",
      message: `Return for ${params.rentalReference} received and under inspection.`,
    },
    closed: {
      title: "Rental Closed",
      message: `Rental ${params.rentalReference} has been closed successfully.`,
    },
    closed_with_penalty: {
      title: "Rental Closed with Penalty",
      message: `Rental ${params.rentalReference} has been closed with a penalty charge.`,
    },
    cancelled: {
      title: "Rental Cancelled",
      message: `Rental ${params.rentalReference} has been cancelled.`,
    },
    enforcement: {
      title: "Enforcement Action",
      message: `Rental ${params.rentalReference} has been escalated to enforcement.`,
    },
  };

  const info = statusMessages[params.newStatus];
  if (!info) return null;

  return createNotification({
    userId: params.userId,
    type: "rental_status",
    title: info.title,
    message: info.message,
    entityType: "rental",
    entityId: params.rentalId,
  });
}

export async function notifyPayoutReleased(params: {
  ownerId: number;
  rentalReference: string;
  rentalId: number;
  netHalalas: number;
}) {
  return createNotification({
    userId: params.ownerId,
    type: "payout",
    title: "Payout Released",
    message: `Payout of ${(params.netHalalas / 100).toFixed(2)} SAR for rental ${params.rentalReference} has been released.`,
    entityType: "rental",
    entityId: params.rentalId,
  });
}
