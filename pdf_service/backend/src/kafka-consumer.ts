import { Kafka, Consumer } from 'kafkajs';
import { generateBirthCertificatePdf, generateDeathCertificatePdf } from './pdfGenerator';
import { buildAdminLogEvent, buildPdfCompleteEvent, publishEvent } from './kafka-producer';
import db from './database';
import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';

const kafka = new Kafka({
    clientId: 'pdf-service',
    brokers: [process.env.KAFKA_BROKER || 'kafka:29092'],
    retry: {
        initialRetryTime: 100,
        retries: 8
    }
});

let consumer: Consumer;
let consumerConnected = false;

function enqueueOutboxEvent(topic: string, payload: any): void {
    db.prepare(`
        INSERT INTO outbox_events (topic, payload)
        VALUES (?, ?)
    `).run(topic, JSON.stringify(payload));
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

export async function initConsumer() {
    consumer = kafka.consumer({ groupId: 'pdf-service-group' });
    await consumer.connect();
    consumerConnected = true;
    await consumer.subscribe({ topic: 'pdf-generation-requests', fromBeginning: false });

    console.log('Kafka consumer connected and subscribed to pdf-generation-requests');

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            let correlationId: string | undefined;
            try {
                const data = JSON.parse(message.value?.toString() || '{}');
                const { type, submissionId, formData } = data;
                correlationId = data.correlationId;
                const eventId = data.eventId || crypto.createHash('sha1').update(`pdf-generation-requests:${message.value?.toString() || ''}`).digest('hex');

                const processedEvent = db.prepare('SELECT event_id FROM processed_events WHERE event_id = ?').get(eventId);
                if (processedEvent) {
                    return;
                }

                console.log(`Received PDF generation request: type=${type}, submissionId=${submissionId}`);

                // Determine output directory based on certificate type
                const certificatesPath = process.env.CERTIFICATES_PATH || '/app/certificates';
                const outputDir = path.join(certificatesPath, type);
                fs.ensureDirSync(outputDir);

                // Generate PDF file name
                const pdfFileName = `${type}_certificate_${submissionId}_${Date.now()}.pdf`;
                const pdfFilePath = path.join(outputDir, pdfFileName);

                // Generate PDF based on type
                if (type === 'birth') {
                    await generateBirthCertificatePdf(submissionId, formData, pdfFilePath);
                } else if (type === 'death') {
                    await generateDeathCertificatePdf(submissionId, formData, pdfFilePath);
                } else {
                    throw new Error(`Unknown certificate type: ${type}`);
                }

                console.log(`PDF generated: ${pdfFilePath}`);

                // Store PDF metadata in database
                const stmt = db.prepare(`
          INSERT INTO pdfs (certificate_type, submission_id, file_name, file_path)
          VALUES (?, ?, ?, ?)
        `);
                const result = stmt.run(type, submissionId, pdfFileName, pdfFilePath);
                const pdfId = result.lastInsertRowid as number;

                const persistOutbox = db.transaction(() => {
                    db.prepare('INSERT INTO processed_events (event_id, topic) VALUES (?, ?)').run(eventId, 'pdf-generation-requests');
                    enqueueOutboxEvent('admin-logs', buildAdminLogEvent('PDF_GENERATION_STARTED', {
                        certificateType: type,
                        submissionId
                    }, correlationId));
                    enqueueOutboxEvent('pdf-generation-complete', buildPdfCompleteEvent(submissionId, pdfId, pdfFilePath, type, correlationId));
                    enqueueOutboxEvent('admin-logs', buildAdminLogEvent('PDF_GENERATED', {
                        certificateType: type,
                        submissionId,
                        pdfId,
                        fileName: pdfFileName
                    }, correlationId));
                });

                persistOutbox();
                await flushOutbox();

                console.log(`PDF metadata saved with ID: ${pdfId}`);

            } catch (error) {
                console.error('Error processing PDF generation request:', error);
                try {
                    enqueueOutboxEvent('admin-logs', buildAdminLogEvent('PDF_GENERATION_FAILED', {
                        error: error instanceof Error ? error.message : 'Unknown error',
                        rawMessage: message.value?.toString()
                    }, correlationId));
                    await flushOutbox();
                } catch (outboxError) {
                    console.error('Error queueing PDF failure event:', outboxError);
                }
            }
        }
    });

    return consumer;
}

export async function flushPendingProducerEvents(): Promise<void> {
    await flushOutbox();
}

export async function disconnectConsumer() {
    if (consumer) {
        await consumer.disconnect();
        consumerConnected = false;
        console.log('Kafka consumer disconnected');
    }
}

export function isConsumerConnected(): boolean {
    return consumerConnected;
}
