/**
 * National Address routes — SPL address lookup and validation for users.
 */

import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, LegalStateError } from "../utils/errors.js";
import { lookupNationalAddress, validateNationalAddress } from "../services/splService.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

router.post(
  "/lookup",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundError("User");
    if (!user.nationalId) {
      throw new LegalStateError("National ID required for address lookup. Complete Nafath verification first.");
    }

    const result = await lookupNationalAddress({
      nationalId: user.nationalId,
      language: (req.body.language as "ar" | "en") ?? "ar",
    });

    if (result.addresses.length > 0) {
      await db
        .update(users)
        .set({
          nationalAddressJson: result.addresses[0] as unknown as object,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      await recordAudit({
        req,
        action: "address.lookup",
        entityType: "user",
        entityId: userId,
        after: { addressCount: result.addresses.length },
      });
    }

    res.json(result);
  })
);

router.post(
  "/validate",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { buildingNumber, postCode, additionalCode } = req.body as {
      buildingNumber: string;
      postCode: string;
      additionalCode: string;
    };

    const result = await validateNationalAddress({
      buildingNumber,
      postCode,
      additionalCode,
    });

    res.json(result);
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
    if (!user) throw new NotFoundError("User");

    res.json({ address: user.nationalAddressJson });
  })
);

export default router;
