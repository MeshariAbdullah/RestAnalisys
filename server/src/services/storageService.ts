import crypto from "node:crypto";
import path from "node:path";

const S3_BUCKET = process.env.S3_BUCKET ?? "";
const S3_REGION = process.env.S3_REGION ?? "me-south-1";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY ?? "";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY ?? "";
const S3_ENDPOINT = process.env.S3_ENDPOINT ?? "";

export type StorageFolder = "submissions" | "studio" | "inspections" | "contracts" | "disputes";

export interface PresignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

export interface UploadResult {
  key: string;
  publicUrl: string;
  sizeBytes: number;
  mimeType: string;
}

function generateKey(folder: StorageFolder, originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase() || ".jpg";
  const unique = crypto.randomBytes(12).toString("hex");
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  return `${folder}/${date}/${unique}${ext}`;
}

export async function getPresignedUploadUrl(
  folder: StorageFolder,
  filename: string,
  mimeType: string,
  expiresInSeconds = 600
): Promise<PresignedUploadResult> {
  const key = generateKey(folder, filename);

  if (!S3_ACCESS_KEY) {
    const baseUrl = S3_ENDPOINT || `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`;
    return {
      uploadUrl: `${baseUrl}/${key}?X-Amz-Expires=${expiresInSeconds}&dev=true`,
      publicUrl: `${baseUrl}/${key}`,
      key,
      expiresIn: expiresInSeconds,
    };
  }

  throw new Error("S3 production client not configured");
}

export async function uploadBuffer(
  folder: StorageFolder,
  filename: string,
  buffer: Buffer,
  mimeType: string
): Promise<UploadResult> {
  const key = generateKey(folder, filename);

  if (!S3_ACCESS_KEY) {
    const baseUrl = S3_ENDPOINT || `https://mlr-storage-dev.local`;
    console.log(`[storage:dev] upload ${key} (${buffer.length} bytes, ${mimeType})`);
    return {
      key,
      publicUrl: `${baseUrl}/${key}`,
      sizeBytes: buffer.length,
      mimeType,
    };
  }

  throw new Error("S3 production client not configured");
}

export async function deleteObject(key: string): Promise<void> {
  if (!S3_ACCESS_KEY) {
    console.log(`[storage:dev] delete ${key}`);
    return;
  }
  throw new Error("S3 production client not configured");
}

export function getPublicUrl(key: string): string {
  const baseUrl = S3_ENDPOINT || `https://${S3_BUCKET || "mlr-storage-dev"}.s3.${S3_REGION}.amazonaws.com`;
  return `${baseUrl}/${key}`;
}
