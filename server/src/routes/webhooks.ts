import { Router } from "express";
import { db } from "../db/index.js";
import { integrationEvents } from "../db/schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post(
  "/nafath",
  asyncHandler(async (req, res) => {
    const payload = req.body;

    await db.insert(integrationEvents).values({
      provider: "nafath",
      eventType: payload.event ?? "callback",
      referenceId: payload.transactionId ?? null,
      payloadJson: payload,
    });

    // TODO: process Nafath verification callback (update user nafathVerified)
    console.log("[WEBHOOK] Nafath callback received:", payload.transactionId);

    return res.json({ received: true });
  })
);

router.post(
  "/payment",
  asyncHandler(async (req, res) => {
    const payload = req.body;

    await db.insert(integrationEvents).values({
      provider: payload.gateway ?? "hyperpay",
      eventType: payload.type ?? "payment_update",
      referenceId: payload.transactionId ?? payload.id ?? null,
      payloadJson: payload,
    });

    // TODO: process payment status update (capture success/failure)
    console.log("[WEBHOOK] Payment callback received:", payload.transactionId ?? payload.id);

    return res.json({ received: true });
  })
);

router.post(
  "/courier",
  asyncHandler(async (req, res) => {
    const payload = req.body;

    await db.insert(integrationEvents).values({
      provider: "courier",
      eventType: payload.status ?? "tracking_update",
      referenceId: payload.trackingNumber ?? payload.awb ?? null,
      payloadJson: payload,
    });

    // TODO: process courier tracking update (update shipment status)
    console.log("[WEBHOOK] Courier tracking update:", payload.trackingNumber ?? payload.awb);

    return res.json({ received: true });
  })
);

router.post(
  "/nafith",
  asyncHandler(async (req, res) => {
    const payload = req.body;

    await db.insert(integrationEvents).values({
      provider: "nafith",
      eventType: payload.event ?? "sanad_update",
      referenceId: payload.reference ?? payload.sanadId ?? null,
      payloadJson: payload,
    });

    // TODO: process Nafith Sanad status update (sign/execute callbacks)
    console.log("[WEBHOOK] Nafith callback received:", payload.reference ?? payload.sanadId);

    return res.json({ received: true });
  })
);

export default router;
