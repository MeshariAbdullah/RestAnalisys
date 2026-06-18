/**
 * File upload routes.
 *
 * POST /api/uploads         — upload a single file (multipart/form-data)
 * POST /api/uploads/batch   — upload multiple files (multipart/form-data)
 * DELETE /api/uploads/:key  — delete an uploaded file
 *
 * Files are stored locally in dev mode. In production, they go to S3.
 */

import { Router } from "express";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadFile,
  deleteFile,
  validateUpload,
  type UploadCategory,
} from "../services/uploadService.js";
import { ValidationError } from "../utils/errors.js";

const router = Router();

const VALID_CATEGORIES: UploadCategory[] = [
  "asset-submission",
  "asset-studio",
  "inspection",
  "document",
  "avatar",
];

function parseMultipart(req: AuthedRequest): Promise<Array<{ buffer: Buffer; originalName: string; mimeType: string }>> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"] ?? "";
    if (!contentType.includes("multipart/form-data")) {
      reject(new ValidationError("Content-Type must be multipart/form-data"));
      return;
    }

    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) {
      reject(new ValidationError("Missing boundary in Content-Type"));
      return;
    }

    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("error", reject);
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      const boundary = `--${boundaryMatch[1]}`;
      const parts = body.toString("binary").split(boundary).filter((p) => p.trim() && p.trim() !== "--");

      const files: Array<{ buffer: Buffer; originalName: string; mimeType: string }> = [];
      for (const part of parts) {
        const headerEnd = part.indexOf("\r\n\r\n");
        if (headerEnd === -1) continue;

        const headers = part.slice(0, headerEnd);
        const fileContent = part.slice(headerEnd + 4, part.lastIndexOf("\r\n"));

        const filenameMatch = headers.match(/filename="([^"]+)"/);
        const mimeMatch = headers.match(/Content-Type:\s*(.+)/i);

        if (filenameMatch) {
          files.push({
            buffer: Buffer.from(fileContent, "binary"),
            originalName: filenameMatch[1],
            mimeType: mimeMatch ? mimeMatch[1].trim() : "application/octet-stream",
          });
        }
      }

      resolve(files);
    });
  });
}

router.post(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const category = (req.query.category as UploadCategory) ?? "asset-submission";
    if (!VALID_CATEGORIES.includes(category)) {
      throw new ValidationError(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`);
    }

    const entityId = req.query.entityId ? Number(req.query.entityId) : undefined;
    const files = await parseMultipart(req);

    if (files.length === 0) {
      throw new ValidationError("No file provided");
    }

    const file = files[0];
    const error = validateUpload(file.mimeType, file.buffer.length);
    if (error) throw new ValidationError(error);

    const result = await uploadFile({
      buffer: file.buffer,
      originalName: file.originalName,
      mimeType: file.mimeType,
      category,
      userId: req.user!.userId,
      entityId,
    });

    res.status(201).json(result);
  })
);

router.post(
  "/batch",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const category = (req.query.category as UploadCategory) ?? "asset-submission";
    if (!VALID_CATEGORIES.includes(category)) {
      throw new ValidationError(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`);
    }

    const entityId = req.query.entityId ? Number(req.query.entityId) : undefined;
    const files = await parseMultipart(req);

    if (files.length === 0) {
      throw new ValidationError("No files provided");
    }
    if (files.length > 20) {
      throw new ValidationError("Maximum 20 files per batch");
    }

    const results = [];
    for (const file of files) {
      const error = validateUpload(file.mimeType, file.buffer.length);
      if (error) throw new ValidationError(`File "${file.originalName}": ${error}`);

      const result = await uploadFile({
        buffer: file.buffer,
        originalName: file.originalName,
        mimeType: file.mimeType,
        category,
        userId: req.user!.userId,
        entityId,
      });
      results.push(result);
    }

    res.status(201).json({ files: results });
  })
);

router.delete(
  "/:key(*)",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const key = req.params.key;
    const deleted = await deleteFile(key);
    if (!deleted) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    res.json({ deleted: true, key });
  })
);

export default router;
