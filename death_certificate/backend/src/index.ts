import express from 'express';
import cors from 'cors';
import fs from 'fs';
import crypto from 'crypto';
import db from './database';
import { validateDeathForm } from './validation';
import {
  initProducer,
  initConsumer,
  buildCertificateRequestEvent,
  buildPdfGenerationRequestEvent,
  buildAdminLogEvent,
  publishEvent,
  getKafkaStatus,
  disconnectKafka
} from './kafka';

const app = express();
const port = process.env.PORT || 3002;
let outboxInterval: NodeJS.Timeout | null = null;

app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string | undefined) || crypto.randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  console.log(JSON.stringify({ level: 'info', service: 'death-certificate', requestId, method: req.method, path: req.path, event: 'request.received' }));
  next();
});

function enqueueOutboxEvent(topic: string, payload: any): void {
  const stmt = db.prepare(`
    INSERT INTO outbox_events (topic, payload)
    VALUES (?, ?)
  `);
  stmt.run(topic, JSON.stringify(payload));
}

async function flushOutbox(batchSize = 20): Promise<void> {
  const events = db.prepare(`
    SELECT id, topic, payload, retry_count
    FROM outbox_events
    WHERE status IN ('pending', 'retrying')
      AND datetime(next_attempt_at) <= datetime('now')
    ORDER BY id ASC
    LIMIT ?
  `).all(batchSize) as Array<{ id: number; topic: string; payload: string; retry_count: number }>;

  for (const event of events) {
    try {
      await publishEvent(event.topic, JSON.parse(event.payload));
      db.prepare(`
        UPDATE outbox_events
        SET status = 'published',
            published_at = CURRENT_TIMESTAMP,
            last_error = NULL
        WHERE id = ?
      `).run(event.id);
    } catch (error) {
      const retryCount = event.retry_count + 1;
      const retryDelaySeconds = Math.min(60, Math.pow(2, Math.min(retryCount, 6)));
      db.prepare(`
        UPDATE outbox_events
        SET status = 'retrying',
            retry_count = ?,
            last_error = ?,
            next_attempt_at = datetime('now', ?)
        WHERE id = ?
      `).run(
        retryCount,
        error instanceof Error ? error.message : 'Unknown error',
        `+${retryDelaySeconds} seconds`,
        event.id
      );
    }
  }
}

function isDatabaseHealthy(): boolean {
  try {
    db.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  const kafkaStatus = getKafkaStatus();
  const databaseHealthy = isDatabaseHealthy();
  const isHealthy = kafkaStatus.producerConnected && kafkaStatus.consumerConnected && databaseHealthy;
  res.status(200).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'death-certificate',
    timestamp: new Date().toISOString(),
    kafka: kafkaStatus,
    database: databaseHealthy
  });
});

app.post('/submit-form', async (req, res) => {
  const { formData } = req.body;
  const validationErrors = validateDeathForm(formData);

  if (validationErrors.length > 0) {
    res.status(400).json({
      message: 'Invalid form data',
      errors: validationErrors
    });
    return;
  }

  try {
    const correlationId = res.locals.requestId as string;
    const createSubmission = db.transaction((payload: any) => {
      const stmt = db.prepare('INSERT INTO submissions (data) VALUES (?)');
      const result = stmt.run(JSON.stringify(payload));
      const submissionId = result.lastInsertRowid as number;

      enqueueOutboxEvent('certificate-requests', buildCertificateRequestEvent(submissionId, payload, correlationId));
      enqueueOutboxEvent('pdf-generation-requests', buildPdfGenerationRequestEvent(submissionId, payload, correlationId));
      enqueueOutboxEvent('admin-logs', buildAdminLogEvent('FORM_SUBMITTED', {
        submissionId,
        service: 'death'
      }, correlationId));

      return submissionId;
    });

    const submissionId = createSubmission(formData);

    console.log(`Saved submission ${submissionId} to local database`);

    try {
      await flushOutbox();
      console.log(`Queued Kafka events for submission ${submissionId}`);
    } catch (kafkaError) {
      console.error('Error flushing Kafka outbox:', kafkaError);
    }

    res.status(200).json({
      message: 'Form submitted successfully. Processing in background.',
      submissionId: submissionId,
      status: 'pending'
    });

  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({
      message: 'Error submitting form data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/submission/:id/pdf', (req, res) => {
  const submissionId = req.params.id;

  try {
    const stmt = db.prepare('SELECT pdf_path, status FROM submissions WHERE id = ?');
    const result = stmt.get(submissionId) as { pdf_path?: string; status?: string } | undefined;

    if (!result) {
      res.status(404).json({ message: 'Submission not found.' });
      return;
    }

    if (result.status !== 'pdf_ready' || !result.pdf_path) {
      res.status(409).json({ message: 'PDF is not ready yet.' });
      return;
    }

    if (!fs.existsSync(result.pdf_path)) {
      res.status(404).json({ message: 'PDF file not found on disk.' });
      return;
    }

    res.download(result.pdf_path);
  } catch (error) {
    console.error('Error fetching submission PDF:', error);
    res.status(500).json({ message: 'Error fetching submission PDF.' });
  }
});

// Endpoint to get submission status/data
app.get('/submission/:id', (req, res) => {
  const submissionId = req.params.id;
  try {
    const stmt = db.prepare('SELECT * FROM submissions WHERE id = ?');
    const result = stmt.get(submissionId) as any;

    if (result) {
      res.json({
        ...result,
        data: JSON.parse(result.data)
      });
    } else {
      res.status(404).json({ message: 'Submission not found.' });
    }
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ message: 'Error fetching submission.' });
  }
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down service...');
  if (outboxInterval) {
    clearInterval(outboxInterval);
  }
  await disconnectKafka();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
const start = async () => {
  try {
    // Initialize Kafka
    await initProducer();
    await flushOutbox();
    outboxInterval = setInterval(() => {
      flushOutbox().catch((error) => {
        console.error('Outbox flush failed:', error);
      });
    }, 5000);

    // Initialize Consumer to listen for PDF completion
    await initConsumer((submissionId, pdfId, pdfPath, eventId) => {
      try {
        if (eventId) {
          const processedEvent = db.prepare('SELECT event_id FROM processed_events WHERE event_id = ?').get(eventId);
          if (processedEvent) {
            return;
          }
          db.prepare('INSERT INTO processed_events (event_id, topic) VALUES (?, ?)').run(eventId, 'pdf-generation-complete');
        }
        const stmt = db.prepare('UPDATE submissions SET pdf_id = ?, pdf_path = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        stmt.run(pdfId, pdfPath, 'pdf_ready', submissionId);
        console.log(`Updated submission ${submissionId} with PDF info`);
      } catch (err) {
        console.error(`Failed to update submission ${submissionId}:`, err);
      }
    });

    app.listen(port, () => {
      console.log(`Death Certificate Service listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start service:', error);
    process.exit(1);
  }
};

start();
