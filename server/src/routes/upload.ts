import { Router } from "express";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadFile, validateUpload } from "../services/storageService.js";
import { ValidationError } from "../utils/errors.js";

const router = Router();

router.post(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const contentType = req.headers["content-type"] ?? "";
    if (!contentType.startsWith("application/json")) {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      const buffer = Buffer.concat(chunks);
      const mimeType = contentType.split(";")[0].trim() || "application/octet-stream";

      const validation = validateUpload(buffer, mimeType);
      if (!validation.valid) throw new ValidationError(validation.reason!);

      const result = await uploadFile({
        buffer,
        mimeType,
        folder: `user-${req.user!.userId}`,
        originalName: (req.headers["x-filename"] as string) ?? undefined,
      });

      return res.status(201).json(result);
    }

    const { data, mimeType, filename, folder } = req.body as {
      data: string;
      mimeType: string;
      filename?: string;
      folder?: string;
    };

    if (!data || !mimeType) {
      throw new ValidationError("data (base64) and mimeType are required");
    }

    const buffer = Buffer.from(data, "base64");
    const validation = validateUpload(buffer, mimeType);
    if (!validation.valid) throw new ValidationError(validation.reason!);

    const result = await uploadFile({
      buffer,
      mimeType,
      folder: folder ?? `user-${req.user!.userId}`,
      originalName: filename,
    });

    res.status(201).json(result);
  })
);

export default router;
