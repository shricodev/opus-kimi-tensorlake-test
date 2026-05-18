import { mkdirSync } from "fs";
import path from "path";
import {
  type PatchApplier,
  type Workspace,
  type PatchProposal,
  type AppliedPatchResult,
} from "@ai-fix-runner/shared";

export class LocalPatchApplier implements PatchApplier {
  async applyPatch(
    workspace: Workspace,
    patch: PatchProposal
  ): Promise<AppliedPatchResult> {
    const changedFiles: string[] = [];

    for (const edit of patch.edits) {
      if (edit.mode !== "replace_file") {
        return {
          applied: false,
          changedFiles: [],
          error: `Unsupported patch mode: ${edit.mode}`,
        };
      }

      // Validate path doesn't contain ..
      if (edit.path.includes("..")) {
        return {
          applied: false,
          changedFiles: [],
          error: `Path traversal detected in patch: ${edit.path}`,
        };
      }

      const target = path.resolve(workspace.rootPath, edit.path);
      const root = path.resolve(workspace.rootPath);

      if (!target.startsWith(root)) {
        return {
          applied: false,
          changedFiles: [],
          error: `Path ${edit.path} is outside workspace`,
        };
      }

      mkdirSync(path.dirname(target), { recursive: true });
      const fs = await import("fs/promises");
      await fs.writeFile(target, edit.content, "utf-8");
      changedFiles.push(edit.path);
    }

    return { applied: true, changedFiles };
  }
}
