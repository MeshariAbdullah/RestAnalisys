import { Router } from "express";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getPresignedUploadUrl, type StorageFolder } from "../services/storageService.js";
import { ValidationError } from "../utils/errors.js";
import { z } from "zod";

const router = Router();

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

const MAX_FILE_SIZE_MB = 25;

const PresignedUrlSchema = z.object({
  folder: z.enum(["submissions", "studio", "inspections", "contracts", "disputes"]),
  filename: z.string().min(1).max(255),
  mimeType: z.string().refine(
    (t) => ALLOWED_MIME_TYPES.includes(t),
    { message: `Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}` }
  ),
  fileSizeMb: z.number().max(MAX_FILE_SIZE_MB).optional(),
});

const FOLDER_PERMISSIONS: Record<StorageFolder, string[]> = {
  submissions: ["owner"],
  studio: ["inspector", "operations", "admin", "super_admin"],
  inspections: ["inspector", "admin", "super_admin"],
  contracts: ["admin", "super_admin"],
  disputes: ["renter", "owner", "admin", "super_admin"],
};

router.post(
  "/presigned-url",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = PresignedUrlSchema.parse(req.body);
    const allowedRoles = FOLDER_PERMISSIONS[input.folder];

    if (!allowedRoles.includes(req.user!.role)) {
      throw new ValidationError(`Role ${req.user!.role} cannot upload to folder "${input.folder}"`);
    }

    const result = await getPresignedUploadUrl(input.folder, input.filename, input.mimeType);
    res.json(result);
  })
);

router.post(
  "/presigned-urls",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const BatchSchema = z.object({
      files: z.array(PresignedUrlSchema).min(1).max(20),
    });
    const { files } = BatchSchema.parse(req.body);

    const results = await Promise.all(
      files.map(async (f) => {
        const allowedRoles = FOLDER_PERMISSIONS[f.folder];
        if (!allowedRoles.includes(req.user!.role)) {
          return { filename: f.filename, error: `Not authorized for folder "${f.folder}"` };
        }
        const result = await getPresignedUploadUrl(f.folder, f.filename, f.mimeType);
        return { filename: f.filename, ...result };
      })
    );

    res.json({ uploads: results });
  })
);

export default router;
