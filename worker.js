import db from "./db.js";
import { exec } from "child_process";
import util from "util";
import { getConfig } from "./jobService.js";

const execPromise = util.promisify(exec);
let stopSignal = false;


async function handleSleepCommand(seconds, jobId, workerId) {
  console.log(` [Worker ${workerId}] Sleeping for ${seconds}s (Job ${jobId})...`);
  await new Promise((r) => setTimeout(r, seconds * 1000));
  console.log(` [Worker ${workerId}] Woke up after ${seconds}s (Job ${jobId})`);
}


export async function startWorker(id = 1) {
  console.log(` Worker ${id} started...`);

  while (!stopSignal) {
    const now = Date.now();

    const txn = db.transaction(() => {
      const job = db.prepare(
        "SELECT * FROM jobs WHERE state='pending' AND next_run_at <= ? ORDER BY created_at LIMIT 1"
      ).get(now);

      if (job) {
        db.prepare("UPDATE jobs SET state='processing', updated_at=? WHERE id=?")
          .run(new Date().toISOString(), job.id);
      }
      return job;
    });

    const job = txn();

    if (!job) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    console.log(`[Worker ${id}] Processing job: ${job.id} (${job.command})`);

    let cmd = job.command.trim();

    const sleepMatch = cmd.match(/^sleep\s+(\d+)/i);
    if (sleepMatch) {
      const seconds = parseInt(sleepMatch[1]);
      await handleSleepCommand(seconds, job.id, id);
      db.prepare("UPDATE jobs SET state='completed', updated_at=? WHERE id=?")
        .run(new Date().toISOString(), job.id);
      console.log(`[Worker ${id}] Job ${job.id} completed (internal sleep)`);
      continue;
    }

    const shell = process.platform === "win32" ? "cmd.exe" : "/bin/bash";

    try {
      const { stdout, stderr } = await execPromise(cmd, { shell });

      if (stdout) console.log(`✅[Worker ${id}] stdout: ${stdout.trim()}`);
      if (stderr) console.warn(`[Worker ${id}] stderr: ${stderr.trim()}`);

      db.prepare("UPDATE jobs SET state='completed', updated_at=? WHERE id=?")
        .run(new Date().toISOString(), job.id);

      console.log(`[Worker ${id}] Job ${job.id} completed`);
    } catch (err) {
      const attempts = job.attempts + 1;
      const maxRetries = job.max_retries;
      const base = parseFloat(getConfig("backoff_base") || 2);
      const delay = Math.pow(base, attempts) * 1000;
      const nextRun = Date.now() + delay;

      if (attempts > maxRetries) {
        db.prepare(
          "UPDATE jobs SET state='dead', attempts=?, last_error=?, updated_at=? WHERE id=?"
        ).run(attempts, err.message.slice(0, 500), new Date().toISOString(), job.id);
        console.error(`[Worker ${id}] Job ${job.id} moved to DLQ after ${attempts} attempts. Error: ${err.message.trim()}`);
      } else {
        db.prepare(
          "UPDATE jobs SET state='pending', attempts=?, next_run_at=?, last_error=?, updated_at=? WHERE id=?"
        ).run(attempts, nextRun, err.message.slice(0, 500), new Date().toISOString(), job.id);
        console.warn(
          `[Worker ${id}] Job ${job.id} failed, retrying in ${(delay / 1000).toFixed(1)}s. Attempt ${attempts} of ${maxRetries}`
        );
      }
    }
  }

  console.log(`Worker ${id} stopped gracefully.`);
}

let workerPool = [];

export async function startWorkerPool(count = 1) {
  console.log(`Starting ${count} worker(s)...`);
  for (let i = 1; i <= count; i++) {
    const worker = startWorker(i);
    workerPool.push(worker);
  }

  process.on("SIGINT", async () => {
    if (stopSignal) return;
    console.log("\n Graceful shutdown initiated...");
    stopSignal = true;
    await Promise.allSettled(workerPool);
    console.log("✅All workers stopped.");
    process.exit(0);
  });
}

export function stopWorkers() {
  console.log("Stopping workers gracefully...");
  stopSignal = true;
}
