import express from 'express';
import { initProducer, disconnectProducer } from './kafka-producer';
import { initConsumer, disconnectConsumer } from './kafka-consumer';
import db from './database';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'pdf-service',
        timestamp: new Date().toISOString(),
        kafka: true, // Will be updated with actual Kafka connection status
        database: true
    });
});

// Get all PDFs metadata
app.get('/pdfs', (req, res) => {
    try {
        const stmt = db.prepare(`
      SELECT id, certificate_type, submission_id, file_name, file_path, created_at
      FROM pdfs
      ORDER BY created_at DESC
    `);
        const pdfs = stmt.all();
        res.json(pdfs);
    } catch (error) {
        console.error('Error fetching PDFs:', error);
        res.status(500).json({ message: 'Error fetching PDFs' });
    }
});

// Get specific PDF metadata
app.get('/pdf/:id', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM pdfs WHERE id = ?');
        const pdf = stmt.get(req.params.id);

        if (pdf) {
            res.json(pdf);
        } else {
            res.status(404).json({ message: 'PDF not found' });
        }
    } catch (error) {
        console.error('Error fetching PDF:', error);
        res.status(500).json({ message: 'Error fetching PDF' });
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down PDF service...');
    await disconnectConsumer();
    await disconnectProducer();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down PDF service...');
    await disconnectConsumer();
    await disconnectProducer();
    process.exit(0);
});

// Start server and Kafka
async function start() {
    try {
        // Initialize Kafka producer and consumer
        await initProducer();
        await initConsumer();

        // Start Express server
        app.listen(PORT, () => {
            console.log(`PDF Service listening on port ${PORT}`);
            console.log(`Kafka broker: ${process.env.KAFKA_BROKER || 'kafka:29092'}`);
            console.log(`Certificates path: ${process.env.CERTIFICATES_PATH || '/app/certificates'}`);
        });
    } catch (error) {
        console.error('Failed to start PDF service:', error);
        process.exit(1);
    }
}

start();
