import express from 'express';
import crypto from 'crypto';
import { initProducer, disconnectProducer, isProducerConnected } from './kafka-producer';
import { initConsumer, disconnectConsumer, flushPendingProducerEvents, isConsumerConnected } from './kafka-consumer';
import db from './database';

const app = express();
const PORT = process.env.PORT || 3003;
let outboxInterval: NodeJS.Timeout | null = null;

app.use(express.json());
app.use((req, res, next) => {
    const requestId = (req.headers['x-request-id'] as string | undefined) || crypto.randomUUID();
    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    console.log(JSON.stringify({ level: 'info', service: 'pdf-service', requestId, method: req.method, path: req.path, event: 'request.received' }));
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

// Health check endpoint
app.get('/health', (req, res) => {
    const databaseHealthy = isDatabaseHealthy();
    const kafkaStatus = {
        producerConnected: isProducerConnected(),
        consumerConnected: isConsumerConnected()
    };
    const isHealthy = kafkaStatus.producerConnected && kafkaStatus.consumerConnected && databaseHealthy;
    res.status(200).json({
        status: isHealthy ? 'healthy' : 'degraded',
        service: 'pdf-service',
        timestamp: new Date().toISOString(),
        kafka: kafkaStatus,
        database: databaseHealthy
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
    if (outboxInterval) {
        clearInterval(outboxInterval);
    }
    await disconnectConsumer();
    await disconnectProducer();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down PDF service...');
    if (outboxInterval) {
        clearInterval(outboxInterval);
    }
    await disconnectConsumer();
    await disconnectProducer();
    process.exit(0);
});

// Start server and Kafka
async function start() {
    try {
        // Initialize Kafka producer and consumer
        await initProducer();
        await flushPendingProducerEvents();
        outboxInterval = setInterval(() => {
            flushPendingProducerEvents().catch((error) => {
                console.error('PDF service outbox flush failed:', error);
            });
        }, 5000);
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
