import { describe, it, expect } from "vitest";
import { LocalPatchApplier } from "../src/patches/applier.js";
import { mkdirSync, rmSync } from "fs";
import path from "path";
import { readFileSync } from "fs";

const TMP_DIR = path.resolve(process.cwd(), "tmp-test-patches");

describe("LocalPatchApplier", () => {
  it("applies replace_file patch correctly", async () => {
    mkdirSync(TMP_DIR, { recursive: true });
    const applier = new LocalPatchApplier();
    const ws = { id: "ws", rootPath: TMP_DIR };

    const result = await applier.applyPatch(ws, {
      kind: "patch",
      summary: "Test patch",
      edits: [
        {
          path: "src/hello.ts",
          mode: "replace_file",
          content: "export const hello = 'world';",
        },
      ],
    });

    expect(result.applied).toBe(true);
    expect(result.changedFiles).toEqual(["src/hello.ts"]);

    const written = readFileSync(path.join(TMP_DIR, "src/hello.ts"), "utf-8");
    expect(written).toBe("export const hello = 'world';");

    rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it("refuses path traversal in patch", async () => {
    mkdirSync(TMP_DIR, { recursive: true });
    const applier = new LocalPatchApplier();
    const ws = { id: "ws", rootPath: TMP_DIR };

    const result = await applier.applyPatch(ws, {
      kind: "patch",
      summary: "Evil patch",
      edits: [
        {
          path: "../outside.txt",
          mode: "replace_file",
          content: "evil",
        },
      ],
    });

    expect(result.applied).toBe(false);
    expect(result.error).toContain("traversal");

    rmSync(TMP_DIR, { recursive: true, force: true });
  });
});
