import { Router } from "express";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError } from "../utils/errors.js";
import {
  uploadFile,
  generatePresignedUploadUrl,
  deleteFile,
  validateFile,
} from "../services/storageService.js";

const router = Router();

router.post(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const contentType = req.headers["content-type"] ?? "";

    if (contentType.includes("multipart/form-data")) {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk as Buffer);
      }
      const rawBody = Buffer.concat(chunks);

      const boundary = contentType.split("boundary=")[1];
      if (!boundary) throw new ValidationError("Missing multipart boundary");

      const { fileBuffer, fileName, fileContentType } = parseMultipart(rawBody, boundary);

      const error = validateFile(fileContentType, fileBuffer.length);
      if (error) throw new ValidationError(error);

      const result = await uploadFile(fileBuffer, fileName, fileContentType, "assets");
      return res.status(201).json(result);
    }

    throw new ValidationError("Expected multipart/form-data");
  })
);

router.post(
  "/presign",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { fileName, contentType } = req.body as {
      fileName: string;
      contentType: string;
    };
    if (!fileName || !contentType) {
      throw new ValidationError("fileName and contentType are required");
    }

    const error = validateFile(contentType, 0);
    if (error && !error.includes("too large")) throw new ValidationError(error);

    const result = await generatePresignedUploadUrl(fileName, contentType, "assets");
    res.json(result);
  })
);

router.delete(
  "/:key(*)",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const key = req.params.key;
    if (!key) throw new ValidationError("File key is required");

    const deleted = await deleteFile(key);
    res.json({ deleted, key });
  })
);

function parseMultipart(
  body: Buffer,
  boundary: string
): { fileBuffer: Buffer; fileName: string; fileContentType: string } {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = splitBuffer(body, boundaryBuffer);

  for (const part of parts) {
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;

    const headers = part.subarray(0, headerEnd).toString();
    if (!headers.includes("filename=")) continue;

    const fileNameMatch = headers.match(/filename="([^"]+)"/);
    const contentTypeMatch = headers.match(/Content-Type:\s*(.+)/i);

    const fileName = fileNameMatch?.[1] ?? "upload.bin";
    const fileContentType = contentTypeMatch?.[1]?.trim() ?? "application/octet-stream";

    let fileBuffer = part.subarray(headerEnd + 4);
    if (fileBuffer.subarray(-2).toString() === "\r\n") {
      fileBuffer = fileBuffer.subarray(0, -2);
    }

    return { fileBuffer, fileName, fileContentType };
  }

  throw new ValidationError("No file found in multipart body");
}

function splitBuffer(buffer: Buffer, delimiter: Buffer): Buffer[] {
  const parts: Buffer[] = [];
  let start = 0;

  while (start < buffer.length) {
    const idx = buffer.indexOf(delimiter, start);
    if (idx === -1) {
      parts.push(buffer.subarray(start));
      break;
    }
    if (idx > start) {
      parts.push(buffer.subarray(start, idx));
    }
    start = idx + delimiter.length;
  }

  return parts;
}

export default router;
