import { Router } from "express";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { uploadLimiter } from "../middleware/rateLimiter.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError } from "../utils/errors.js";
import { validateImageUpload, uploadImage } from "../services/imageService.js";
import { z } from "zod";

const router = Router();

const CategoryParam = z.enum(["assets", "inspections", "disputes", "profiles"]);

router.post(
  "/:category",
  authenticate,
  uploadLimiter,
  asyncHandler(async (req: AuthedRequest, res) => {
    const category = CategoryParam.parse(req.params.category);
    const contentType = req.headers["content-type"] ?? "";

    if (!contentType.startsWith("image/")) {
      throw new ValidationError("Content-Type must be an image/*");
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const buffer = Buffer.concat(chunks);

    const validation = validateImageUpload(buffer, contentType);
    if (!validation.valid) {
      throw new ValidationError(validation.error!);
    }

    const result = await uploadImage(buffer, contentType, category);

    res.status(201).json(result);
  })
);

export default router;
