import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';

const adminDbPath = path.join(__dirname, '..', '..', 'database', 'admin.db');

// Ensure the directory exists
fs.ensureDirSync(path.dirname(adminDbPath));

const adminDb = new Database(adminDbPath);

// Ensure admin table exists
adminDb.exec(`
  CREATE TABLE IF NOT EXISTS admin (
    admin TEXT PRIMARY KEY,
    password TEXT NOT NULL
  )
`);

// Check if admin user exists, if not create default
const checkAdmin = adminDb.prepare('SELECT COUNT(*) as count FROM admin WHERE admin = ?');
const adminExists = checkAdmin.get('admin123') as { count: number } | undefined;

if (!adminExists || adminExists.count === 0) {
  const insertStmt = adminDb.prepare('INSERT INTO admin (admin, password) VALUES (?, ?)');
  insertStmt.run('admin123', 'admin123');
  console.log('Default admin user created: admin123 / admin123');
}

export const verifyAdmin = (username: string, password: string): boolean => {
  try {
    const stmt = adminDb.prepare('SELECT password FROM admin WHERE admin = ?');
    const result = stmt.get(username) as { password: string } | undefined;
    
    if (result && result.password === password) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error verifying admin:', error);
    return false;
  }
};

export const getAllAdmins = () => {
  try {
    const stmt = adminDb.prepare('SELECT admin FROM admin');
    const results = stmt.all() as { admin: string }[];
    return results.map(row => row.admin);
  } catch (error) {
    console.error('Error fetching admins:', error);
    return [];
  }
};

export default adminDb;
