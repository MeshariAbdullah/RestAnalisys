import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";

const DEV_MODE = !process.env.S3_BUCKET;
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "uploads";

interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  devMode: boolean;
}

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: string = "assets"
): Promise<UploadResult> {
  const ext = path.extname(originalName) || ".jpg";
  const key = `${folder}/${randomUUID()}${ext}`;

  if (DEV_MODE) {
    await ensureUploadDir();
    const localPath = path.join(UPLOAD_DIR, key);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, buffer);

    return {
      url: `/uploads/${key}`,
      key,
      bucket: "local",
      devMode: true,
    };
  }

  // Production: S3-compatible upload (AWS S3, Cloudflare R2, MinIO)
  // const s3 = new S3Client({ region: process.env.S3_REGION });
  // await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: buffer, ContentType: mimeType }));
  throw new Error("Production S3 not configured — set S3_BUCKET in .env");
}

export async function deleteFile(key: string): Promise<void> {
  if (DEV_MODE) {
    const localPath = path.join(UPLOAD_DIR, key);
    await fs.unlink(localPath).catch(() => {});
    return;
  }

  // Production: S3 DeleteObject
  throw new Error("Production S3 not configured — set S3_BUCKET in .env");
}

export function getPublicUrl(key: string): string {
  if (DEV_MODE) {
    return `/uploads/${key}`;
  }
  return `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION ?? "me-south-1"}.amazonaws.com/${key}`;
}
