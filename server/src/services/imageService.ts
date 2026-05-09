import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
  source: "s3" | "local";
}

const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION;
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "uploads";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function isS3Configured(): boolean {
  return !!(S3_BUCKET && S3_REGION && process.env.AWS_ACCESS_KEY_ID);
}

function ensureUploadDir(subdir: string): string {
  const dir = path.join(UPLOAD_DIR, subdir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function validateImageUpload(
  buffer: Buffer,
  mimeType: string
): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: `Unsupported file type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}` };
  }
  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB. Max: 10MB` };
  }
  return { valid: true };
}

export async function uploadImage(
  buffer: Buffer,
  mimeType: string,
  category: "assets" | "inspections" | "disputes" | "profiles"
): Promise<UploadResult> {
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const key = `${category}/${uuidv4()}.${ext}`;

  if (isS3Configured()) {
    // TODO: Wire real S3 SDK when credentials are available
    return {
      url: `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`,
      key,
      size: buffer.length,
      mimeType,
      source: "s3",
    };
  }

  const dir = ensureUploadDir(category);
  const filename = `${uuidv4()}.${ext}`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);

  const baseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";
  return {
    url: `${baseUrl}/uploads/${category}/${filename}`,
    key: `${category}/${filename}`,
    size: buffer.length,
    mimeType,
    source: "local",
  };
}

export async function deleteImage(key: string): Promise<boolean> {
  if (isS3Configured()) {
    // TODO: Wire real S3 SDK
    return true;
  }

  const filePath = path.join(UPLOAD_DIR, key);
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}
