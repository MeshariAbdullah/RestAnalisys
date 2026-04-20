import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { lookupNationalAddress, validateAddress } from "../services/splService.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

router.get(
  "/lookup",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);
    if (!user) throw new NotFoundError("User");
    if (!user.nationalId) {
      throw new ValidationError("Nafath verification required before address lookup");
    }

    const language = (req.query.lang as string) === "en" ? "E" : "A";
    const result = await lookupNationalAddress({
      nationalId: user.nationalId,
      language,
    });

    res.json(result);
  })
);

router.post(
  "/validate",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { buildingNumber, postCode, additionalNumber } = req.body as {
      buildingNumber: string;
      postCode: string;
      additionalNumber: string;
    };

    if (!buildingNumber || !postCode || !additionalNumber) {
      throw new ValidationError("buildingNumber, postCode, and additionalNumber are required");
    }

    const result = await validateAddress({ buildingNumber, postCode, additionalNumber });
    res.json(result);
  })
);

router.post(
  "/save",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const address = req.body;
    if (!address.buildingNumber || !address.city || !address.postCode) {
      throw new ValidationError("buildingNumber, city, and postCode are required");
    }

    await db
      .update(users)
      .set({
        nationalAddressJson: address,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.user!.userId));

    await recordAudit({
      req,
      action: "user.address.save",
      entityType: "user",
      entityId: req.user!.userId,
      after: { address },
    });

    res.json({ saved: true, address });
  })
);

export default router;
