import path from "path";
import { mkdirSync } from "fs";
import { randomUUID } from "crypto";
import type {
  Runner,
  PatchApplier,
  RepairEngine,
  CommandConfig,
  RepoSource,
  Workspace,
  CommandResult,
  AttemptRecord,
} from "@ai-fix-runner/shared";
import { db } from "../db/index.js";

export async function executeRepairRun(params: {
  runId: string;
  source: RepoSource;
  maxAttempts: number;
  commands: CommandConfig;
  runBuildAfterTestsPass: boolean;
  runner: Runner;
  patchApplier: PatchApplier;
  repairEngine: RepairEngine;
}): Promise<void> {
  const {
    runId,
    source,
    maxAttempts,
    commands,
    runBuildAfterTestsPass,
    runner,
    patchApplier,
    repairEngine,
  } = params;

  let workspace: Workspace | null = null;
  const changedFiles: string[] = [];

  try {
    db.prepare(
      `UPDATE runs SET status = ?, updated_at = ? WHERE id = ?`
    ).run("running", new Date().toISOString(), runId);

    // 1. Prepare workspace
    workspace = await runner.prepareWorkspace(source);
    console.log(`[Run ${runId}] Workspace prepared: ${workspace.rootPath}`);

    // 2. Run install
    const installResult = await runner.runCommand(
      workspace,
      commands.install[0],
      commands.install.slice(1)
    );
    persistCommand(runId, 0, "install", installResult);

    if (!installResult.success) {
      markRunFailed(runId, "Install failed");
      return;
    }

    // 3. Repair loop
    for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber++) {
      const isInitial = attemptNumber === 1;
      const phase = isInitial ? "initial_test" : "after_patch";

      // Run tests
      const testResult = await runner.runCommand(
        workspace,
        commands.test[0],
        commands.test.slice(1)
      );
      persistCommand(runId, attemptNumber, phase, testResult);

      if (testResult.success) {
        // Tests pass - optionally run build
        if (runBuildAfterTestsPass) {
          const buildResult = await runner.runCommand(
            workspace,
            commands.build[0],
            commands.build.slice(1)
          );
          persistCommand(runId, attemptNumber, "build", buildResult);

          if (!buildResult.success) {
            markRunFailed(runId, "Build failed after tests passed");
            return;
          }
        }

        markRunPassed(runId, changedFiles);
        return;
      }

      // Tests failed - try to get a patch
      if (!isInitial) {
        // Already applied patch and still failing
        // Try next attempt
      }

      // Collect relevant files for repair
      const relevantFiles = await gatherRelevantFiles(runner, workspace, source);

      const repairInput = {
        fixtureId:
          source.type === "fixture" ? source.fixtureId : undefined,
        attemptNumber,
        workspace,
        failingCommand: testResult,
        relevantFiles,
      };

      const proposal = await repairEngine.proposePatch(repairInput);

      if (proposal.kind === "no_patch") {
        markRunFailed(runId, proposal.message);
        return;
      }

      // Apply patch
      const patchResult = await patchApplier.applyPatch(workspace, proposal);

      // Record attempt with patch info
      const attemptId = db
        .prepare(
          `INSERT INTO attempts (run_id, attempt_number, phase, status, patch_summary, changed_files_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          runId,
          attemptNumber,
          phase,
          patchResult.applied ? "passed" : "failed",
          proposal.summary,
          JSON.stringify(patchResult.changedFiles),
          new Date().toISOString()
        ).lastInsertRowid;

      if (!patchResult.applied) {
        markRunFailed(runId, patchResult.error || "Patch application failed");
        return;
      }

      for (const f of patchResult.changedFiles) {
        if (!changedFiles.includes(f)) changedFiles.push(f);
      }

      console.log(
        `[Run ${runId}] Applied patch for attempt ${attemptNumber}: ${proposal.summary}`
      );
    }

    // Max attempts exhausted
    markRunFailed(runId, `Max attempts (${maxAttempts}) exhausted`);
  } catch (err: any) {
    console.error(`[Run ${runId}] Error:`, err);
    db.prepare(
      `UPDATE runs SET status = ?, updated_at = ?, error_message = ? WHERE id = ?`
    ).run("error", new Date().toISOString(), err.message || String(err), runId);
  } finally {
    if (workspace) {
      await runner.cleanup(workspace);
    }
  }
}

async function gatherRelevantFiles(
  runner: Runner,
  workspace: Workspace,
  source: RepoSource
): Promise<{ path: string; content: string }[]> {
  const files: { path: string; content: string }[] = [];
  const toRead = ["package.json"];

  if (source.type === "fixture") {
    switch (source.fixtureId) {
      case "invoice-calculator-bug":
        toRead.push("src/calculateInvoice.ts", "src/calculateInvoice.test.ts");
        break;
      case "markdown-parser-bug":
        toRead.push("src/parser.ts", "src/parser.test.ts");
        break;
      case "todo-api-bug":
        toRead.push("src/app.ts", "src/app.test.ts");
        break;
    }
  } else {
    // For custom repos, try to find common source files
    try {
      const srcFiles = await runner.listFiles(workspace, "src");
      for (const f of srcFiles) {
        if (f.endsWith(".ts") && !f.endsWith(".test.ts")) {
          toRead.push(`src/${f}`);
        }
      }
    } catch {
      // ignore
    }
  }

  for (const p of toRead) {
    try {
      const content = await runner.readFile(workspace, p);
      files.push({ path: p, content });
    } catch {
      // ignore missing files
    }
  }

  return files;
}

function persistCommand(
  runId: string,
  attemptNumber: number,
  phase: string,
  result: CommandResult
): void {
  const run = db.prepare(`SELECT id FROM runs WHERE id = ?`).get(runId) as
    | { id: string }
    | undefined;
  if (!run) return;

  // Find or create attempt record for this phase
  const existingAttempt = db
    .prepare(
      `SELECT id FROM attempts WHERE run_id = ? AND attempt_number = ? AND phase = ?`
    )
    .get(runId, attemptNumber, phase) as { id: number } | undefined;

  let attemptId: number;

  if (!existingAttempt) {
    const insertResult = db
      .prepare(
        `INSERT INTO attempts (run_id, attempt_number, phase, status, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        runId,
        attemptNumber,
        phase,
        result.success ? "passed" : "failed",
        new Date().toISOString()
      );
    attemptId = Number(insertResult.lastInsertRowid);
  } else {
    attemptId = existingAttempt.id;
    db.prepare(
      `UPDATE attempts SET status = ? WHERE id = ?`
    ).run(result.success ? "passed" : "failed", attemptId);
  }

  db.prepare(
    `INSERT INTO commands (attempt_id, command, args_json, cwd, exit_code, signal, stdout, stderr, duration_ms, timed_out, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    attemptId,
    result.command,
    JSON.stringify(result.args),
    result.cwd,
    result.exitCode,
    result.signal,
    result.stdout,
    result.stderr,
    result.durationMs,
    result.timedOut ? 1 : 0,
    new Date().toISOString()
  );
}

function markRunPassed(runId: string, changedFiles: string[]): void {
  db.prepare(
    `UPDATE runs SET status = ?, updated_at = ?, final_status = ?, changed_files_json = ? WHERE id = ?`
  ).run(
    "passed",
    new Date().toISOString(),
    "passed",
    JSON.stringify(changedFiles),
    runId
  );
}

function markRunFailed(runId: string, errorMessage: string): void {
  db.prepare(
    `UPDATE runs SET status = ?, updated_at = ?, final_status = ?, error_message = ? WHERE id = ?`
  ).run(
    "failed",
    new Date().toISOString(),
    "failed",
    errorMessage,
    runId
  );
}
