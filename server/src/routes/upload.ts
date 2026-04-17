import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { uploadLimiter } from "../middleware/security.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, name);
  },
});

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 10 },
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
  uploadLimiter,
  upload.array("images", 10),
  asyncHandler(async (req: AuthedRequest, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const urls = files.map((f) => `${baseUrl}/uploads/${f.filename}`);

    res.json({ urls, count: urls.length });
  })
);

export default router;
