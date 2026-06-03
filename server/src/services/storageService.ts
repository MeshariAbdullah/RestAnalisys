import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const S3_BUCKET = process.env.S3_BUCKET ?? "";
const S3_REGION = process.env.S3_REGION ?? "me-south-1";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY_ID ?? "";
const S3_SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY ?? "";
const CDN_BASE_URL = process.env.CDN_BASE_URL ?? "";

const LOCAL_UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

export interface UploadRequest {
  buffer: Buffer;
  mimeType: string;
  folder: "submissions" | "studio" | "inspections" | "documents" | "avatars";
  originalName?: string;
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
  provider: "s3" | "local";
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function generateKey(folder: string, mimeType: string): string {
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  const hash = crypto.randomBytes(16).toString("hex");
  return `${folder}/${date}/${hash}.${ext}`;
}

export async function uploadFile(req: UploadRequest): Promise<UploadResult> {
  if (!ALLOWED_MIME_TYPES.has(req.mimeType)) {
    throw new Error(`Unsupported file type: ${req.mimeType}`);
  }
  if (req.buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const key = generateKey(req.folder, req.mimeType);

  if (S3_ACCESS_KEY && S3_SECRET_KEY && S3_BUCKET) {
    throw new Error("S3 production client not configured — install @aws-sdk/client-s3");
  }

  const dir = path.join(LOCAL_UPLOAD_DIR, path.dirname(key));
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(LOCAL_UPLOAD_DIR, key);
  fs.writeFileSync(filePath, req.buffer);

  const baseUrl = process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
  const url = `${baseUrl}/uploads/${key}`;

  console.log(`[storage:local] saved ${key} (${req.buffer.length} bytes)`);

  return {
    url,
    key,
    size: req.buffer.length,
    mimeType: req.mimeType,
    provider: "local",
  };
}

export async function deleteFile(key: string): Promise<void> {
  if (S3_ACCESS_KEY && S3_SECRET_KEY && S3_BUCKET) {
    throw new Error("S3 production client not configured");
  }

  const filePath = path.join(LOCAL_UPLOAD_DIR, key);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`[storage:local] deleted ${key}`);
  }
}

export interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
  expiresAt: string;
}

export async function generatePresignedUploadUrl(
  folder: UploadRequest["folder"],
  mimeType: string
): Promise<PresignedUrlResult> {
  const key = generateKey(folder, mimeType);

  if (S3_ACCESS_KEY && S3_SECRET_KEY && S3_BUCKET) {
    throw new Error("S3 production client not configured");
  }

  const baseUrl = process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
  return {
    uploadUrl: `${baseUrl}/api/upload/direct`,
    key,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
}
