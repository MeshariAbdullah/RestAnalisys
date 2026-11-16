import { Router } from "express";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { ValidationError } from "../utils/errors.js";

const router = Router();

router.post(
  "/images",
  authenticate,
  upload.array("images", 5),
  (req: AuthedRequest, res) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      throw new ValidationError("No images provided");
    }

    const result = files.map((f) => ({
      url: `/uploads/${f.filename}`,
      filename: f.filename,
      size: f.size,
    }));

    res.status(201).json({ images: result });
  }
);

export default router;
