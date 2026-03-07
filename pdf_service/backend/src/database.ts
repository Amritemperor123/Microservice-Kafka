import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/pdfs.db');

// Ensure data directory exists
fs.ensureDirSync(path.dirname(dbPath));

const db = new Database(dbPath);

// Create pdfs table
db.exec(`
  CREATE TABLE IF NOT EXISTS pdfs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    certificate_type TEXT NOT NULL,
    submission_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log(`PDF metadata database initialized at ${dbPath}`);

export default db;
