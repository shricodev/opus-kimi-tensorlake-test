import { useState, useEffect } from "react";
import { getFixtures, startRun, getRun, getRuns, type Fixture, type RunRecord } from "./api/client";

type View = "dashboard" | "history" | "run";

function StatusTag({ status }: { status: string }) {
  const cls =
    status === "passed"
      ? "tag-passed"
      : status === "failed"
      ? "tag-failed"
      : status === "running"
      ? "tag-running"
      : "tag-other";
  return <span className={`tag ${cls}`}>{status}</span>;
}

function CommandLog({ cmd }: { cmd: any }) {
  return (
    <div className="collapsible">
      <details>
        <summary>
          {cmd.command} {cmd.args.join(" ")} —{" "}
          {cmd.success ? (
            <span style={{ color: "var(--success)" }}>exit {cmd.exitCode}</span>
          ) : (
            <span style={{ color: "var(--danger)" }}>
              exit {cmd.exitCode}
              {cmd.timedOut ? " (timed out)" : ""}
            </span>
          )}{" "}
          ({cmd.durationMs}ms)
        </summary>
        {cmd.stdout && (
          <div>
            <strong>stdout:</strong>
            <pre>{cmd.stdout}</pre>
          </div>
        )}
        {cmd.stderr && (
          <div>
            <strong>stderr:</strong>
            <pre>{cmd.stderr}</pre>
          </div>
        )}
      </details>
    </div>
  );
}

function RunDetail({ runId, onBack }: { runId: string; onBack: () => void }) {
  const [run, setRun] = useState<RunRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const data = await getRun(runId);
      if (!cancelled) {
        setRun(data);
        setLoading(false);
      }
    }

    load();

    const interval = setInterval(() => {
      if (
        run?.status === "running" ||
        run?.status === "queued"
      ) {
        load();
      }
    }, 1500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [runId, run?.status]);

  if (loading) return <div className="container">Loading run details...</div>;
  if (!run) return <div className="container">Run not found</div>;

  return (
    <div className="container">
      <button className="btn btn-secondary" onClick={onBack}>
        Back
      </button>
      <h1>Run {run.id.slice(0, 8)}</h1>
      <p>
        Status: <StatusTag status={run.status} />
      </p>
      <p>Created: {new Date(run.createdAt).toLocaleString()}</p>
      <p>Max attempts: {run.maxAttempts}</p>
      {run.errorMessage && (
        <div className="warning">Error: {run.errorMessage}</div>
      )}
      {run.changedFiles.length > 0 && (
        <p>
          Changed files: <code>{run.changedFiles.join(", ")}</code>
        </p>
      )}

      <h2>Attempts</h2>
      <div className="timeline">
        {run.attempts.map((attempt) => (
          <div
            key={attempt.attemptNumber}
            className={`attempt ${attempt.status}`}
          >
            <strong>
              Attempt {attempt.attemptNumber} ({attempt.phase})
            </strong>{" "}
            <StatusTag status={attempt.status} />
            {attempt.patch && (
              <div style={{ marginTop: 8 }}>
                <em>Patch:</em> {attempt.patch.summary}
                {attempt.patch.changedFiles.length > 0 && (
                  <div>
                    Files: {" "}
                    <code>{attempt.patch.changedFiles.join(", ")}</code>
                  </div>
                )}
              </div>
            )}
            {attempt.commands.map((cmd, i) => (
              <CommandLog key={i} cmd={cmd} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard({
  onViewRun,
}: {
  onViewRun: (id: string) => void;
}) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [maxAttempts, setMaxAttempts] = useState(3);

  useEffect(() => {
    getFixtures().then(setFixtures);
  }, []);

  async function runFixture(fixtureId: string) {
    setRunning(fixtureId);
    try {
      const { runId } = await startRun({
        source: { type: "fixture", fixtureId },
        maxAttempts,
        commands: {
          install: ["npm", "install"],
          test: ["npm", "test"],
          build: ["npm", "run", "build"],
        },
        runBuildAfterTestsPass: true,
      });
      onViewRun(runId);
    } catch (e) {
      alert("Failed to start run");
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="container">
      <h1>AI Fix Runner</h1>
      <p>
        Run a broken repo locally, capture failing tests, apply a repair patch,
        and prove the fix by rerunning tests.
      </p>
      <div className="warning">
        <strong>Warning:</strong> Local mode runs package scripts on your
        machine. Use trusted repos only.
      </div>

      <div className="input-group" style={{ maxWidth: 200 }}>
        <label>Max attempts</label>
        <input
          type="number"
          min={1}
          max={10}
          value={maxAttempts}
          onChange={(e) => setMaxAttempts(parseInt(e.target.value, 10))}
        />
      </div>

      <h2>Built-in Fixtures</h2>
      <div className="grid">
        {fixtures.map((f) => (
          <div className="card" key={f.id}>
            <h3>{f.name}</h3>
            <p>{f.description}</p>
            <p>
              <small>
                <code>
                  {f.defaultCommands.test.join(" ")} |{" "}
                  {f.defaultCommands.build.join(" ")}
                </code>
              </small>
            </p>
            <button
              className="btn btn-primary"
              onClick={() => runFixture(f.id)}
              disabled={running === f.id}
            >
              {running === f.id ? "Running..." : "Run Repair"}
            </button>
          </div>
        ))}
      </div>

      <h2>Custom Repo</h2>
      <div className="card">
        <p style={{ color: "var(--muted)" }}>
          Automatic patching is available for built-in fixtures only in Test
          1. User-provided repos will run tests but require a real LLM repair
          engine for automatic patching.
        </p>
      </div>
    </div>
  );
}

function History({
  onViewRun,
}: {
  onViewRun: (id: string) => void;
}) {
  const [runs, setRuns] = useState<RunRecord[]>([]);

  useEffect(() => {
    getRuns().then(setRuns);
    const interval = setInterval(() => {
      getRuns().then(setRuns);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container">
      <h1>Run History</h1>
      {runs.length === 0 ? (
        <p>No runs yet.</p>
      ) : (
        <div>
          {runs.map((run) => (
            <div
              className="card"
              key={run.id}
              style={{ cursor: "pointer" }}
              onClick={() => onViewRun(run.id)}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong>Run {run.id.slice(0, 8)}</strong>{" "}
                  <StatusTag status={run.finalStatus || run.status} />
                </div>
                <small style={{ color: "var(--muted)" }}>
                  {new Date(run.createdAt).toLocaleString()}
                </small>
              </div>
              <p style={{ marginTop: 4 }}>
                Source: {run.source?.type} —{" "}
                {run.source?.fixtureId || run.source?.uploadId || "custom"}
                <br />
                Attempts: {run.attempts?.length || 0} / {run.maxAttempts}
                {run.changedFiles?.length > 0 && (
                  <>
                    <br />
                    Changed: <code>{run.changedFiles.join(", ")}</code>
                  </>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [runId, setRunId] = useState<string | null>(null);

  function showRun(id: string) {
    setRunId(id);
    setView("run");
  }

  return (
    <div>
      <div className="container">
        <div className="nav">
          <button
            className={view === "dashboard" ? "active" : ""}
            onClick={() => setView("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={view === "history" ? "active" : ""}
            onClick={() => setView("history")}
          >
            History
          </button>
        </div>
      </div>

      {view === "dashboard" && <Dashboard onViewRun={showRun} />}
      {view === "history" && <History onViewRun={showRun} />}
      {view === "run" && runId && (
        <RunDetail runId={runId} onBack={() => setView("dashboard")} />
      )}
    </div>
  );
}
