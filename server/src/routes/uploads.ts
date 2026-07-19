import { Router } from "express";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { uploadLimiter } from "../middleware/rateLimiter.js";
import { upload, getFileUrl } from "../services/uploadService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post(
  "/",
  authenticate,
  uploadLimiter,
  upload.array("files", 10),
  asyncHandler(async (req: AuthedRequest, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const urls = files.map((f) => ({
      filename: f.filename,
      originalName: f.originalname,
      url: getFileUrl(f.filename),
      size: f.size,
      mimeType: f.mimetype,
    }));

    return res.status(201).json({ files: urls });
  })
);

router.post(
  "/single",
  authenticate,
  uploadLimiter,
  upload.single("file"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    return res.status(201).json({
      filename: file.filename,
      originalName: file.originalname,
      url: getFileUrl(file.filename),
      size: file.size,
      mimeType: file.mimetype,
    });
  })
);

export default router;
