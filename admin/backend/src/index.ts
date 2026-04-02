import express from 'express';
import cors from 'cors';
import http from 'http';
import db from './database';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { initWebSocketServer, initKafkaConsumer, disconnect, getKafkaStatus } from './kafka-websocket';
import { issueAdminToken, requireAdminAuth } from './auth';
import { verifyPassword } from './passwords';

const app = express();
const port = process.env.PORT || 3004;
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string | undefined) || crypto.randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  console.log(JSON.stringify({ level: 'info', service: 'admin-service', requestId, method: req.method, path: req.path, event: 'request.received' }));
  next();
});

function isDatabaseHealthy(): boolean {
  try {
    db.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}

// Initialize WebSocket Server
initWebSocketServer(server);

// Health check
app.get('/health', (req, res) => {
  const kafkaStatus = getKafkaStatus();
  const databaseHealthy = isDatabaseHealthy();
  const isHealthy = kafkaStatus.consumerConnected && databaseHealthy;
  res.status(200).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'admin-service',
    kafka: kafkaStatus,
    database: databaseHealthy,
    timestamp: new Date().toISOString()
  });
});

// Auth endpoints
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  try {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(username) as any;

    if (user && verifyPassword(password, user.password_hash)) {
      const token = issueAdminToken(user.username);
      res.json({ success: true, authenticated: true, token, username: user.username });
    } else {
      res.status(401).json({ success: false, authenticated: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, authenticated: false, message: 'Internal server error' });
  }
});

// Get system stats
app.get('/stats', requireAdminAuth, (req, res) => {
  try {
    const pdfCount = db.prepare('SELECT COUNT(*) as count FROM pdfs').get() as { count: number };
    const logCount = db.prepare('SELECT COUNT(*) as count FROM logs').get() as { count: number };

    res.json({
      activeServices: ['birth', 'death', 'pdf', 'admin', 'kafka', 'gateway'],
      totalPdfs: pdfCount.count,
      totalLogs: logCount.count,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all PDFs (Read Model)
app.get('/pdfs', requireAdminAuth, (req, res) => {
  try {
    const pdfs = db.prepare('SELECT * FROM pdfs ORDER BY created_at DESC LIMIT 100').all();
    res.json(pdfs);
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    res.status(500).json({ message: 'Error fetching PDFs' });
  }
});

// Serve PDF files
// In Docker, shares /app/certificates
const certificatesPath = process.env.SHARED_STORAGE_PATH || path.join(__dirname, '..', '..', 'certificates');
app.use('/pdf-files', requireAdminAuth, express.static(certificatesPath));

// Endpoint to view specific PDF via ID (lookup path)
app.get('/pdf/:id', requireAdminAuth, (req, res) => {
  try {
    const stmt = db.prepare('SELECT filePath FROM pdfs WHERE id = ?');
    const result = stmt.get(req.params.id) as { filePath: string };

    if (result && result.filePath) {
      // If path is absolute /app/certificates/..., we need to map it or serve it
      // checking if file exists
      if (fs.existsSync(result.filePath)) {
        res.download(result.filePath);
      } else {
        // Try relative to shared storage if path stored was relative
        res.status(404).json({ message: 'File not found on disk' });
      }
    } else {
      res.status(404).json({ message: 'PDF record not found' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
const start = async () => {
  try {
    await initKafkaConsumer();

    server.listen(port, () => {
      console.log(`Admin Service listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start admin service:', error);
    process.exit(1);
  }
};

const shutdown = async () => {
  console.log('Shutting down...');
  await disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
