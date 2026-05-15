import { Router } from "express";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, extname } from "path";
import { randomUUID } from "crypto";
import { db } from "../db/index.js";
import { uploads } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "uploads";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

async function ensureDir(dir: string) {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

router.post(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const contentType = req.headers["content-type"] ?? "";
    if (!contentType.includes("multipart/form-data") && !contentType.includes("application/octet-stream")) {
      res.status(400).json({ error: "Expected multipart/form-data or binary upload" });
      return;
    }

    const purpose = (req.query.purpose as string) ?? "asset_submission";
    const entityType = req.query.entityType as string | undefined;
    const entityId = req.query.entityId ? Number(req.query.entityId) : undefined;

    const chunks: Buffer[] = [];
    let totalSize = 0;

    await new Promise<void>((resolve, reject) => {
      req.on("data", (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize > MAX_FILE_SIZE) {
          reject(new Error("File too large (max 10MB)"));
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", resolve);
      req.on("error", reject);
    });

    const buffer = Buffer.concat(chunks);

    const mimeType = req.headers["x-file-type"] as string ?? "image/jpeg";
    const originalName = req.headers["x-file-name"] as string ?? `upload-${Date.now()}`;

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      res.status(400).json({ error: `Unsupported file type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}` });
      return;
    }

    const ext = extname(originalName) || mimeExtension(mimeType);
    const fileName = `${randomUUID()}${ext}`;
    const subDir = join(UPLOAD_DIR, purpose);
    await ensureDir(subDir);

    const filePath = join(subDir, fileName);
    await writeFile(filePath, buffer);

    const baseUrl = process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
    const url = `${baseUrl}/uploads/${purpose}/${fileName}`;

    const [upload] = await db
      .insert(uploads)
      .values({
        userId: req.user!.userId,
        originalName,
        storagePath: filePath,
        mimeType,
        sizeBytes: buffer.length,
        purpose,
        entityType,
        entityId,
        url,
      })
      .returning();

    res.status(201).json(upload);
  })
);

router.post(
  "/batch",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { files, purpose, entityType, entityId } = req.body as {
      files: Array<{ data: string; name: string; mimeType: string }>;
      purpose: string;
      entityType?: string;
      entityId?: number;
    };

    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: "No files provided" });
      return;
    }

    if (files.length > 10) {
      res.status(400).json({ error: "Maximum 10 files per batch" });
      return;
    }

    const results = [];
    const subDir = join(UPLOAD_DIR, purpose ?? "asset_submission");
    await ensureDir(subDir);

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.mimeType)) continue;

      const buffer = Buffer.from(file.data, "base64");
      if (buffer.length > MAX_FILE_SIZE) continue;

      const ext = extname(file.name) || mimeExtension(file.mimeType);
      const fileName = `${randomUUID()}${ext}`;
      const filePath = join(subDir, fileName);
      await writeFile(filePath, buffer);

      const baseUrl = process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
      const url = `${baseUrl}/uploads/${purpose ?? "asset_submission"}/${fileName}`;

      const [upload] = await db
        .insert(uploads)
        .values({
          userId: req.user!.userId,
          originalName: file.name,
          storagePath: filePath,
          mimeType: file.mimeType,
          sizeBytes: buffer.length,
          purpose: purpose ?? "asset_submission",
          entityType,
          entityId,
          url,
        })
        .returning();

      results.push(upload);
    }

    res.status(201).json({ uploads: results });
  })
);

function mimeExtension(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "application/pdf": ".pdf",
  };
  return map[mime] ?? ".bin";
}

export default router;
