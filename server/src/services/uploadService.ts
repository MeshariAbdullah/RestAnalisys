/**
 * File upload service — S3-compatible object storage.
 *
 * In dev mode (no S3 credentials), files are written to a local directory
 * and served via Express static middleware. In production, swap in real S3
 * or compatible (Cloudflare R2, MinIO, DigitalOcean Spaces).
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const S3_BUCKET = process.env.S3_BUCKET ?? "";
const S3_REGION = process.env.S3_REGION ?? "me-south-1";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY ?? "";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY ?? "";
const S3_ENDPOINT = process.env.S3_ENDPOINT ?? "";

const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";

export type UploadCategory = "asset-submission" | "asset-studio" | "inspection" | "document" | "avatar";

export interface UploadRequest {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  category: UploadCategory;
  userId: number;
  entityId?: number;
}

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  size: number;
  mimeType: string;
  provider: "s3" | "local";
  uploadedAt: string;
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function ensureUploadDir(subdir: string): string {
  const dir = path.join(LOCAL_UPLOAD_DIR, subdir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function generateKey(category: UploadCategory, originalName: string): string {
  const ext = path.extname(originalName) || ".jpg";
  const hash = crypto.randomBytes(16).toString("hex");
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  return `${category}/${date}/${hash}${ext}`;
}

export function validateUpload(mimeType: string, size: number): string | null {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return `File type "${mimeType}" not allowed. Accepted: ${[...ALLOWED_MIME_TYPES].join(", ")}`;
  }
  if (size > MAX_FILE_SIZE) {
    return `File too large (${(size / 1024 / 1024).toFixed(1)}MB). Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`;
  }
  return null;
}

export async function uploadFile(req: UploadRequest): Promise<UploadResult> {
  const validationError = validateUpload(req.mimeType, req.buffer.length);
  if (validationError) {
    throw new Error(validationError);
  }

  const key = generateKey(req.category, req.originalName);

  if (!S3_ACCESS_KEY) {
    const dir = ensureUploadDir(path.dirname(key));
    const filePath = path.join(LOCAL_UPLOAD_DIR, key);
    fs.writeFileSync(filePath, req.buffer);

    return {
      url: `${BASE_URL}/uploads/${key}`,
      key,
      bucket: "local",
      size: req.buffer.length,
      mimeType: req.mimeType,
      provider: "local",
      uploadedAt: new Date().toISOString(),
    };
  }

  throw new Error("S3 production client not configured");
}

export async function deleteFile(key: string): Promise<boolean> {
  if (!S3_ACCESS_KEY) {
    const filePath = path.join(LOCAL_UPLOAD_DIR, key);
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  throw new Error("S3 production client not configured");
}

export async function generatePresignedUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  if (!S3_ACCESS_KEY) {
    return `${BASE_URL}/uploads/${key}?expires=${Date.now() + expiresInSeconds * 1000}`;
  }

  throw new Error("S3 production client not configured");
}

export function getLocalUploadDir(): string {
  return LOCAL_UPLOAD_DIR;
}
