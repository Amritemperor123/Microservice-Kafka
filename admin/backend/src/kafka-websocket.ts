import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { WebSocketServer, WebSocket } from 'ws';
import db from './database';
import { getWebSocketToken, verifyAdminToken } from './auth';
import crypto from 'crypto';

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
let consumerConnected = false;

export function initWebSocketServer(server: any): WebSocketServer {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket, request: any) => {
    const token = getWebSocketToken(request.url);
    const auth = verifyAdminToken(token);

    if (!auth.valid) {
      ws.close(1008, 'Unauthorized');
      return;
    }

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
  consumerConnected = true;

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
        const eventId = data.eventId || crypto.createHash('sha1').update(`${topic}:${value}`).digest('hex');
        const processedEvent = db.prepare('SELECT event_id FROM processed_events WHERE event_id = ?').get(eventId);
        if (processedEvent) {
          return;
        }

        const eventData = {
          topic,
          eventId,
          correlationId: data.correlationId,
          receivedAt: new Date().toISOString()
        };

        if (topic === 'certificate-requests') {
          Object.assign(eventData, {
            service: data.service,
            submissionId: data.submissionId,
            timestamp: data.timestamp
          });
        } else if (topic === 'pdf-generation-requests') {
          Object.assign(eventData, {
            type: data.type,
            submissionId: data.submissionId,
            timestamp: data.timestamp
          });
        } else if (topic === 'pdf-generation-complete') {
          Object.assign(eventData, {
            submissionId: data.submissionId,
            pdfId: data.pdfId,
            pdfPath: data.pdfPath,
            certificateType: data.certificateType,
            timestamp: data.timestamp
          });
        } else if (topic === 'admin-logs') {
          Object.assign(eventData, {
            service: data.service,
            action: data.action,
            timestamp: data.timestamp
          });
        }

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
            db.prepare('INSERT INTO processed_events (event_id, topic) VALUES (?, ?)').run(eventId, topic);
          } catch (err: any) {
            console.error('Error saving PDF record:', err);
          }
        } else if (topic === 'admin-logs') {
          try {
            const stmt = db.prepare('INSERT INTO logs (action, details) VALUES (?, ?)');
            stmt.run(data.action, JSON.stringify(data.details));
            db.prepare('INSERT INTO processed_events (event_id, topic) VALUES (?, ?)').run(eventId, topic);
          } catch (err: any) {
            console.error('Error saving log:', err);
          }
        } else {
          db.prepare('INSERT INTO processed_events (event_id, topic) VALUES (?, ?)').run(eventId, topic);
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
    consumerConnected = false;
  }
}

export function getKafkaStatus() {
  return { consumerConnected };
}
