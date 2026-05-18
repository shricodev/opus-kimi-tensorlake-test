import { Router, Request, Response } from "express";
import multer from "multer";
import { mkdirSync } from "fs";
import path from "path";
import { rm } from "fs/promises";
import { handleZipUpload } from "../uploads/handler.js";
import { CONFIG } from "../config.js";

const router = Router();

const uploadDir = path.join(CONFIG.UPLOAD_ROOT, "tmp");
mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir });

router.post("/api/uploads", upload.single("zip"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  try {
    const result = await handleZipUpload(req.file.path);
    // Clean up temp file
    await rm(req.file.path, { force: true });
    res.json({ uploadId: result.uploadId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

export default router;
