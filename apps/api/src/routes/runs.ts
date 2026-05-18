import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { startRunRequestSchema } from "@ai-fix-runner/shared";
import { db } from "../db/index.js";
import { executeRepairRun } from "../repair/orchestrator.js";
import { LocalRunner } from "../runner/local.js";
import { LocalPatchApplier } from "../patches/applier.js";
import { FixtureRepairEngine } from "../repair/fixture.js";
import { NoopRepairEngine } from "../repair/noop.js";

const router = Router();
const runner = new LocalRunner();
const patchApplier = new LocalPatchApplier();
const fixtureRepairEngine = new FixtureRepairEngine();
const noopRepairEngine = new NoopRepairEngine();

router.post("/api/runs", async (req: Request, res: Response) => {
  const parseResult = startRunRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors });
    return;
  }

  const data = parseResult.data;
  const runId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO runs (id, source_type, source_id, status, max_attempts, created_at, updated_at, final_status, changed_files_json, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    runId,
    data.source.type,
    data.source.type === "fixture" ? data.source.fixtureId : data.source.type === "upload" ? data.source.uploadId : data.source.localPath,
    "running",
    data.maxAttempts,
    now,
    now,
    null,
    JSON.stringify([]),
    null
  );

  res.status(202).json({ runId });

  // Start repair asynchronously
  const repairEngine =
    data.source.type === "fixture" ? fixtureRepairEngine : noopRepairEngine;

  executeRepairRun({
    runId,
    source: data.source,
    maxAttempts: data.maxAttempts,
    commands: data.commands,
    runBuildAfterTestsPass: data.runBuildAfterTestsPass,
    runner,
    patchApplier,
    repairEngine,
  }).catch((err) => {
    console.error(`[Run ${runId}] Unhandled error:`, err);
  });
});

router.get("/api/runs/:id", (req: Request, res: Response) => {
  const run = db.prepare(`SELECT * FROM runs WHERE id = ?`).get(req.params.id) as
    | Record<string, any>
    | undefined;

  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }

  const attempts = db
    .prepare(`SELECT * FROM attempts WHERE run_id = ? ORDER BY attempt_number`)
    .all(req.params.id) as Record<string, any>[];

  const attemptRecords = attempts.map((a) => {
    const commands = db
      .prepare(`SELECT * FROM commands WHERE attempt_id = ? ORDER BY id`)
      .all(a.id) as Record<string, any>[];

    return {
      attemptNumber: a.attempt_number,
      phase: a.phase,
      status: a.status,
      commands: commands.map((c) => ({
        command: c.command,
        args: JSON.parse(c.args_json),
        cwd: c.cwd,
        exitCode: c.exit_code,
        signal: c.signal,
        stdout: c.stdout,
        stderr: c.stderr,
        durationMs: c.duration_ms,
        timedOut: c.timed_out === 1,
        success: c.exit_code === 0 && c.timed_out === 0,
      })),
      patch: a.patch_summary
        ? { summary: a.patch_summary, changedFiles: JSON.parse(a.changed_files_json || "[]") }
        : null,
    };
  });

  res.json({
    id: run.id,
    status: run.status,
    source: parseSource(run.source_type, run.source_id),
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    maxAttempts: run.max_attempts,
    attempts: attemptRecords,
    finalStatus: run.final_status,
    changedFiles: JSON.parse(run.changed_files_json || "[]"),
    errorMessage: run.error_message,
  });
});

router.get("/api/runs", (_req: Request, res: Response) => {
  const runs = db
    .prepare(`SELECT * FROM runs ORDER BY created_at DESC LIMIT 20`)
    .all() as Record<string, any>[];

  res.json(
    runs.map((run) => ({
      id: run.id,
      status: run.status,
      source: parseSource(run.source_type, run.source_id),
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      maxAttempts: run.max_attempts,
      finalStatus: run.final_status,
      changedFiles: JSON.parse(run.changed_files_json || "[]"),
      errorMessage: run.error_message,
    }))
  );
});

function parseSource(type: string, id: string) {
  if (type === "fixture") return { type: "fixture", fixtureId: id };
  if (type === "upload") return { type: "upload", uploadId: id };
  return { type: "localPath", localPath: id };
}

export default router;
