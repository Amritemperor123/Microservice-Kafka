
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';

const pdfDbPath = path.join(__dirname, '..', '..', 'database', 'pdf_metadata.db');

// Ensure the directory exists
fs.ensureDirSync(path.dirname(pdfDbPath));

const pdfDb = new Database(pdfDbPath);

pdfDb.exec(`
  CREATE TABLE IF NOT EXISTS pdfs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submissionId INTEGER NOT NULL,
    filePath TEXT NOT NULL,
    fileName TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default pdfDb;
