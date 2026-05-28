/**
 * File upload routes — handles image uploads for assets and inspections.
 *
 * In dev mode, files are stored locally in /uploads. In production, swap
 * diskStorage for S3 via the AWS SDK.
 */

import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString("hex");
    cb(null, `${name}${ext}`);
  },
});

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed. Use JPEG, PNG, or WebP.`));
    }
  },
});

const router = Router();

router.post(
  "/images",
  authenticate,
  upload.array("images", 10),
  asyncHandler(async (req: AuthedRequest, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const baseUrl = process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
    const urls = files.map((f) => `${baseUrl}/uploads/${f.filename}`);

    res.json({
      urls,
      count: files.length,
    });
  })
);

router.post(
  "/image",
  authenticate,
  upload.single("image"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const baseUrl = process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
    res.json({
      url: `${baseUrl}/uploads/${file.filename}`,
    });
  })
);

export default router;
