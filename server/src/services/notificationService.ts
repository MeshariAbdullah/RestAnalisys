import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

interface CreateNotification {
  userId: number;
  type: string;
  titleEn: string;
  titleAr: string;
  bodyEn?: string;
  bodyAr?: string;
  entityType?: string;
  entityId?: number;
}

export async function createNotification(input: CreateNotification): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      titleEn: input.titleEn,
      titleAr: input.titleAr,
      bodyEn: input.bodyEn,
      bodyAr: input.bodyAr,
      entityType: input.entityType,
      entityId: input.entityId,
    });
  } catch (err) {
    console.error("[notification] write failed:", err);
  }
}

export async function notifyAssetApproved(ownerId: number, assetId: number, assetTitle: string): Promise<void> {
  await createNotification({
    userId: ownerId,
    type: "asset_approved",
    titleEn: "Asset approved",
    titleAr: "تم قبول الأصل",
    bodyEn: `Your asset "${assetTitle}" has been approved and is moving to inspection.`,
    bodyAr: `تم قبول أصلك "${assetTitle}" وسيتم إرساله للفحص.`,
    entityType: "asset",
    entityId: assetId,
  });
}

export async function notifyAssetRejected(ownerId: number, assetId: number, assetTitle: string, reason: string): Promise<void> {
  await createNotification({
    userId: ownerId,
    type: "asset_rejected",
    titleEn: "Asset rejected",
    titleAr: "تم رفض الأصل",
    bodyEn: `Your asset "${assetTitle}" was rejected: ${reason}`,
    bodyAr: `تم رفض أصلك "${assetTitle}": ${reason}`,
    entityType: "asset",
    entityId: assetId,
  });
}

export async function notifyRentalCreated(ownerId: number, rentalId: number, assetTitle: string): Promise<void> {
  await createNotification({
    userId: ownerId,
    type: "rental_created",
    titleEn: "New rental request",
    titleAr: "طلب إيجار جديد",
    bodyEn: `A new rental has been initiated for "${assetTitle}".`,
    bodyAr: `تم بدء إيجار جديد لـ "${assetTitle}".`,
    entityType: "rental",
    entityId: rentalId,
  });
}

export async function notifyPaymentReceived(renterId: number, rentalId: number, amount: string): Promise<void> {
  await createNotification({
    userId: renterId,
    type: "payment_received",
    titleEn: "Payment confirmed",
    titleAr: "تم تأكيد الدفع",
    bodyEn: `Your payment of ${amount} has been captured successfully.`,
    bodyAr: `تم خصم مبلغ ${amount} بنجاح.`,
    entityType: "rental",
    entityId: rentalId,
  });
}

export async function notifyPayoutReleased(ownerId: number, rentalId: number, amount: string): Promise<void> {
  await createNotification({
    userId: ownerId,
    type: "payout_released",
    titleEn: "Payout released",
    titleAr: "تم تحويل الأرباح",
    bodyEn: `A payout of ${amount} has been released to your account.`,
    bodyAr: `تم تحويل مبلغ ${amount} إلى حسابك.`,
    entityType: "rental",
    entityId: rentalId,
  });
}

export async function notifyDisputeOpened(userId: number, disputeId: number, rentalRef: string): Promise<void> {
  await createNotification({
    userId,
    type: "dispute_opened",
    titleEn: "Dispute opened",
    titleAr: "تم فتح نزاع",
    bodyEn: `A dispute has been opened for rental ${rentalRef}.`,
    bodyAr: `تم فتح نزاع للإيجار ${rentalRef}.`,
    entityType: "dispute",
    entityId: disputeId,
  });
}

export async function notifyDisputeResolved(userId: number, disputeId: number, resolution: string): Promise<void> {
  await createNotification({
    userId,
    type: "dispute_resolved",
    titleEn: "Dispute resolved",
    titleAr: "تم حل النزاع",
    bodyEn: `Your dispute has been resolved: ${resolution}.`,
    bodyAr: `تم حل النزاع الخاص بك: ${resolution}.`,
    entityType: "dispute",
    entityId: disputeId,
  });
}
