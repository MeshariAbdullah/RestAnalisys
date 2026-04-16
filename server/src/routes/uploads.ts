/**
 * File upload routes — handles image uploads for assets, inspections, etc.
 *
 * Storage strategy:
 *  - Dev mode: local disk under /uploads/<category>/<filename>
 *  - Production: when S3_BUCKET is set, upload to S3-compatible storage and
 *    return the public URL. (placeholder — swap the storage engine.)
 *
 * Accepted: JPEG, PNG, WebP — max 5 MB per file, max 10 files per request.
 */

import { Router } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError } from "../utils/errors.js";

const router = Router();

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 10;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve("uploads"));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP`) as unknown as null, false);
    }
  },
});

/**
 * POST /api/uploads/images
 * Body: multipart/form-data with field name "images" (up to 10 files).
 * Returns an array of URLs that can be saved as asset/inspection image refs.
 */
router.post(
  "/images",
  authenticate,
  upload.array("images", MAX_FILES),
  asyncHandler(async (req: AuthedRequest, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw new ValidationError("No files uploaded");
    }

    const baseUrl = process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
    const urls = files.map((f) => `${baseUrl}/uploads/${f.filename}`);

    res.status(201).json({ urls, count: urls.length });
  })
);

export default router;
