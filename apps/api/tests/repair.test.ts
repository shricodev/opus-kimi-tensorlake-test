import { describe, it, expect, beforeAll } from "vitest";
import { FixtureRepairEngine } from "../src/repair/fixture.js";
import { LocalRunner } from "../src/runner/local.js";
import { LocalPatchApplier } from "../src/patches/applier.js";
import { executeRepairRun } from "../src/repair/orchestrator.js";
import { mkdirSync, rmSync } from "fs";
import path from "path";
import { CONFIG } from "../src/config.js";
import { db, initDb } from "../src/db/index.js";

const TMP_WORKSPACE = path.resolve(process.cwd(), "tmp-test-integration");

beforeAll(() => {
  // Ensure test DB tables exist
  initDb();
});

describe("FixtureRepairEngine", () => {
  it("returns patches for all 3 built-in fixtures", async () => {
    const engine = new FixtureRepairEngine();
    const ws = { id: "ws", rootPath: TMP_WORKSPACE };

    for (const fixtureId of [
      "invoice-calculator-bug",
      "markdown-parser-bug",
      "todo-api-bug",
    ]) {
      const patch = await engine.proposePatch({
        fixtureId,
        attemptNumber: 1,
        workspace: ws,
        failingCommand: {
          command: "npm",
          args: ["test"],
          cwd: "/tmp",
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 1000,
          exitCode: 1,
          signal: null,
          stdout: "",
          stderr: "",
          timedOut: false,
          success: false,
        },
        relevantFiles: [],
      });

      expect(patch.kind).toBe("patch");
      if (patch.kind === "patch") {
        expect(patch.edits.length).toBeGreaterThan(0);
        expect(patch.edits[0].mode).toBe("replace_file");
      }
    }
  });

  it("returns no_patch for unknown fixtures", async () => {
    const engine = new FixtureRepairEngine();
    const ws = { id: "ws", rootPath: TMP_WORKSPACE };

    const patch = await engine.proposePatch({
      fixtureId: "unknown-fixture",
      attemptNumber: 1,
      workspace: ws,
      failingCommand: {
        command: "npm",
        args: ["test"],
        cwd: "/tmp",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: 1000,
        exitCode: 1,
        signal: null,
        stdout: "",
        stderr: "",
        timedOut: false,
        success: false,
      },
      relevantFiles: [],
    });

    expect(patch.kind).toBe("no_patch");
  });
});

describe("End-to-end fixture repair", () => {
  const fixtures = [
    { id: "invoice-calculator-bug", expectedFile: "src/calculateInvoice.ts" },
    { id: "markdown-parser-bug", expectedFile: "src/parser.ts" },
    { id: "todo-api-bug", expectedFile: "src/app.ts" },
  ];

  for (const fixture of fixtures) {
    it(`fixes ${fixture.id}`, async () => {
      const runId = crypto.randomUUID();
      const now = new Date().toISOString();

      db.prepare(
        `INSERT INTO runs (id, source_type, source_id, status, max_attempts, created_at, updated_at, final_status, changed_files_json, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        runId,
        "fixture",
        fixture.id,
        "running",
        3,
        now,
        now,
        null,
        JSON.stringify([]),
        null
      );

      await executeRepairRun({
        runId,
        source: { type: "fixture", fixtureId: fixture.id },
        maxAttempts: 3,
        commands: {
          install: ["npm", "install"],
          test: ["npm", "test"],
          build: ["npm", "run", "build"],
        },
        runBuildAfterTestsPass: true,
        runner: new LocalRunner(),
        patchApplier: new LocalPatchApplier(),
        repairEngine: new FixtureRepairEngine(),
      });

      const run = db.prepare(`SELECT * FROM runs WHERE id = ?`).get(runId) as Record<string, any>;
      expect(run.final_status).toBe("passed");

      const changedFiles = JSON.parse(run.changed_files_json || "[]");
      expect(changedFiles).toContain(fixture.expectedFile);
    }, 120_000);
  }
});
