import db from "./db.js";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

function isoNow() {
  return new Date().toISOString();
}


export function enqueueJob(input, maxRetries = 3, isFile = false) {
  const now = isoNow();
  const jobs = [];

  if (isFile) {
    const filePath = path.resolve(input);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const jobArray = Array.isArray(data) ? data : [data];

    for (const item of jobArray) {
      if (!item.command) {
        console.error("❌ Missing 'command' key in job JSON:", item);
        continue;
      }

      const job = {
        id: item.id || uuidv4(),
        command: item.command.trim(),
        state: "pending",
        attempts: 0,
        max_retries: parseInt(item.max_retries || maxRetries),
        created_at: now,
        updated_at: now,
        next_run_at: Date.now(),
        last_error: null,
      };
      db.prepare(
        `INSERT INTO jobs VALUES (@id, @command, @state, @attempts, @max_retries, @created_at, @updated_at, @next_run_at, @last_error)`
      ).run(job);
      console.log(`✅ Job added: ${job.id} (${job.command})`);
      jobs.push(job);
    }

    return jobs;
  }

  let command = String(input).trim();
  if (command.startsWith("'") && command.endsWith("'")) {
    command = command.slice(1, -1);
  }

  const job = {
    id: uuidv4(),
    command,
    state: "pending",
    attempts: 0,
    max_retries: parseInt(maxRetries),
    created_at: now,
    updated_at: now,
    next_run_at: Date.now(),
    last_error: null,
  };

  db.prepare(
    `INSERT INTO jobs VALUES (@id, @command, @state, @attempts, @max_retries, @created_at, @updated_at, @next_run_at, @last_error)`
  ).run(job);

  console.log(`✅ Job added: ${job.id} (${job.command})`);
  return [job];
}


export function listJobs(state = null) {
  let query = "SELECT * FROM jobs";
  const params = [];
  if (state) {
    query += " WHERE state = ?";
    params.push(state);
  }
  const rows = db.prepare(query).all(...params);
  console.table(rows);
}


export function getConfig(key) {
  const row = db.prepare("SELECT value FROM config WHERE key=?").get(key);
  return row ? row.value : null;
}

export function setConfig(key, value) {
  db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)").run(key, String(value));
  console.log(`✅ Config ${key} set to ${value}`);
}
