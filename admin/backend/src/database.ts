
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import { hashPassword, isHashedPassword } from './passwords';

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'admin.db');
const bootstrapUsername = process.env.ADMIN_USERNAME || 'admin';
const bootstrapPassword = process.env.ADMIN_PASSWORD || 'admin123';
const bootstrapPasswordHash = process.env.ADMIN_PASSWORD_HASH || hashPassword(bootstrapPassword);

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
const adminCheck = db.prepare('SELECT id, password_hash FROM users WHERE username = ?').get(bootstrapUsername) as
  | { id: number; password_hash: string }
  | undefined;
if (!adminCheck) {
  const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
  stmt.run(bootstrapUsername, bootstrapPasswordHash);
  console.log(`Bootstrap admin user created for username "${bootstrapUsername}"`);
} else if (!isHashedPassword(adminCheck.password_hash)) {
  const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
  stmt.run(bootstrapPasswordHash, adminCheck.id);
  console.log(`Migrated plaintext password for bootstrap admin "${bootstrapUsername}" to hashed storage`);
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

db.exec(`
  CREATE TABLE IF NOT EXISTS processed_events (
    event_id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default db;
