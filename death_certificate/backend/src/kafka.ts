import { Kafka, Producer, Consumer } from 'kafkajs';

const kafka = new Kafka({
    clientId: 'death-certificate-service',
    brokers: [process.env.KAFKA_BROKER || 'kafka:29092'],
    retry: {
        initialRetryTime: 100,
        retries: 8
    }
});

let producer: Producer;
let consumer: Consumer;

export async function initProducer() {
    producer = kafka.producer();
    await producer.connect();
    console.log('Kafka producer connected');
    return producer;
}

export async function publishCertificateRequest(submissionId: number, formData: any) {
    if (!producer) {
        throw new Error('Producer not initialized');
    }

    await producer.send({
        topic: 'certificate-requests',
        messages: [
            {
                value: JSON.stringify({
                    service: 'death',
                    submissionId,
                    formData,
                    timestamp: new Date().toISOString()
                })
            }
        ]
    });
}

export async function publishPdfGenerationRequest(submissionId: number, formData: any) {
    if (!producer) {
        throw new Error('Producer not initialized');
    }

    await producer.send({
        topic: 'pdf-generation-requests',
        messages: [
            {
                value: JSON.stringify({
                    type: 'death',
                    submissionId,
                    formData,
                    timestamp: new Date().toISOString()
                })
            }
        ]
    });
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
                    service: 'death-certificate',
                    action,
                    details,
                    timestamp: new Date().toISOString()
                })
            }
        ]
    });
}

export async function initConsumer(onPdfComplete: (submissionId: number, pdfId: number, pdfPath: string) => void) {
    consumer = kafka.consumer({ groupId: 'death-certificate-service-group' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'pdf-generation-complete', fromBeginning: false });

    console.log('Kafka consumer connected and subscribed to pdf-generation-complete');

    await consumer.run({
        eachMessage: async ({ message }) => {
            try {
                const data = JSON.parse(message.value?.toString() || '{}');
                const { submissionId, pdfId, pdfPath, certificateType } = data;

                // Only process death certificate completions
                if (certificateType === 'death') {
                    console.log(`Received PDF completion for submission ${submissionId}`);
                    onPdfComplete(submissionId, pdfId, pdfPath);
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
        console.log('Kafka producer disconnected');
    }
    if (consumer) {
        await consumer.disconnect();
        console.log('Kafka consumer disconnected');
    }
}
