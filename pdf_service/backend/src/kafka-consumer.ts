import { Kafka, Consumer } from 'kafkajs';
import { generateBirthCertificatePdf, generateDeathCertificatePdf } from './pdfGenerator';
import { publishPdfComplete, publishAdminLog } from './kafka-producer';
import db from './database';
import path from 'path';
import fs from 'fs-extra';

const kafka = new Kafka({
    clientId: 'pdf-service',
    brokers: [process.env.KAFKA_BROKER || 'kafka:29092'],
    retry: {
        initialRetryTime: 100,
        retries: 8
    }
});

let consumer: Consumer;

export async function initConsumer() {
    consumer = kafka.consumer({ groupId: 'pdf-service-group' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'pdf-generation-requests', fromBeginning: false });

    console.log('Kafka consumer connected and subscribed to pdf-generation-requests');

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            try {
                const data = JSON.parse(message.value?.toString() || '{}');
                const { type, submissionId, formData } = data;

                console.log(`Received PDF generation request: type=${type}, submissionId=${submissionId}`);

                await publishAdminLog('PDF_GENERATION_STARTED', {
                    certificateType: type,
                    submissionId
                });

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

                // Publish completion event
                await publishPdfComplete(submissionId, pdfId, pdfFilePath, type);

                await publishAdminLog('PDF_GENERATED', {
                    certificateType: type,
                    submissionId,
                    pdfId,
                    fileName: pdfFileName
                });

                console.log(`PDF metadata saved with ID: ${pdfId}`);

            } catch (error) {
                console.error('Error processing PDF generation request:', error);

                await publishAdminLog('PDF_GENERATION_FAILED', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    rawMessage: message.value?.toString()
                });
            }
        }
    });

    return consumer;
}

export async function disconnectConsumer() {
    if (consumer) {
        await consumer.disconnect();
        console.log('Kafka consumer disconnected');
    }
}
