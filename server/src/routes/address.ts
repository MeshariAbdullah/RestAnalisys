/**
 * Address routes — National Address (SPL) validation and lookup.
 */

import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError } from "../utils/errors.js";
import { validateAddress, lookupByPostCode, lookupByCoordinates } from "../services/addressService.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

router.post(
  "/validate",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { buildingNumber, streetName, district, city, postCode, additionalCode, unitNumber } = req.body;

    const result = await validateAddress({
      buildingNumber,
      streetName,
      district,
      city,
      postCode,
      additionalCode,
      unitNumber,
    });

    if (!result.valid) {
      throw new ValidationError("Address validation failed", result.errors);
    }

    res.json(result);
  })
);

router.post(
  "/save",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const { buildingNumber, streetName, district, city, postCode, additionalCode, unitNumber, regionName } = req.body;

    const result = await validateAddress({
      buildingNumber,
      streetName,
      district,
      city,
      postCode,
      additionalCode,
      unitNumber,
      regionName,
    });

    if (!result.valid) {
      throw new ValidationError("Address validation failed", result.errors);
    }

    await db
      .update(users)
      .set({
        nationalAddressJson: result.normalized,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await recordAudit({
      req,
      action: "address.save",
      entityType: "user",
      entityId: userId,
      after: { address: result.normalized },
    });

    res.json({ saved: true, address: result.normalized });
  })
);

router.get(
  "/lookup",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { postCode, lat, lng } = req.query as Record<string, string>;

    if (postCode) {
      const result = await lookupByPostCode(postCode);
      return res.json(result);
    }

    if (lat && lng) {
      const result = await lookupByCoordinates(parseFloat(lat), parseFloat(lng));
      return res.json(result);
    }

    throw new ValidationError("Provide either postCode or lat+lng");
  })
);

router.get(
  "/mine",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const [user] = await db
      .select({ nationalAddressJson: users.nationalAddressJson })
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);

    res.json({ address: user?.nationalAddressJson ?? null });
  })
);

export default router;
