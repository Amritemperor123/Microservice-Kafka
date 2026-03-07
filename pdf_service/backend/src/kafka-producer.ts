import { Kafka, Producer } from 'kafkajs';

const kafka = new Kafka({
    clientId: 'pdf-service',
    brokers: [process.env.KAFKA_BROKER || 'kafka:29092'],
    retry: {
        initialRetryTime: 100,
        retries: 8
    }
});

let producer: Producer;

export async function initProducer() {
    producer = kafka.producer();
    await producer.connect();
    console.log('Kafka producer connected');
    return producer;
}

export async function publishPdfComplete(submissionId: number, pdfId: number, pdfPath: string, certificateType: string) {
    if (!producer) {
        throw new Error('Producer not initialized');
    }

    await producer.send({
        topic: 'pdf-generation-complete',
        messages: [
            {
                value: JSON.stringify({
                    submissionId,
                    pdfId,
                    pdfPath,
                    certificateType,
                    timestamp: new Date().toISOString()
                })
            }
        ]
    });

    console.log(`Published pdf-generation-complete for submission ${submissionId}`);
}

export async function publishAdminLog(action: string, details: any) {
    if (!producer) {
        throw new Error('Producer not initialized');
    }

    await producer.send({
        topic: 'admin-logs',
        messages: [
            {
                value: JSON.stringify({
                    service: 'pdf-service',
                    action,
                    details,
                    timestamp: new Date().toISOString()
                })
            }
        ]
    });

    console.log(`Published admin log: ${action}`);
}

export async function disconnectProducer() {
    if (producer) {
        await producer.disconnect();
        console.log('Kafka producer disconnected');
    }
}
