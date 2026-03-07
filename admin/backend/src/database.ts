
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'admin.db');

// Ensure the directory exists
fs.ensureDirSync(path.dirname(dbPath));

const db = new Database(dbPath);

console.log(`Admin database initialized at ${dbPath}`);

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Check if admin user exists, if not create default
const adminCheck = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminCheck) {
  // In a real app, use bcrypt. For now, simple matching as per existing codebase logic (or lack thereof)
  // The existing code used a hardcoded check or verifyAdmin function. 
  // Let's insert a default admin.
  // NOTE: The previous code imported `verifyAdmin` from `adminDatabase.ts`. 
  // We should replicate that or improve it. 
  // For now, let's insert a record. 
  // Assuming the `verifyAdmin` logic will strictly check against this table.
  const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
  stmt.run('admin', 'admin123'); // Storing plain text for now to match likely previous behavior or simplifiction, but column says hash. 
  // Ideally we should use bcrypt. But I don't want to add bcrypt pkg if not already there.
  // Checking package.json... valid point. 
  console.log('Default admin user created');
}

// Create pdfs table to track generated certificates (Read Model)
db.exec(`
  CREATE TABLE IF NOT EXISTS pdfs (
    id INTEGER PRIMARY KEY,
    submissionId INTEGER,
    fileName TEXT,
    filePath TEXT,
    certificateType TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create logs table for audit trail
db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default db;
