import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

interface CreateNotificationInput {
  userId: number;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: number | null;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    relatedEntityType: input.relatedEntityType ?? undefined,
    relatedEntityId: input.relatedEntityId ?? undefined,
  });
}

const RENTAL_STATUS_LABELS: Record<string, string> = {
  pending_risk_review: "Pending risk review",
  pending_legal_signing: "Pending legal signing",
  pending_payment: "Pending payment",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  active: "Active",
  return_in_transit: "Return in transit",
  under_inspection: "Under inspection",
  closed: "Closed",
  closed_with_penalty: "Closed with penalty",
  in_dispute: "In dispute",
  enforcement: "Under enforcement",
  cancelled: "Cancelled",
};

export async function notifyRentalStatusChange(
  rentalId: number,
  renterId: number,
  ownerId: number,
  newStatus: string
): Promise<void> {
  const label = RENTAL_STATUS_LABELS[newStatus] ?? newStatus;
  const userIds = Array.from(new Set([renterId, ownerId]));
  for (const userId of userIds) {
    await createNotification({
      userId,
      type: "rental_status_change",
      title: "Rental status updated",
      message: `Rental status changed to: ${label}`,
      relatedEntityType: "rental",
      relatedEntityId: rentalId,
    });
  }
}

export async function notifyPaymentConfirmed(
  rentalId: number,
  userId: number,
  amountHalalas: number
): Promise<void> {
  const sar = (amountHalalas / 100).toFixed(2);
  await createNotification({
    userId,
    type: "payment_confirmed",
    title: "Payment confirmed",
    message: `Your payment of ${sar} SAR has been captured successfully.`,
    relatedEntityType: "rental",
    relatedEntityId: rentalId,
  });
}

export async function notifyInspectionComplete(
  assetId: number,
  ownerId: number,
  outcome: string
): Promise<void> {
  await createNotification({
    userId: ownerId,
    type: "inspection_complete",
    title: "Inspection complete",
    message: `Inspection for your asset has been completed. Outcome: ${outcome}`,
    relatedEntityType: "asset",
    relatedEntityId: assetId,
  });
}

export async function notifyDisputeUpdate(
  disputeId: number,
  userId: number,
  newStatus: string
): Promise<void> {
  await createNotification({
    userId,
    type: "dispute_update",
    title: "Dispute updated",
    message: `Dispute status changed to: ${newStatus}`,
    relatedEntityType: "dispute",
    relatedEntityId: disputeId,
  });
}

export async function notifyAssetStatusChange(
  assetId: number,
  ownerId: number,
  newStatus: string
): Promise<void> {
  await createNotification({
    userId: ownerId,
    type: "asset_status_change",
    title: "Asset status updated",
    message: `Your asset status changed to: ${newStatus}`,
    relatedEntityType: "asset",
    relatedEntityId: assetId,
  });
}
