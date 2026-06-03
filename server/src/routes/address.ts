import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { lookupAddress, verifyNationalAddress, getDeliveryZones, getDeliveryZone } from "../services/addressService.js";
import { recordAudit } from "../services/auditService.js";
import { NotFoundError } from "../utils/errors.js";

const router = Router();

router.post(
  "/lookup",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { buildingNumber, postalCode, additionalCode } = req.body as {
      buildingNumber: string;
      postalCode: string;
      additionalCode?: string;
    };

    if (!buildingNumber || !postalCode) {
      return res.status(400).json({ error: "buildingNumber and postalCode are required" });
    }

    const address = await lookupAddress({ buildingNumber, postalCode, additionalCode });
    res.json(address);
  })
);

router.post(
  "/verify",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundError("User");
    if (!user.nationalId) {
      return res.status(400).json({ error: "National ID required. Complete Nafath verification first." });
    }

    const address = await verifyNationalAddress({ nationalId: user.nationalId });
    if (!address) {
      return res.status(404).json({ error: "No registered national address found" });
    }

    await db
      .update(users)
      .set({
        nationalAddressJson: address as unknown as object,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await recordAudit({
      req,
      action: "address.verify",
      entityType: "user",
      entityId: userId,
      after: { address: address.formattedAddress },
    });

    res.json(address);
  })
);

router.get(
  "/mine",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);
    if (!user) throw new NotFoundError("User");
    res.json(user.nationalAddressJson ?? null);
  })
);

router.get(
  "/delivery-zones",
  asyncHandler(async (_req, res) => {
    res.json(getDeliveryZones());
  })
);

router.get(
  "/delivery-zone/:city",
  asyncHandler(async (req, res) => {
    const zone = getDeliveryZone(req.params.city);
    if (!zone) {
      return res.status(404).json({ error: "Delivery zone not found for this city" });
    }
    res.json(zone);
  })
);

export default router;
