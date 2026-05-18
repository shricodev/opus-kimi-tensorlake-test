import { mkdirSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { rm } from "fs/promises";
import { createReadStream } from "fs";
import unzipper from "unzipper";
import { CONFIG } from "../config.js";

export interface UploadResult {
  uploadId: string;
  extractedPath: string;
}

function isPathTraversal(extractPath: string, targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  const root = path.resolve(extractPath);
  return !resolved.startsWith(root + path.sep) && resolved !== root;
}

export async function handleZipUpload(filePath: string): Promise<UploadResult> {
  const uploadId = randomUUID();
  const extractDir = path.join(CONFIG.UPLOAD_ROOT, uploadId);
  mkdirSync(extractDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const extractStream = unzipper.Parse();

    extractStream.on("entry", (entry: unzipper.Entry) => {
      const entryPath = path.join(extractDir, entry.path);

      // Prevent path traversal
      if (isPathTraversal(extractDir, entryPath)) {
        entry.autodrain();
        return;
      }

      if (entry.type === "Directory") {
        mkdirSync(entryPath, { recursive: true });
        entry.autodrain();
      } else {
        mkdirSync(path.dirname(entryPath), { recursive: true });
        entry.pipe(require("fs").createWriteStream(entryPath));
      }
    });

    extractStream.on("close", () => {
      resolve({ uploadId, extractedPath: extractDir });
    });

    extractStream.on("error", async (err: Error) => {
      await rm(extractDir, { recursive: true, force: true }).catch(() => {});
      await rm(filePath, { force: true }).catch(() => {});
      reject(err);
    });

    createReadStream(filePath).pipe(extractStream);
  });
}
