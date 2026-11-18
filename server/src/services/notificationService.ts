import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications, rentals, assets } from "../db/schema.js";

type NotificationType =
  | "rental_created"
  | "rental_signed"
  | "rental_paid"
  | "rental_delivered"
  | "rental_returned"
  | "rental_closed"
  | "asset_approved"
  | "asset_rejected"
  | "asset_published"
  | "inspection_complete"
  | "payout_released"
  | "dispute_opened"
  | "dispute_resolved"
  | "sanad_issued"
  | "system_alert";

export async function createNotification(data: {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
}): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      entityType: data.entityType ?? null,
      entityId: data.entityId ?? null,
    });
  } catch (err) {
    console.error("[notification] write failed:", err);
  }
}

export async function notifyRentalEvent(rentalId: number, event: string): Promise<void> {
  try {
    const [rental] = await db.select().from(rentals).where(eq(rentals.id, rentalId)).limit(1);
    if (!rental) return;

    const ref = rental.reference;
    const messages: Record<string, { renter?: { title: string; msg: string }; owner?: { title: string; msg: string }; type: NotificationType }> = {
      created: {
        renter: { title: "Rental Created", msg: `Your rental ${ref} has been created. Please review and sign the legal commitment.` },
        owner: { title: "New Rental", msg: `Your asset has a new rental booking (${ref}). We'll keep you updated.` },
        type: "rental_created",
      },
      signed: {
        renter: { title: "Contract Signed", msg: `You've signed the legal commitment for rental ${ref}. Proceed to payment.` },
        type: "rental_signed",
      },
      paid: {
        renter: { title: "Payment Confirmed", msg: `Payment for rental ${ref} is confirmed. We're preparing your item for delivery.` },
        owner: { title: "Rental Paid", msg: `Rental ${ref} has been paid. Your asset will be shipped to the renter.` },
        type: "rental_paid",
      },
      fulfilled: {
        renter: { title: "Out for Delivery", msg: `Your rental ${ref} is out for delivery.` },
        type: "rental_delivered",
      },
      delivered: {
        renter: { title: "Item Delivered", msg: `Your rental item for ${ref} has been delivered. Enjoy!` },
        owner: { title: "Item Delivered", msg: `Your asset for rental ${ref} has been delivered to the renter.` },
        type: "rental_delivered",
      },
      returned: {
        renter: { title: "Return Received", msg: `We've received the returned item for rental ${ref}. Inspection in progress.` },
        owner: { title: "Item Returned", msg: `Your asset from rental ${ref} has been returned. Awaiting inspection.` },
        type: "rental_returned",
      },
      closed_clean: {
        renter: { title: "Rental Closed", msg: `Rental ${ref} has been closed successfully. Thank you!` },
        owner: { title: "Rental Closed", msg: `Rental ${ref} closed cleanly. Your payout will be released shortly.` },
        type: "rental_closed",
      },
      closed_penalty: {
        renter: { title: "Rental Closed with Penalty", msg: `Rental ${ref} has been closed with a minor damage penalty applied.` },
        owner: { title: "Rental Closed", msg: `Rental ${ref} closed with a minor penalty. Payout coming soon.` },
        type: "rental_closed",
      },
      closed_enforcement: {
        renter: { title: "Enforcement Action", msg: `Rental ${ref} has been escalated to enforcement due to damage or loss.` },
        owner: { title: "Asset Claim Filed", msg: `An enforcement action has been initiated for rental ${ref}. You will receive full compensation.` },
        type: "rental_closed",
      },
      cancelled: {
        renter: { title: "Rental Cancelled", msg: `Rental ${ref} has been cancelled.` },
        owner: { title: "Rental Cancelled", msg: `Rental ${ref} for your asset has been cancelled. The item remains listed.` },
        type: "rental_closed",
      },
    };

    const cfg = messages[event];
    if (!cfg) return;

    if (cfg.renter) {
      await createNotification({
        userId: rental.renterId,
        type: cfg.type,
        title: cfg.renter.title,
        message: cfg.renter.msg,
        entityType: "rental",
        entityId: rentalId,
      });
    }
    if (cfg.owner) {
      await createNotification({
        userId: rental.ownerId,
        type: cfg.type,
        title: cfg.owner.title,
        message: cfg.owner.msg,
        entityType: "rental",
        entityId: rentalId,
      });
    }
  } catch (err) {
    console.error("[notification] rental event failed:", err);
  }
}

export async function notifyAssetEvent(assetId: number, event: string): Promise<void> {
  try {
    const [asset] = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
    if (!asset) return;

    const title = asset.title;
    const messages: Record<string, { ntitle: string; msg: string; type: NotificationType }> = {
      approved: {
        ntitle: "Asset Approved",
        msg: `Your asset "${title}" has been approved. Please ship it to our facility.`,
        type: "asset_approved",
      },
      rejected: {
        ntitle: "Asset Rejected",
        msg: `Your asset "${title}" was not approved. Check your dashboard for details.`,
        type: "asset_rejected",
      },
      published: {
        ntitle: "Asset Published",
        msg: `Your asset "${title}" is now live and available for renters to browse.`,
        type: "asset_published",
      },
      inspection_complete: {
        ntitle: "Inspection Complete",
        msg: `Inspection for "${title}" is done. Please review and approve the valuation.`,
        type: "inspection_complete",
      },
    };

    const cfg = messages[event];
    if (!cfg) return;

    await createNotification({
      userId: asset.ownerId,
      type: cfg.type,
      title: cfg.ntitle,
      message: cfg.msg,
      entityType: "asset",
      entityId: assetId,
    });
  } catch (err) {
    console.error("[notification] asset event failed:", err);
  }
}
