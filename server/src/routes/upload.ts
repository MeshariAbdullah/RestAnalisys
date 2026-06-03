import { Router } from "express";
import multer from "multer";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadFile, generatePresignedUploadUrl } from "../services/storageService.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post(
  "/",
  authenticate,
  upload.array("files", 10),
  asyncHandler(async (req: AuthedRequest, res) => {
    const folder = (req.body.folder as string) || "submissions";
    const validFolders = ["submissions", "studio", "inspections", "documents", "avatars"];
    if (!validFolders.includes(folder)) {
      return res.status(400).json({ error: `Invalid folder. Must be one of: ${validFolders.join(", ")}` });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files provided" });
    }

    const results = await Promise.all(
      files.map((f) =>
        uploadFile({
          buffer: f.buffer,
          mimeType: f.mimetype,
          folder: folder as any,
          originalName: f.originalname,
        })
      )
    );

    await recordAudit({
      req,
      action: "upload.files",
      entityType: "upload",
      after: { count: results.length, folder, keys: results.map((r) => r.key) },
    });

    res.status(201).json({ files: results });
  })
);

router.post(
  "/presign",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { folder, mimeType } = req.body as { folder: string; mimeType: string };
    const validFolders = ["submissions", "studio", "inspections", "documents", "avatars"];
    if (!validFolders.includes(folder)) {
      return res.status(400).json({ error: `Invalid folder` });
    }

    const result = await generatePresignedUploadUrl(folder as any, mimeType);
    res.json(result);
  })
);

export default router;
