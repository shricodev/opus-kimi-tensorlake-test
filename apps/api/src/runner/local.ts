import { spawn } from "child_process";
import { mkdirSync, rmSync } from "fs";
import { cp, readFile, writeFile, readdir, rm } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  type Runner,
  type Workspace,
  type RepoSource,
  type CommandResult,
} from "@ai-fix-runner/shared";
import { CONFIG } from "../config.js";

const DEFAULT_TIMEOUTS: Record<string, number> = {
  "npm-install": 120_000,
  "npm-test": 60_000,
  "npm-run-build": 60_000,
};

function getTimeout(command: string, args: string[]): number {
  const key = [command, ...args].join("-");
  return DEFAULT_TIMEOUTS[key] || 60_000;
}

function safeTruncate(text: string, maxBytes: number): string {
  const buf = Buffer.from(text, "utf-8");
  if (buf.length <= maxBytes) return text;
  const truncated = buf.subarray(0, maxBytes).toString("utf-8");
  return truncated + "\n[TRUNCATED: output exceeded max size]\n";
}

export class LocalRunner implements Runner {
  async prepareWorkspace(repoSource: RepoSource): Promise<Workspace> {
    const id = randomUUID();
    const rootPath = path.resolve(CONFIG.WORKSPACE_ROOT, id);
    mkdirSync(rootPath, { recursive: true });

    if (repoSource.type === "fixture") {
      const fixturePath = path.join(CONFIG.FIXTURES_ROOT, repoSource.fixtureId);
      await cp(fixturePath, rootPath, {
        recursive: true,
        filter: (src) => {
          const basename = path.basename(src);
          return basename !== "node_modules" && basename !== ".git";
        },
      });
    } else if (repoSource.type === "localPath") {
      if (!CONFIG.ALLOW_CUSTOM_REPO_PATHS) {
        throw new Error("Custom repo paths are not allowed");
      }
      const resolved = path.resolve(repoSource.localPath);
      // Ensure path is within allowed directories
      await cp(resolved, rootPath, {
        recursive: true,
        filter: (src) => {
          const basename = path.basename(src);
          return basename !== "node_modules" && basename !== ".git";
        },
      });
    } else if (repoSource.type === "upload") {
      const uploadPath = path.join(CONFIG.UPLOAD_ROOT, repoSource.uploadId);
      await cp(uploadPath, rootPath, {
        recursive: true,
        filter: (src) => {
          const basename = path.basename(src);
          return basename !== "node_modules" && basename !== ".git";
        },
      });
    }

    return { id, rootPath };
  }

  async runCommand(
    workspace: Workspace,
    command: string,
    args: string[],
    options?: { timeoutMs?: number; cwd?: string }
  ): Promise<CommandResult> {
    const cwd = options?.cwd || workspace.rootPath;
    const timeoutMs = options?.timeoutMs || getTimeout(command, args);
    const startedAt = new Date().toISOString();

    return new Promise((resolve) => {
      const proc = spawn(command, args, {
        cwd,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf-8");
      });

      proc.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf-8");
      });

      const timer = setTimeout(() => {
        proc.kill("SIGTERM");
        setTimeout(() => proc.kill("SIGKILL"), 5000);
      }, timeoutMs);

      proc.on("error", (err) => {
        clearTimeout(timer);
        const finishedAt = new Date().toISOString();
        const durationMs = Date.now() - new Date(startedAt).getTime();
        resolve({
          command,
          args,
          cwd,
          startedAt,
          finishedAt,
          durationMs,
          exitCode: null,
          signal: null,
          stdout: safeTruncate(stdout, CONFIG.MAX_STDIO_BYTES),
          stderr: safeTruncate(
            stderr + `\nSpawn error: ${err.message}\n`,
            CONFIG.MAX_STDIO_BYTES
          ),
          timedOut: false,
          success: false,
        });
      });

      proc.on("close", (exitCode, signal) => {
        clearTimeout(timer);
        const finishedAt = new Date().toISOString();
        const durationMs = Date.now() - new Date(startedAt).getTime();
        const killedByTimeout =
          exitCode === null && signal === "SIGTERM" || signal === "SIGKILL";
        resolve({
          command,
          args,
          cwd,
          startedAt,
          finishedAt,
          durationMs,
          exitCode,
          signal: signal || null,
          stdout: safeTruncate(stdout, CONFIG.MAX_STDIO_BYTES),
          stderr: safeTruncate(stderr, CONFIG.MAX_STDIO_BYTES),
          timedOut: killedByTimeout,
          success: exitCode === 0 && !killedByTimeout,
        });
      });
    });
  }

  async readFile(workspace: Workspace, relativePath: string): Promise<string> {
    const target = path.join(workspace.rootPath, relativePath);
    // Ensure the target is inside the workspace
    const realTarget = await this.resolveSafePath(target, workspace.rootPath);
    return readFile(realTarget, "utf-8");
  }

  async writeFile(
    workspace: Workspace,
    relativePath: string,
    content: string
  ): Promise<void> {
    const target = path.join(workspace.rootPath, relativePath);
    const realTarget = await this.resolveSafePath(target, workspace.rootPath);
    await writeFile(realTarget, content, "utf-8");
  }

  async listFiles(
    workspace: Workspace,
    relativePath = "."
  ): Promise<string[]> {
    const target = path.join(workspace.rootPath, relativePath);
    const realTarget = await this.resolveSafePath(target, workspace.rootPath);
    const entries = await readdir(realTarget, { withFileTypes: true });
    return entries.map((e) => e.name);
  }

  async cleanup(workspace: Workspace): Promise<void> {
    if (CONFIG.KEEP_WORKSPACES) {
      console.log(`[KEEP_WORKSPACES] Skipping cleanup for ${workspace.rootPath}`);
      return;
    }
    await rm(workspace.rootPath, { recursive: true, force: true });
  }

  private async resolveSafePath(
    target: string,
    workspaceRoot: string
  ): Promise<string> {
    const resolved = path.resolve(target);
    const root = path.resolve(workspaceRoot);
    if (!resolved.startsWith(root)) {
      throw new Error(
        `Path traversal detected: ${resolved} is outside workspace ${root}`
      );
    }
    return resolved;
  }
}
