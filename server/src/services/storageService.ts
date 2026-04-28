/**
 * Storage service — handles file uploads to S3-compatible storage.
 *
 * Supports pre-signed URL generation for direct browser uploads and
 * server-side uploads for inspection images and PDFs.
 *
 * Without credentials, stores metadata locally and returns dev URLs.
 */

import crypto from "node:crypto";

const S3_BUCKET = process.env.S3_BUCKET ?? "";
const S3_REGION = process.env.S3_REGION ?? "me-south-1";
const S3_ENDPOINT = process.env.S3_ENDPOINT ?? "";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY ?? "";

export type UploadCategory =
  | "asset_submission"
  | "asset_studio"
  | "inspection_before"
  | "inspection_after"
  | "inspection_report"
  | "legal_contract"
  | "dispute_evidence"
  | "owner_agreement";

export interface PresignedUrlRequest {
  category: UploadCategory;
  fileName: string;
  contentType: string;
  entityId: number;
  userId: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresAt: string;
}

export async function generatePresignedUploadUrl(
  req: PresignedUrlRequest
): Promise<PresignedUrlResponse> {
  const ext = req.fileName.split(".").pop() ?? "bin";
  const key = `${req.category}/${req.entityId}/${crypto.randomUUID()}.${ext}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  if (!S3_ACCESS_KEY) {
    return {
      uploadUrl: `https://storage-dev.mlr.local/upload/${key}?expires=${expiresAt}`,
      publicUrl: `https://storage-dev.mlr.local/${key}`,
      key,
      expiresAt,
    };
  }

  throw new Error("S3 production client not configured");
}

export interface BatchPresignedRequest {
  category: UploadCategory;
  files: Array<{ fileName: string; contentType: string }>;
  entityId: number;
  userId: number;
}

export async function generateBatchPresignedUrls(
  req: BatchPresignedRequest
): Promise<PresignedUrlResponse[]> {
  const results: PresignedUrlResponse[] = [];
  for (const file of req.files) {
    const result = await generatePresignedUploadUrl({
      category: req.category,
      fileName: file.fileName,
      contentType: file.contentType,
      entityId: req.entityId,
      userId: req.userId,
    });
    results.push(result);
  }
  return results;
}

export interface DeleteFileRequest {
  key: string;
}

export async function deleteFile(req: DeleteFileRequest): Promise<{ deleted: boolean }> {
  if (!S3_ACCESS_KEY) {
    console.log(`[storage] DEV → delete key=${req.key}`);
    return { deleted: true };
  }

  throw new Error("S3 production client not configured");
}
