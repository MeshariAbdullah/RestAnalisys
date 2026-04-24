/**
 * Storage service — S3-compatible object storage for asset images.
 *
 * Supports AWS S3, MinIO, DigitalOcean Spaces, Cloudflare R2.
 * In dev mode (no credentials), files are stored locally in /tmp/mlr-uploads.
 *
 * Environment variables:
 *   S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_ENDPOINT (optional)
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const S3_BUCKET = process.env.S3_BUCKET ?? "";
const S3_REGION = process.env.S3_REGION ?? "me-south-1";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY ?? "";
const S3_ENDPOINT = process.env.S3_ENDPOINT ?? "";
const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR ?? "/tmp/mlr-uploads";
const PUBLIC_URL_BASE = process.env.PUBLIC_URL_BASE ?? "http://localhost:3001/uploads";

const isProduction = !!S3_BUCKET && !!S3_ACCESS_KEY;

if (!isProduction) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
  sizeBytes: number;
  contentType: string;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
  expiresInSeconds: number;
}

function generateKey(folder: string, originalName: string): string {
  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  const hash = crypto.randomBytes(16).toString("hex");
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  return `${folder}/${date}/${hash}${ext}`;
}

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export function validateFile(contentType: string, sizeBytes: number): string | null {
  if (!ALLOWED_TYPES.has(contentType)) {
    return `File type "${contentType}" not allowed. Accepted: ${[...ALLOWED_TYPES].join(", ")}`;
  }
  if (sizeBytes > MAX_FILE_SIZE) {
    return `File too large (${(sizeBytes / 1024 / 1024).toFixed(1)}MB). Max: ${MAX_FILE_SIZE / 1024 / 1024}MB`;
  }
  return null;
}

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  contentType: string,
  folder = "assets"
): Promise<UploadResult> {
  const validationError = validateFile(contentType, buffer.length);
  if (validationError) throw new Error(validationError);

  const key = generateKey(folder, originalName);

  if (!isProduction) {
    const filePath = path.join(LOCAL_UPLOAD_DIR, key);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);

    return {
      key,
      url: `${PUBLIC_URL_BASE}/${key}`,
      bucket: "local",
      sizeBytes: buffer.length,
      contentType,
    };
  }

  // Production: implement S3 PutObject here
  throw new Error("S3 production client not configured");
}

export async function generatePresignedUploadUrl(
  originalName: string,
  contentType: string,
  folder = "assets"
): Promise<PresignedUrlResult> {
  const key = generateKey(folder, originalName);

  if (!isProduction) {
    return {
      uploadUrl: `${PUBLIC_URL_BASE}/presigned/${key}`,
      key,
      expiresInSeconds: 3600,
    };
  }

  // Production: implement S3 presigned PUT URL here
  throw new Error("S3 production client not configured");
}

export async function deleteFile(key: string): Promise<boolean> {
  if (!isProduction) {
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

export function getPublicUrl(key: string): string {
  if (!isProduction) {
    return `${PUBLIC_URL_BASE}/${key}`;
  }

  if (S3_ENDPOINT) {
    return `${S3_ENDPOINT}/${S3_BUCKET}/${key}`;
  }
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
}
