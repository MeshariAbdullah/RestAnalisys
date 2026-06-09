import { v4 as uuidv4 } from "uuid";

const S3_BUCKET = process.env.S3_BUCKET ?? "";

type ImageCategory = "submission" | "studio" | "inspection";

export interface UploadOptions {
  category: ImageCategory;
  filename: string;
  mimeType: string;
}

export interface UploadResult {
  url: string;
  key: string;
}

function extensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[mime] ?? "bin";
}

export async function uploadImage(
  buffer: Buffer,
  options: UploadOptions
): Promise<UploadResult> {
  const ext = extensionFromMime(options.mimeType);
  const key = `${options.category}/${uuidv4()}.${ext}`;

  if (!S3_BUCKET) {
    console.log(
      `[storage:dev] uploadImage → /uploads/${key} (${buffer.length} bytes, original: ${options.filename})`
    );
    return { url: `/uploads/${key}`, key };
  }

  console.log(
    `[storage] uploadImage → s3://${S3_BUCKET}/${key} (${buffer.length} bytes)`
  );
  throw new Error("S3 production client not configured");
}

export async function deleteImage(key: string): Promise<void> {
  if (!S3_BUCKET) {
    console.log(`[storage:dev] deleteImage → ${key}`);
    return;
  }

  console.log(`[storage] deleteImage → s3://${S3_BUCKET}/${key}`);
  throw new Error("S3 production client not configured");
}

export async function getSignedUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  if (!S3_BUCKET) {
    console.log(
      `[storage:dev] getSignedUrl → /uploads/${key} (expires ignored in dev)`
    );
    return `/uploads/${key}`;
  }

  console.log(
    `[storage] getSignedUrl → s3://${S3_BUCKET}/${key} (${expiresInSeconds}s)`
  );
  throw new Error("S3 production client not configured");
}
