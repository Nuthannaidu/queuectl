import Database from "better-sqlite3";
import path from "path";

const dbPath = path.resolve("queuectl.db");
const db = new Database(dbPath);


db.exec(`
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  command TEXT,
  state TEXT,
  attempts INTEGER,
  max_retries INTEGER,
  created_at TEXT,
  updated_at TEXT,
  next_run_at REAL,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

db.prepare("INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)").run("max_retries", "3");
db.prepare("INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)").run("backoff_base", "2");

export default db;
