import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from workspace root if it exists
const envPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: envPath });

export const CONFIG = {
  PORT: parseInt(process.env.PORT || "8787", 10),
  DATABASE_URL: process.env.DATABASE_URL || "./data/ai-fix-runner.sqlite",
  WORKSPACE_ROOT: process.env.WORKSPACE_ROOT || "./tmp/workspaces",
  UPLOAD_ROOT: process.env.UPLOAD_ROOT || "./tmp/uploads",
  KEEP_WORKSPACES: process.env.KEEP_WORKSPACES === "true",
  ALLOW_CUSTOM_REPO_PATHS: process.env.ALLOW_CUSTOM_REPO_PATHS === "true",
  MAX_STDIO_BYTES: parseInt(process.env.MAX_STDIO_BYTES || "200000", 10),
  FIXTURES_ROOT: path.resolve(__dirname, "../../../fixtures"),
} as const;
