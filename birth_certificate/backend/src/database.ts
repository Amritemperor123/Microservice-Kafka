
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

export default db;
