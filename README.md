DEMO VIDEO PROJECT LINK::https://drive.google.com/file/d/1truYtkvDlYENcdYVAT8eUBV039AFHmGE/view?usp=sharing
🧰 QueueCTL — CLI Background Job Queue System

🏗️ Built with Node.js + SQLite

Author: Nuthan Sagar Naidu
Project: QueueCTL – Background Job Queue CLI

🎯 Overview

queuectl is a lightweight, CLI-based background job queue system that allows you to:

✅ Enqueue shell commands or JSON-defined jobs

✅ Process them through one or more workers

✅ Automatically retry failed jobs with exponential backoff

✅ Move permanently failed jobs to a Dead Letter Queue (DLQ)

✅ Persist all job data using SQLite

⚙️ Tech Stack
Component	Technology
Language	Node.js (v22+)
Database	SQLite (via better-sqlite3)
CLI Framework	Commander.js
UUID Generator	uuid
🚀 Setup Instructions
1️⃣ Install Dependencies
git clone https://github.com/Nuthannaidu/queuectl.git
cd queuectl
npm install
npm link

2️⃣ Verify Installation
queuectl --help


You should see commands like:

enqueue, list, worker, config, dlq, status

💻 CLI Usage
Command	Description	Example
queuectl enqueue "<command>"	Add a new job inline	queuectl enqueue "echo Hello"
queuectl enqueue --file job.json	Add job(s) from JSON file	queuectl enqueue --file job.json
queuectl list	List all jobs	queuectl list
queuectl list --state pending	Filter by job state	
queuectl worker start	Start worker(s)	queuectl worker start --count 2
queuectl worker stop	Gracefully stop all workers	
queuectl config set <key> <value>	Change config (like retries/backoff)	queuectl config set backoff_base 3
queuectl config get <key>	View config	queuectl config get max_retries
queuectl dlq list	Show jobs in DLQ	
queuectl dlq retry <jobId>	Retry a DLQ job	
queuectl status	Show overall queue stats	
🔄 Job Lifecycle
State	Meaning
pending	Waiting for worker
processing	Currently executing
completed	Finished successfully
failed	Failed but retryable
dead	Permanently failed (moved to DLQ)
🧩 How Retries Work

Each failed job is retried with exponential backoff:

delay = base ^ attempts (in seconds)


Example:
backoff_base = 2, attempts = 3 → delay = 8s

After exceeding max_retries, the job moves to the DLQ.

🧱 Project Structure
queuectl/
├── index.js           # CLI entry point
├── db.js              # SQLite schema setup
├── jobService.js      # Job creation, listing, config helpers
├── worker.js          # Worker logic (Windows-safe sleep)
├── package.json
├── queuectl.db        # SQLite database (auto-created)
└── README.md

🧾 Example JSON Job File (job.json)
[
  { "command": "echo Hello from file!" },
  { "command": "sleep 3", "max_retries": 2 },
  { "command": "echo Job finished after sleep" }
]


Then run:

queuectl enqueue --file job.json
queuectl worker start


Expected output:

✅ Job added: ...
⚙️  [Worker 1] Processing job: (sleep 3)
😴 [Worker 1] Sleeping for 3s...
⏰ [Worker 1] Woke up after 3s
🎉 Job completed (internal sleep)

🧠 Internal Sleep Handling

queuectl detects sleep N commands and simulates them internally in Node.js (using setTimeout).
This ensures Windows compatibility — no more PowerShell redirection errors.

✅ Works on:

Windows (cmd.exe, PowerShell, Git Bash)

macOS

Linux

🧪 Testing Scenarios
✅ Successful Job
queuectl enqueue "echo Hello Queue"
queuectl worker start
# → completed immediately

⚠️ Failing Job → DLQ
queuectl enqueue "exit 1"
queuectl worker start
# retries 3 times, then moves to DLQ
queuectl dlq list

🔁 Retry DLQ Job
queuectl dlq retry <jobId>
queuectl worker start

⚙️ Change Config
queuectl config set max_retries 5
queuectl config get backoff_base

💡 Windows-Safe Notes

sleep N → handled internally (no shell timeout)

echo → works normally

You can run multiple workers using:

queuectl worker start --count 3


Gracefully stop with Ctrl+C

📊 Status Command

View current job counts:

queuectl status


Example output:

📊 Job Status Summary:
   pending: 0
   processing: 0
   completed: 3
   dead: 0

⚙️  Active Workers: (simulated)
   Use 'worker start --count <n>' to launch workers.

🧠 Design Decisions

Synchronous SQLite via better-sqlite3 for reliability

Commander.js for structured CLI

Persistent state (no job loss)

Internal JS-based backoff logic

Cross-platform shell execution (Windows-safe)

🌟 Future Enhancements

Support directories: queuectl enqueue --file jobs/

Add queuectl history to view completed jobs

Optional logging to logs/worker-1.log

REST API wrapper for remote queue management

🏁 Summary

You now have a complete, cross-platform, persistent background job queue system —

usable as a real CLI tool for shell automation or as a teaching tool for backend reliability concepts.
