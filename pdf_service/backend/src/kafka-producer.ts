import { Kafka, Producer } from 'kafkajs';
import crypto from 'crypto';

const kafka = new Kafka({
    clientId: 'pdf-service',
    brokers: [process.env.KAFKA_BROKER || 'kafka:29092'],
    retry: {
        initialRetryTime: 100,
        retries: 8
    }
});

let producer: Producer;
let producerConnected = false;

export function buildPdfCompleteEvent(submissionId: number, pdfId: number, pdfPath: string, certificateType: string, correlationId?: string) {
    return {
        eventId: crypto.randomUUID(),
        correlationId,
        submissionId,
        pdfId,
        pdfPath,
        certificateType,
        timestamp: new Date().toISOString()
    };
}

export function buildAdminLogEvent(action: string, details: any, correlationId?: string) {
    return {
        eventId: crypto.randomUUID(),
        correlationId,
        service: 'pdf-service',
        action,
        details,
        timestamp: new Date().toISOString()
    };
}

export async function initProducer() {
    producer = kafka.producer();
    await producer.connect();
    producerConnected = true;
    console.log('Kafka producer connected');
    return producer;
}

export async function publishPdfComplete(submissionId: number, pdfId: number, pdfPath: string, certificateType: string) {
    await publishEvent('pdf-generation-complete', buildPdfCompleteEvent(submissionId, pdfId, pdfPath, certificateType));
    console.log(`Published pdf-generation-complete for submission ${submissionId}`);
}

export async function publishAdminLog(action: string, details: any) {
    await publishEvent('admin-logs', buildAdminLogEvent(action, details));
    console.log(`Published admin log: ${action}`);
}

export async function publishEvent(topic: string, payload: any) {
    if (!producer) {
        throw new Error('Producer not initialized');
    }

    await producer.send({
        topic,
        messages: [
            {
                value: JSON.stringify(payload)
            }
        ]
    });
}

export async function disconnectProducer() {
    if (producer) {
        await producer.disconnect();
        producerConnected = false;
        console.log('Kafka producer disconnected');
    }
}

export function isProducerConnected(): boolean {
    return producerConnected;
}
