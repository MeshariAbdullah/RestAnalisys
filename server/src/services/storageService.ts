import crypto from "node:crypto";
import path from "node:path";

const S3_BUCKET = process.env.S3_BUCKET ?? "";
const S3_REGION = process.env.S3_REGION ?? "me-south-1";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY ?? "";
const S3_ENDPOINT = process.env.S3_ENDPOINT ?? "";
const CDN_BASE_URL = process.env.CDN_BASE_URL ?? "https://cdn-stub.mlr.sa";

export type UploadCategory = "asset-submission" | "asset-studio" | "inspection" | "contract" | "invoice" | "avatar";

export interface UploadRequest {
  category: UploadCategory;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  entityId?: number;
}

export interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresAt: string;
}

export interface UploadResult {
  key: string;
  publicUrl: string;
  fileSizeBytes: number;
  contentType: string;
  uploadedAt: string;
}

function generateKey(category: UploadCategory, fileName: string, entityId?: number): string {
  const ext = path.extname(fileName) || ".bin";
  const hash = crypto.randomBytes(8).toString("hex");
  const prefix = entityId ? `${category}/${entityId}` : category;
  return `${prefix}/${Date.now()}-${hash}${ext}`;
}

export async function createPresignedUpload(req: UploadRequest): Promise<PresignedUpload> {
  const key = generateKey(req.category, req.fileName, req.entityId);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  if (!S3_ACCESS_KEY) {
    return {
      uploadUrl: `${CDN_BASE_URL}/dev-upload/${key}`,
      publicUrl: `${CDN_BASE_URL}/${key}`,
      key,
      expiresAt,
    };
  }

  throw new Error("S3 production client not configured");
}

export async function confirmUpload(key: string): Promise<UploadResult> {
  if (!S3_ACCESS_KEY) {
    return {
      key,
      publicUrl: `${CDN_BASE_URL}/${key}`,
      fileSizeBytes: 0,
      contentType: "application/octet-stream",
      uploadedAt: new Date().toISOString(),
    };
  }

  throw new Error("S3 production client not configured");
}

export async function deleteObject(key: string): Promise<void> {
  if (!S3_ACCESS_KEY) {
    console.log(`[storage] DEV delete: ${key}`);
    return;
  }

  throw new Error("S3 production client not configured");
}

export function getPublicUrl(key: string): string {
  return `${CDN_BASE_URL}/${key}`;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const ALLOWED_DOC_TYPES = ["application/pdf"];

export function validateUpload(req: UploadRequest): { valid: boolean; error?: string } {
  if (req.fileSizeBytes > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }

  const allowedTypes = req.category === "contract" || req.category === "invoice"
    ? [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES]
    : ALLOWED_IMAGE_TYPES;

  if (!allowedTypes.includes(req.contentType)) {
    return { valid: false, error: `Invalid file type: ${req.contentType}. Allowed: ${allowedTypes.join(", ")}` };
  }

  return { valid: true };
}
