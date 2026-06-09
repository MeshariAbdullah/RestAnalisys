import { Router } from "express";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError, ForbiddenError } from "../utils/errors.js";
import { uploadImage, deleteImage } from "../services/storageService.js";

const router = Router();

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_CATEGORIES = ["submission", "studio", "inspection"] as const;

router.post(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { data, filename, mimeType, category } = req.body;

    if (!data || !filename || !mimeType || !category) {
      throw new ValidationError("Missing required fields: data, filename, mimeType, category");
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new ValidationError(`Unsupported mime type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`);
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
      throw new ValidationError(`Invalid category. Allowed: ${ALLOWED_CATEGORIES.join(", ")}`);
    }

    const buffer = Buffer.from(data, "base64");

    if (buffer.length > MAX_SIZE_BYTES) {
      throw new ValidationError(`File too large. Maximum size is ${MAX_SIZE_BYTES / 1024 / 1024}MB`);
    }

    const result = await uploadImage(buffer, {
      category: category as (typeof ALLOWED_CATEGORIES)[number],
      filename,
      mimeType,
    });

    return res.status(201).json(result);
  })
);

router.delete(
  "/:key(*)",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { key } = req.params;
    const role = req.user!.role;

    // Only admins and super_admins can delete uploaded images
    if (role !== "admin" && role !== "super_admin") {
      throw new ForbiddenError("Only admins can delete uploaded images");
    }

    await deleteImage(key);

    return res.json({ deleted: true, key });
  })
);

export default router;
