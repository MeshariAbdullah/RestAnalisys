import { randomUUID } from "crypto";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

interface UploadRequest {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  category: "submission" | "studio" | "inspection" | "evidence";
}

interface PresignedUploadResponse {
  uploadId: string;
  uploadUrl: string;
  publicUrl: string;
  expiresAt: string;
}

const IS_DEV = !process.env.S3_BUCKET;

export function validateUploadRequest(req: UploadRequest): string | null {
  if (!ALLOWED_MIME_TYPES.includes(req.mimeType)) {
    return `Invalid file type: ${req.mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`;
  }
  if (req.sizeBytes > MAX_FILE_SIZE_BYTES) {
    return `File too large: ${(req.sizeBytes / 1024 / 1024).toFixed(1)}MB. Max: 10MB`;
  }
  if (!req.filename || req.filename.length > 255) {
    return "Invalid filename";
  }
  return null;
}

export async function generatePresignedUpload(req: UploadRequest): Promise<PresignedUploadResponse> {
  const error = validateUploadRequest(req);
  if (error) throw new Error(error);

  const uploadId = randomUUID();
  const ext = req.filename.split(".").pop() ?? "jpg";
  const key = `${req.category}/${new Date().toISOString().slice(0, 10)}/${uploadId}.${ext}`;

  if (IS_DEV) {
    return {
      uploadId,
      uploadUrl: `http://localhost:3001/dev-uploads/${key}`,
      publicUrl: `http://localhost:3001/uploads/${key}`,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };
  }

  const bucket = process.env.S3_BUCKET!;
  const region = process.env.S3_REGION ?? "me-south-1";
  const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  // In production, use @aws-sdk/s3-presigner here
  return {
    uploadId,
    uploadUrl: `https://${bucket}.s3.${region}.amazonaws.com/${key}?X-Amz-Algorithm=placeholder`,
    publicUrl,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  };
}

export async function generateMultiplePresignedUploads(
  files: UploadRequest[]
): Promise<PresignedUploadResponse[]> {
  if (files.length > 20) throw new Error("Maximum 20 files per batch");
  return Promise.all(files.map(generatePresignedUpload));
}
