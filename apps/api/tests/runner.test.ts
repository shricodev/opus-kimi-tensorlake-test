import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { LocalRunner } from "../src/runner/local.js";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const TMP_DIR = path.resolve(process.cwd(), "tmp-test-runner");

describe("LocalRunner", () => {
  beforeAll(() => {
    mkdirSync(TMP_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it("runs a command and captures output", async () => {
    const runner = new LocalRunner();
    const ws = {
      id: "test-ws",
      rootPath: TMP_DIR,
    };

    const result = await runner.runCommand(ws, "node", ["-e", "console.log('hello')"]);
    expect(result.success).toBe(true);
    expect(result.stdout).toContain("hello");
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
  });

  it("handles non-zero exit code", async () => {
    const runner = new LocalRunner();
    const ws = {
      id: "test-ws",
      rootPath: TMP_DIR,
    };

    const result = await runner.runCommand(ws, "node", ["-e", "process.exit(1)"]);
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it("times out long-running command", async () => {
    const runner = new LocalRunner();
    const ws = {
      id: "test-ws",
      rootPath: TMP_DIR,
    };

    const result = await runner.runCommand(
      ws,
      "node",
      ["-e", "setTimeout(() => {}, 10000)"],
      { timeoutMs: 100 }
    );
    expect(result.timedOut).toBe(true);
    expect(result.success).toBe(false);
  });

  it("reads and writes files", async () => {
    const runner = new LocalRunner();
    const ws = {
      id: "test-ws",
      rootPath: TMP_DIR,
    };

    const testFile = path.join(TMP_DIR, "test.txt");
    writeFileSync(testFile, "hello world");

    const content = await runner.readFile(ws, "test.txt");
    expect(content).toBe("hello world");

    await runner.writeFile(ws, "test2.txt", "new content");
    const content2 = await runner.readFile(ws, "test2.txt");
    expect(content2).toBe("new content");
  });

  it("refuses path traversal", async () => {
    const runner = new LocalRunner();
    const ws = {
      id: "test-ws",
      rootPath: TMP_DIR,
    };

    await expect(runner.readFile(ws, "../../etc/passwd")).rejects.toThrow("Path traversal");
  });
});
