import { Router } from "express";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  generatePresignedUpload,
  generateMultiplePresignedUploads,
  validateUploadRequest,
} from "../services/uploadService.js";
import { z } from "zod";

const router = Router();

const UploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
  category: z.enum(["submission", "studio", "inspection", "evidence"]),
});

const BatchUploadSchema = z.object({
  files: z.array(UploadRequestSchema).min(1).max(20),
});

router.post(
  "/presign",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = UploadRequestSchema.parse(req.body);
    const result = await generatePresignedUpload(input);
    res.json(result);
  })
);

router.post(
  "/presign/batch",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { files } = BatchUploadSchema.parse(req.body);
    const results = await generateMultiplePresignedUploads(files);
    res.json({ uploads: results });
  })
);

router.post(
  "/validate",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = UploadRequestSchema.parse(req.body);
    const error = validateUploadRequest(input);
    res.json({ valid: !error, error });
  })
);

export default router;
