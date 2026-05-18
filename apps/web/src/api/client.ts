const API_BASE = "";

export interface Fixture {
  id: string;
  name: string;
  description: string;
  language: string;
  defaultCommands: {
    install: string[];
    test: string[];
    build: string[];
  };
}

export interface CommandResult {
  command: string;
  args: string[];
  cwd: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  exitCode: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  success: boolean;
}

export interface AttemptRecord {
  attemptNumber: number;
  phase: string;
  status: string;
  commands: CommandResult[];
  patch: { summary: string; changedFiles: string[] } | null;
}

export interface RunRecord {
  id: string;
  status: string;
  source: any;
  createdAt: string;
  updatedAt: string;
  maxAttempts: number;
  attempts: AttemptRecord[];
  finalStatus?: string;
  changedFiles: string[];
  errorMessage?: string;
}

export async function getFixtures(): Promise<Fixture[]> {
  const res = await fetch(`${API_BASE}/api/fixtures`);
  const data = await res.json();
  return data.fixtures || [];
}

export async function startRun(body: any): Promise<{ runId: string }> {
  const res = await fetch(`${API_BASE}/api/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function getRun(id: string): Promise<RunRecord> {
  const res = await fetch(`${API_BASE}/api/runs/${id}`);
  return res.json();
}

export async function getRuns(): Promise<RunRecord[]> {
  const res = await fetch(`${API_BASE}/api/runs`);
  return res.json();
}
