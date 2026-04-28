/**
 * Upload routes — generates pre-signed URLs for direct-to-storage uploads.
 */

import { Router } from "express";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  generatePresignedUploadUrl,
  generateBatchPresignedUrls,
  type UploadCategory,
} from "../services/storageService.js";
import { z } from "zod";

const router = Router();

const PresignedUrlSchema = z.object({
  category: z.enum([
    "asset_submission",
    "asset_studio",
    "inspection_before",
    "inspection_after",
    "inspection_report",
    "legal_contract",
    "dispute_evidence",
    "owner_agreement",
  ]),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  entityId: z.number().int().nonnegative(),
});

const BatchPresignedUrlSchema = z.object({
  category: z.enum([
    "asset_submission",
    "asset_studio",
    "inspection_before",
    "inspection_after",
    "inspection_report",
    "legal_contract",
    "dispute_evidence",
    "owner_agreement",
  ]),
  files: z
    .array(z.object({ fileName: z.string().min(1), contentType: z.string().min(1) }))
    .min(1)
    .max(20),
  entityId: z.number().int().nonnegative(),
});

router.post(
  "/presign",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = PresignedUrlSchema.parse(req.body);
    const result = await generatePresignedUploadUrl({
      category: input.category as UploadCategory,
      fileName: input.fileName,
      contentType: input.contentType,
      entityId: input.entityId,
      userId: req.user!.userId,
    });
    res.json(result);
  })
);

router.post(
  "/presign/batch",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = BatchPresignedUrlSchema.parse(req.body);
    const results = await generateBatchPresignedUrls({
      category: input.category as UploadCategory,
      files: input.files,
      entityId: input.entityId,
      userId: req.user!.userId,
    });
    res.json(results);
  })
);

export default router;
