#!/usr/bin/env node
import { Command } from "commander";
import { enqueueJob, listJobs, setConfig, getConfig } from "./jobService.js";
import { startWorkerPool, stopWorkers } from "./worker.js";
import db from "./db.js";

const program = new Command();

program
  .name("queuectl")
  .description("Background Job Queue CLI with DLQ and retries")
  .version("2.0.0");
program
  .command("enqueue [job]")
  .option("--file <path>", "Load job(s) from JSON file")
  .option("--max-retries <n>", "Max retry count", "3")
  .description("Add a new job (command or JSON file)")
  .action((job, opts) => {
    if (opts.file) {
      enqueueJob(opts.file, opts.maxRetries, true);
    } else if (job) {
      enqueueJob(job, opts.maxRetries, false);
    } else {
      console.error("❌ Please provide either a command or --file <path>");
      process.exit(1);
    }
  });

program
  .command("list")
  .option("--state <state>", "Filter by state")
  .description("List jobs")
  .action((opts) => listJobs(opts.state));
  
const worker = program.command("worker").description("Manage workers");

worker
  .command("start")
  .option("--count <n>", "Number of workers", "1")
  .description("Start one or more workers")
  .action((opts) => startWorkerPool(parseInt(opts.count)));

worker
  .command("stop")
  .description("Stop running workers gracefully")
  .action(() => stopWorkers());

const config = program.command("config").description("Manage configuration");

config
  .command("set <key> <value>")
  .description("Set configuration value")
  .action((key, value) => setConfig(key, value));

config
  .command("get <key>")
  .description("Get configuration value")
  .action((key) => console.log(`${key} = ${getConfig(key)}`));


const dlq = program.command("dlq").description("Manage Dead Letter Queue");

dlq
  .command("list")
  .description("List jobs in DLQ")
  .action(() => listJobs("dead"));

dlq
  .command("retry <jobId>")
  .description("Retry a job from DLQ")
  .action((jobId) => {
    db.prepare("UPDATE jobs SET state='pending', attempts=0, next_run_at=? WHERE id=?")
      .run(Date.now(), jobId);
    console.log(` Job ${jobId} moved back to pending`);
  });


program
  .command("status")
  .description("Show summary of all job states & active workers")
  .action(() => {
    const counts = db.prepare("SELECT state, COUNT(*) as count FROM jobs GROUP BY state").all();
    console.log("\n Job Status Summary:");
    for (const row of counts) console.log(`   ${row.state}: ${row.count}`);
    console.log("\n  Active Workers: (simulated)");
    console.log("   Use 'worker start --count <n>' to launch workers.\n");
  });

program.parse(process.argv);
