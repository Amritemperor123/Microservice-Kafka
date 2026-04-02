
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'database', 'submissions.db');

// Ensure the directory exists
fs.ensureDirSync(path.dirname(dbPath));

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    pdf_id INTEGER,
    pdf_path TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS outbox_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    next_attempt_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS processed_events (
    event_id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default db;
