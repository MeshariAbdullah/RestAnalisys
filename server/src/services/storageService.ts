import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER ?? "local";
const S3_BUCKET = process.env.S3_BUCKET ?? "";
const S3_REGION = process.env.S3_REGION ?? "me-south-1";
const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR ?? "uploads";

export interface UploadRequest {
  buffer: Buffer;
  mimeType: string;
  folder: string;
  originalName?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  provider: string;
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export function validateUpload(buffer: Buffer, mimeType: string): { valid: boolean; reason?: string } {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { valid: false, reason: `Unsupported file type: ${mimeType}` };
  }
  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, reason: `File too large: ${buffer.length} bytes (max ${MAX_FILE_SIZE})` };
  }
  return { valid: true };
}

function generateKey(folder: string, mimeType: string, originalName?: string): string {
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
  const timestamp = Date.now();
  const rand = crypto.randomBytes(8).toString("hex");
  const safeName = originalName
    ? originalName.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 50)
    : "file";
  return `${folder}/${timestamp}-${rand}-${safeName}.${ext}`;
}

async function uploadLocal(req: UploadRequest): Promise<UploadResult> {
  const key = generateKey(req.folder, req.mimeType, req.originalName);
  const fullPath = path.join(LOCAL_UPLOAD_DIR, key);
  const dir = path.dirname(fullPath);

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, req.buffer);

  return {
    key,
    url: `/uploads/${key}`,
    size: req.buffer.length,
    mimeType: req.mimeType,
    provider: "local",
  };
}

async function uploadS3(_req: UploadRequest): Promise<UploadResult> {
  if (!S3_BUCKET) {
    throw new Error("S3_BUCKET not configured");
  }
  // Production: use @aws-sdk/client-s3 PutObjectCommand
  throw new Error("S3 upload not implemented — install @aws-sdk/client-s3");
}

export async function uploadFile(req: UploadRequest): Promise<UploadResult> {
  const validation = validateUpload(req.buffer, req.mimeType);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  if (STORAGE_PROVIDER === "s3" && S3_BUCKET) {
    return uploadS3(req);
  }
  return uploadLocal(req);
}

export async function deleteFile(key: string): Promise<void> {
  if (STORAGE_PROVIDER === "s3" && S3_BUCKET) {
    throw new Error("S3 delete not implemented");
  }

  const fullPath = path.join(LOCAL_UPLOAD_DIR, key);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

export function getPublicUrl(key: string): string {
  if (STORAGE_PROVIDER === "s3" && S3_BUCKET) {
    return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
  }
  return `/uploads/${key}`;
}
