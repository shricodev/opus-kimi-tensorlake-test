import Database from "better-sqlite3";
import { CONFIG } from "../config.js";
import { mkdirSync } from "fs";
import path from "path";

// Ensure data directory exists
const dbDir = path.dirname(CONFIG.DATABASE_URL);
try {
  mkdirSync(dbDir, { recursive: true });
} catch {
  // ignore
}

export const db = new Database(CONFIG.DATABASE_URL);

// Enable WAL mode for better concurrency
db.pragma("journal_mode = WAL");

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_id TEXT,
      status TEXT NOT NULL,
      max_attempts INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      final_status TEXT,
      changed_files_json TEXT,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      attempt_number INTEGER NOT NULL,
      phase TEXT NOT NULL,
      status TEXT NOT NULL,
      patch_summary TEXT,
      changed_files_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES runs(id)
    );

    CREATE TABLE IF NOT EXISTS commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL,
      command TEXT NOT NULL,
      args_json TEXT NOT NULL,
      cwd TEXT NOT NULL,
      exit_code INTEGER,
      signal TEXT,
      stdout TEXT,
      stderr TEXT,
      duration_ms INTEGER NOT NULL,
      timed_out INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (attempt_id) REFERENCES attempts(id)
    );
  `);
}
