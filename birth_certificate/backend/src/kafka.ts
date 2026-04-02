import { Kafka, Producer, Consumer } from 'kafkajs';
import crypto from 'crypto';

const kafka = new Kafka({
    clientId: 'birth-certificate-service',
    brokers: [process.env.KAFKA_BROKER || 'kafka:29092'],
    retry: {
        initialRetryTime: 100,
        retries: 8
    }
});

let producer: Producer;
let consumer: Consumer;
let producerConnected = false;
let consumerConnected = false;

export function buildCertificateRequestEvent(submissionId: number, formData: any, correlationId?: string) {
    return {
        eventId: crypto.randomUUID(),
        correlationId,
        service: 'birth',
        submissionId,
        formData,
        timestamp: new Date().toISOString()
    };
}

export function buildPdfGenerationRequestEvent(submissionId: number, formData: any, correlationId?: string) {
    return {
        eventId: crypto.randomUUID(),
        correlationId,
        type: 'birth',
        submissionId,
        formData,
        timestamp: new Date().toISOString()
    };
}

export function buildAdminLogEvent(action: string, details: any, correlationId?: string) {
    return {
        eventId: crypto.randomUUID(),
        correlationId,
        service: 'birth-certificate',
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

export async function publishCertificateRequest(submissionId: number, formData: any) {
    await publishEvent('certificate-requests', buildCertificateRequestEvent(submissionId, formData));
}

export async function publishPdfGenerationRequest(submissionId: number, formData: any) {
    await publishEvent('pdf-generation-requests', buildPdfGenerationRequestEvent(submissionId, formData));
}

export async function publishAdminLog(action: string, details: any) {
    await publishEvent('admin-logs', buildAdminLogEvent(action, details));
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

export async function initConsumer(onPdfComplete: (submissionId: number, pdfId: number, pdfPath: string, eventId?: string) => void) {
    consumer = kafka.consumer({ groupId: 'birth-certificate-service-group' });
    await consumer.connect();
    consumerConnected = true;
    await consumer.subscribe({ topic: 'pdf-generation-complete', fromBeginning: false });

    console.log('Kafka consumer connected and subscribed to pdf-generation-complete');

    await consumer.run({
        eachMessage: async ({ message }) => {
            try {
                const data = JSON.parse(message.value?.toString() || '{}');
                const { submissionId, pdfId, pdfPath, certificateType, eventId } = data;

                // Only process birth certificate completions
                if (certificateType === 'birth') {
                    console.log(`Received PDF completion for submission ${submissionId}`);
                    onPdfComplete(submissionId, pdfId, pdfPath, eventId);
                }
            } catch (error) {
                console.error('Error processing PDF completion message:', error);
            }
        }
    });

    return consumer;
}

export async function disconnectKafka() {
    if (producer) {
        await producer.disconnect();
        producerConnected = false;
        console.log('Kafka producer disconnected');
    }
    if (consumer) {
        await consumer.disconnect();
        consumerConnected = false;
        console.log('Kafka consumer disconnected');
    }
}

export function getKafkaStatus() {
    return {
        producerConnected,
        consumerConnected
    };
}
