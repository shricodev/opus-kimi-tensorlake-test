// ---------------------------------------------------------------------------
// Shared types for AI Fix Runner
// ---------------------------------------------------------------------------

/**
 * Result of running a command via a Runner.
 */
export interface CommandResult {
  command: string;
  args: string[];
  cwd: string;
  startedAt: string; // ISO timestamp
  finishedAt: string; // ISO timestamp
  durationMs: number;
  exitCode: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  success: boolean;
}

/**
 * A workspace handle returned by a Runner.
 */
export interface Workspace {
  id: string;
  rootPath: string;
}

/**
 * Abstraction over command execution and file access.
 * Designed so that LocalRunner can be swapped for TensorlakeRunner in Test 2.
 */
export interface Runner {
  prepareWorkspace(repoSource: RepoSource): Promise<Workspace>;
  runCommand(
    workspace: Workspace,
    command: string,
    args: string[],
    options?: { timeoutMs?: number; cwd?: string }
  ): Promise<CommandResult>;
  readFile(workspace: Workspace, relativePath: string): Promise<string>;
  writeFile(
    workspace: Workspace,
    relativePath: string,
    content: string
  ): Promise<void>;
  listFiles(workspace: Workspace, relativePath?: string): Promise<string[]>;
  cleanup(workspace: Workspace): Promise<void>;
}

/**
 * A single file edit in a patch proposal.
 */
export interface PatchEdit {
  path: string; // relative to workspace root
  mode: "replace_file";
  content: string;
}

/**
 * Patch proposal returned by a RepairEngine.
 */
export interface PatchProposal {
  kind: "patch";
  summary: string;
  edits: PatchEdit[];
}

/**
 * Returned when the engine cannot or will not produce a patch.
 */
export interface NoPatchProposal {
  kind: "no_patch";
  message: string;
}

export type PatchProposalOrNone = PatchProposal | NoPatchProposal;

/**
 * Input given to a RepairEngine.
 */
export interface RepairInput {
  fixtureId?: string;
  attemptNumber: number;
  workspace: Workspace;
  failingCommand: CommandResult;
  relevantFiles: { path: string; content: string }[];
}

/**
 * Abstraction over the "AI" that proposes patches.
 */
export interface RepairEngine {
  proposePatch(input: RepairInput): Promise<PatchProposalOrNone>;
}

/**
 * Result of applying a patch.
 */
export interface AppliedPatchResult {
  applied: boolean;
  changedFiles: string[];
  error?: string;
}

/**
 * Abstraction over patch application.
 */
export interface PatchApplier {
  applyPatch(
    workspace: Workspace,
    patch: PatchProposal
  ): Promise<AppliedPatchResult>;
}

/**
 * Source of a repo.
 */
export type RepoSource =
  | { type: "fixture"; fixtureId: string }
  | { type: "localPath"; localPath: string }
  | { type: "upload"; uploadId: string };

/**
 * Command configuration for a run.
 */
export interface CommandConfig {
  install: string[];
  test: string[];
  build: string[];
}

/**
 * Request body for POST /api/runs
 */
export interface StartRunRequest {
  source: RepoSource;
  maxAttempts?: number;
  commands: CommandConfig;
  runBuildAfterTestsPass?: boolean;
}

/**
 * A stored attempt (what we persist / return over the wire).
 */
export interface AttemptRecord {
  attemptNumber: number;
  phase: "initial_test" | "after_patch";
  status: "passed" | "failed" | "error";
  commands: CommandResult[];
  patch: { summary: string; changedFiles: string[] } | null;
}

/**
 * A stored run (what we persist / return over the wire).
 */
export interface RunRecord {
  id: string;
  status: "queued" | "running" | "passed" | "failed" | "error";
  source: RepoSource;
  createdAt: string;
  updatedAt: string;
  maxAttempts: number;
  attempts: AttemptRecord[];
  finalStatus?: "passed" | "failed" | "error";
  changedFiles: string[];
  errorMessage?: string;
}
