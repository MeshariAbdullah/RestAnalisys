import { Router } from "express";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError } from "../utils/errors.js";
import {
  createPresignedUpload,
  confirmUpload,
  validateUpload,
  type UploadCategory,
} from "../services/storageService.js";
import { z } from "zod";

const router = Router();

const PresignedUploadSchema = z.object({
  category: z.enum([
    "asset-submission",
    "asset-studio",
    "inspection",
    "contract",
    "invoice",
    "avatar",
  ]),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
  entityId: z.number().int().positive().optional(),
});

router.post(
  "/presign",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = PresignedUploadSchema.parse(req.body);

    const validation = validateUpload({
      category: input.category as UploadCategory,
      fileName: input.fileName,
      contentType: input.contentType,
      fileSizeBytes: input.fileSizeBytes,
      entityId: input.entityId,
    });

    if (!validation.valid) {
      throw new ValidationError(validation.error!);
    }

    const result = await createPresignedUpload({
      category: input.category as UploadCategory,
      fileName: input.fileName,
      contentType: input.contentType,
      fileSizeBytes: input.fileSizeBytes,
      entityId: input.entityId,
    });

    res.json(result);
  })
);

router.post(
  "/confirm",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { key } = z.object({ key: z.string().min(1) }).parse(req.body);
    const result = await confirmUpload(key);
    res.json(result);
  })
);

export default router;
