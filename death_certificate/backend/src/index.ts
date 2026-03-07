import express from 'express';
import cors from 'cors';
import db from './database';
import {
  initProducer,
  initConsumer,
  publishCertificateRequest,
  publishPdfGenerationRequest,
  publishAdminLog,
  disconnectKafka
} from './kafka';

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'death-certificate',
    timestamp: new Date().toISOString(),
    kafka: true, // simplified for now
    database: true
  });
});

app.post('/submit-form', async (req, res) => {
  const { formData } = req.body;

  try {
    // 1. Save to local database
    const stmt = db.prepare('INSERT INTO submissions (data) VALUES (?)');
    const result = stmt.run(JSON.stringify(formData));
    const submissionId = result.lastInsertRowid as number;

    console.log(`Saved submission ${submissionId} to local database`);

    // 2. Publish events to Kafka
    try {
      // Notify about new certificate request
      await publishCertificateRequest(submissionId, formData);

      // Request PDF generation
      await publishPdfGenerationRequest(submissionId, formData);

      // Log to admin
      await publishAdminLog('FORM_SUBMITTED', {
        submissionId,
        service: 'death'
      });

      console.log(`Published Kafka events for submission ${submissionId}`);
    } catch (kafkaError) {
      console.error('Error publishing to Kafka:', kafkaError);
      // We continue even if Kafka fails, as data is saved locally
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

    // Initialize Consumer to listen for PDF completion
    await initConsumer((submissionId, pdfId, pdfPath) => {
      try {
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
