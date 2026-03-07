import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { WebSocketServer, WebSocket } from 'ws';
import db from './database';

const kafka = new Kafka({
  clientId: 'admin-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:29092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

let consumer: Consumer;
let wss: WebSocketServer;

export function initWebSocketServer(server: any): WebSocketServer {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Admin client connected to WebSocket');

    ws.on('close', () => {
      console.log('Admin client disconnected');
    });
  });

  return wss;
}

export function broadcastToClients(data: any): void {
  if (!wss) return;

  const message = JSON.stringify(data);
  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export async function initKafkaConsumer(): Promise<Consumer> {
  consumer = kafka.consumer({ groupId: 'admin-service-group' });
  await consumer.connect();

  // Subscribe to all relevant topics
  await consumer.subscribe({ topic: 'certificate-requests', fromBeginning: false });
  await consumer.subscribe({ topic: 'pdf-generation-requests', fromBeginning: false });
  await consumer.subscribe({ topic: 'pdf-generation-complete', fromBeginning: false });
  await consumer.subscribe({ topic: 'admin-logs', fromBeginning: false });

  console.log('Kafka consumer connected and subscribed to topics');

  await consumer.run({
    eachMessage: async (payload: EachMessagePayload) => {
      const { topic, message } = payload;
      try {
        const value = message.value?.toString();
        if (!value) return;

        const data = JSON.parse(value);

        const eventData = {
          topic,
          ...data,
          receivedAt: new Date().toISOString()
        };

        console.log(`Received event on ${topic}:`, data.action || data.type || 'Event');

        // Persist to DB based on topic
        if (topic === 'pdf-generation-complete') {
          try {
            const stmt = db.prepare(`
              INSERT INTO pdfs (submissionId, fileName, filePath, certificateType, created_at)
              VALUES (?, ?, ?, ?, ?)
            `);
            stmt.run(
              data.submissionId,
              data.fileName || `certificate_${data.submissionId}.pdf`,
              data.pdfPath,
              data.certificateType,
              data.timestamp
            );
          } catch (err: any) {
            console.error('Error saving PDF record:', err);
          }
        } else if (topic === 'admin-logs') {
          try {
            const stmt = db.prepare('INSERT INTO logs (action, details) VALUES (?, ?)');
            stmt.run(data.action, JSON.stringify(data.details));
          } catch (err: any) {
            console.error('Error saving log:', err);
          }
        }

        broadcastToClients(eventData);
      } catch (error: any) {
        console.error('Error processing Kafka message:', error);
      }
    }
  });

  return consumer;
}

export async function disconnect(): Promise<void> {
  if (consumer) {
    await consumer.disconnect();
  }
}
