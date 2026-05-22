import { Router } from "express";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError } from "../utils/errors.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

const uploadRateLimit = rateLimit({ windowMs: 60_000, max: 20, keyPrefix: "upload" });

router.post(
  "/image",
  authenticate,
  uploadRateLimit,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { data, mimeType, filename } = req.body as {
      data?: string;
      mimeType?: string;
      filename?: string;
    };

    if (!data) throw new ValidationError("Missing 'data' field (base64 encoded image)");
    if (!mimeType || !ALLOWED_TYPES.includes(mimeType)) {
      throw new ValidationError(
        `Invalid mimeType. Allowed: ${ALLOWED_TYPES.join(", ")}`
      );
    }

    const buffer = Buffer.from(data, "base64");
    if (buffer.length > MAX_FILE_SIZE) {
      throw new ValidationError(`File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const ext = mimeType.split("/")[1] === "jpeg" ? "jpg" : mimeType.split("/")[1];
    const id = randomUUID();
    const storedFilename = `${id}.${ext}`;

    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, storedFilename), buffer);

    const baseUrl = process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
    const url = `${baseUrl}/uploads/${storedFilename}`;

    res.status(201).json({
      id,
      url,
      filename: filename ?? storedFilename,
      mimeType,
      size: buffer.length,
    });
  })
);

router.post(
  "/images",
  authenticate,
  uploadRateLimit,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { images } = req.body as {
      images?: Array<{ data: string; mimeType: string; filename?: string }>;
    };

    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new ValidationError("Missing 'images' array");
    }
    if (images.length > 10) {
      throw new ValidationError("Maximum 10 images per batch");
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const baseUrl = process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;

    const results = await Promise.all(
      images.map(async (img) => {
        if (!img.mimeType || !ALLOWED_TYPES.includes(img.mimeType)) {
          return { error: `Invalid mimeType: ${img.mimeType}` };
        }
        const buffer = Buffer.from(img.data, "base64");
        if (buffer.length > MAX_FILE_SIZE) {
          return { error: "File too large" };
        }

        const ext = img.mimeType.split("/")[1] === "jpeg" ? "jpg" : img.mimeType.split("/")[1];
        const id = randomUUID();
        const storedFilename = `${id}.${ext}`;
        await writeFile(path.join(UPLOAD_DIR, storedFilename), buffer);

        return {
          id,
          url: `${baseUrl}/uploads/${storedFilename}`,
          filename: img.filename ?? storedFilename,
          mimeType: img.mimeType,
          size: buffer.length,
        };
      })
    );

    res.status(201).json({ uploads: results });
  })
);

export default router;
