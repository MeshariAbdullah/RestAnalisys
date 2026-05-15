import { Router } from "express";
import { db } from "../db/index.js";
import {
  integrationEvents,
  rentals,
  payments,
  shipments,
  users,
  sanadRecords,
} from "../db/schema.js";
import { eq } from "drizzle-orm";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendNotification } from "../services/notificationService.js";

const router = Router();

router.post(
  "/nafath",
  asyncHandler(async (req, res) => {
    const payload = req.body;
    const [event] = await db
      .insert(integrationEvents)
      .values({
        provider: "nafath",
        eventType: payload.event ?? "verification_result",
        referenceId: payload.transactionId,
        payloadJson: payload,
      })
      .returning();

    if (payload.status === "verified" && payload.nationalId) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.nafathTransactionId, payload.transactionId))
        .limit(1);

      if (user) {
        await db
          .update(users)
          .set({
            nafathVerified: true,
            nafathVerifiedAt: new Date(),
            kycStatus: "verified",
            nationalId: payload.nationalId,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));

        await db
          .update(integrationEvents)
          .set({ processed: true, processedAt: new Date() })
          .where(eq(integrationEvents.id, event.id));

        await sendNotification({
          userId: user.id,
          type: "identity.verified",
          title: "Identity Verified",
          titleAr: "تم التحقق من الهوية",
          body: "Your Nafath identity verification is complete.",
          bodyAr: "تم إكمال التحقق من هويتك عبر نفاذ.",
          entityType: "user",
          entityId: user.id,
        });
      }
    }

    res.json({ received: true, eventId: event.id });
  })
);

router.post(
  "/nafith",
  asyncHandler(async (req, res) => {
    const payload = req.body;
    const [event] = await db
      .insert(integrationEvents)
      .values({
        provider: "nafith",
        eventType: payload.event ?? "sanad_update",
        referenceId: payload.nafithReference,
        payloadJson: payload,
      })
      .returning();

    if (payload.nafithReference && payload.status) {
      const [sanad] = await db
        .select()
        .from(sanadRecords)
        .where(eq(sanadRecords.nafithReference, payload.nafithReference))
        .limit(1);

      if (sanad) {
        const statusMap: Record<string, string> = {
          signed: "signed",
          active: "active",
          executed: "executed",
          cancelled: "cancelled",
        };
        const newStatus = statusMap[payload.status];
        if (newStatus) {
          await db
            .update(sanadRecords)
            .set({
              status: newStatus as any,
              signedAt: payload.status === "signed" ? new Date() : undefined,
              updatedAt: new Date(),
            })
            .where(eq(sanadRecords.id, sanad.id));

          await sendNotification({
            userId: sanad.renterId,
            type: `sanad.${payload.status}`,
            title: `Sanad ${payload.status}`,
            titleAr: `تحديث السند`,
            body: `Your promissory note has been ${payload.status}.`,
            bodyAr: `تم تحديث حالة السند الخاص بك.`,
            entityType: "sanad",
            entityId: sanad.id,
          });
        }

        await db
          .update(integrationEvents)
          .set({ processed: true, processedAt: new Date() })
          .where(eq(integrationEvents.id, event.id));
      }
    }

    res.json({ received: true, eventId: event.id });
  })
);

router.post(
  "/payment",
  asyncHandler(async (req, res) => {
    const payload = req.body;
    const [event] = await db
      .insert(integrationEvents)
      .values({
        provider: "hyperpay",
        eventType: payload.event ?? "payment_update",
        referenceId: payload.transactionId,
        payloadJson: payload,
      })
      .returning();

    if (payload.transactionId && payload.status) {
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.gatewayTransactionId, payload.transactionId))
        .limit(1);

      if (payment) {
        const statusMap: Record<string, string> = {
          captured: "captured",
          failed: "failed",
          refunded: "refunded",
          chargeback: "chargeback",
        };
        const newStatus = statusMap[payload.status];
        if (newStatus) {
          await db
            .update(payments)
            .set({
              status: newStatus as any,
              capturedAt: payload.status === "captured" ? new Date() : undefined,
              refundedAt: payload.status === "refunded" ? new Date() : undefined,
              failureReason: payload.failureReason,
              updatedAt: new Date(),
            })
            .where(eq(payments.id, payment.id));

          if (payload.status === "captured" && payment.rentalId) {
            await db
              .update(rentals)
              .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
              .where(eq(rentals.id, payment.rentalId));
          }

          await sendNotification({
            userId: payment.userId,
            type: `payment.${payload.status}`,
            title: payload.status === "captured" ? "Payment Confirmed" : `Payment ${payload.status}`,
            titleAr: payload.status === "captured" ? "تم تأكيد الدفع" : "تحديث الدفع",
            body: `Your payment of ${(payment.amountHalalas / 100).toFixed(2)} SAR has been ${payload.status}.`,
            bodyAr: `تم تحديث حالة دفعتك.`,
            entityType: "payment",
            entityId: payment.id,
          });
        }

        await db
          .update(integrationEvents)
          .set({ processed: true, processedAt: new Date() })
          .where(eq(integrationEvents.id, event.id));
      }
    }

    res.json({ received: true, eventId: event.id });
  })
);

router.post(
  "/courier",
  asyncHandler(async (req, res) => {
    const payload = req.body;
    const [event] = await db
      .insert(integrationEvents)
      .values({
        provider: "courier",
        eventType: payload.event ?? "tracking_update",
        referenceId: payload.trackingNumber,
        payloadJson: payload,
      })
      .returning();

    if (payload.trackingNumber && payload.status) {
      const [shipment] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.trackingNumber, payload.trackingNumber))
        .limit(1);

      if (shipment) {
        const statusMap: Record<string, string> = {
          picked_up: "picked_up",
          in_transit: "in_transit",
          delivered: "delivered",
          failed: "failed",
          returned: "returned",
        };
        const newStatus = statusMap[payload.status];
        if (newStatus) {
          await db
            .update(shipments)
            .set({
              status: newStatus as any,
              pickedUpAt: payload.status === "picked_up" ? new Date() : undefined,
              deliveredAt: payload.status === "delivered" ? new Date() : undefined,
              updatedAt: new Date(),
            })
            .where(eq(shipments.id, shipment.id));

          if (shipment.rentalId && payload.status === "delivered") {
            const [rental] = await db
              .select()
              .from(rentals)
              .where(eq(rentals.id, shipment.rentalId))
              .limit(1);

            if (rental) {
              const isDeliveryToRenter = shipment.direction === "platform_to_renter";
              if (isDeliveryToRenter) {
                await db
                  .update(rentals)
                  .set({ status: "active", deliveredAt: new Date(), updatedAt: new Date() })
                  .where(eq(rentals.id, rental.id));

                await sendNotification({
                  userId: rental.renterId,
                  type: "shipment.delivered",
                  title: "Your Rental Has Arrived",
                  titleAr: "وصلت إيجارتك",
                  body: "Your luxury item has been delivered. Enjoy!",
                  bodyAr: "تم توصيل القطعة الفاخرة. استمتع!",
                  entityType: "rental",
                  entityId: rental.id,
                });
              }
            }
          }
        }

        await db
          .update(integrationEvents)
          .set({ processed: true, processedAt: new Date() })
          .where(eq(integrationEvents.id, event.id));
      }
    }

    res.json({ received: true, eventId: event.id });
  })
);

export default router;
