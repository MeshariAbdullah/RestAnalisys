import { Router } from "express";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError } from "../utils/errors.js";
import { uploadFile } from "../services/storageService.js";

const router = Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

router.post(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const contentType = req.headers["content-type"] ?? "";

    if (!contentType.startsWith("multipart/form-data") && !contentType.startsWith("application/octet-stream")) {
      throw new ValidationError("Expected multipart/form-data or application/octet-stream");
    }

    const chunks: Buffer[] = [];
    let totalSize = 0;

    await new Promise<void>((resolve, reject) => {
      req.on("data", (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize > MAX_FILE_SIZE) {
          reject(new ValidationError(`File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`));
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", resolve);
      req.on("error", reject);
    });

    const buffer = Buffer.concat(chunks);
    const filename = (req.headers["x-filename"] as string) ?? "upload.jpg";
    const mimeType = (req.headers["x-content-type"] as string) ?? "image/jpeg";

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new ValidationError(`Unsupported file type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`);
    }

    const folder = req.query.folder as string ?? "assets";
    const result = await uploadFile(buffer, filename, mimeType, folder);

    res.status(201).json(result);
  })
);

export default router;
