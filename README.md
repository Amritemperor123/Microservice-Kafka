# 🏛️ Government Certificate Services — Microservice Architecture

A distributed, event-driven microservice system for generating and managing government birth and death certificates. Built with **Node.js**, **Kafka**, **SQLite**, and **Docker**, connected through an **Nginx API Gateway**.

---

## 📐 Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                      Nginx API Gateway (:80)                      │
│                                                                   │
│  /birth-certificate  → Birth Frontend                             │
│  /death-certificate  → Death Frontend                             │
│  /admin              → Admin Frontend                             │
│  /api/birth/*        → Birth Backend   (:3001)                    │
│  /api/death/*        → Death Backend   (:3002)                    │
│  /api/pdf/*          → PDF Service     (:3003)                    │
│  /api/admin/*        → Admin Backend   (:3004)                    │
│  /ws/admin           → Admin WebSocket (:3004)                    │
└────────────────────────────┬──────────────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            │   Apache Kafka + Zookeeper       │
            │                                  │
            │   Topics:                        │
            │   • certificate-requests         │
            │   • pdf-generation-requests      │
            │   • pdf-generation-complete      │
            │   • admin-logs                   │
            └────────────────┬────────────────┘
                             │
    ┌────────────┬───────────┼───────────┬──────────────┐
    │            │           │           │              │
┌───┴───┐  ┌────┴────┐  ┌───┴───┐  ┌────┴────┐  ┌─────┴──────┐
│ Birth │  │  Death  │  │  PDF  │  │  Admin  │  │  Dashboard │
│Backend│  │ Backend │  │Service│  │ Backend │  │  (static)  │
│ :3001 │  │  :3002  │  │ :3003 │  │  :3004  │  │            │
│ SQLite│  │  SQLite │  │ SQLite│  │SQLite+WS│  │            │
└───────┘  └─────────┘  └───────┘  └─────────┘  └────────────┘
```

### Event Flow

```
User submits form ──→ Birth/Death Backend
                           │
                           ├──→ Kafka: certificate-requests
                           ├──→ Kafka: pdf-generation-requests ──→ PDF Service
                           └──→ Kafka: admin-logs ──→ Admin Backend ──→ WebSocket ──→ Dashboard
                                                          │
                     PDF Service generates PDF             │
                           │                               │
                           ├──→ Kafka: pdf-generation-complete
                           │         │
                           │         ├──→ Birth/Death Backend (updates status)
                           │         └──→ Admin Backend (stores read model)
                           │
                           └──→ Kafka: admin-logs ──→ Admin Backend
```

---

## 📁 Project Structure

```
microservice-kafka/
├── docker-compose.yml              # Full-stack orchestration
├── gateway/
│   └── nginx.conf                  # API Gateway routing config
├── dashboard/
│   └── index.html                  # Landing page (static)
│
├── birth_certificate/
│   ├── backend/                    # Birth certificate API (Express + Kafka)
│   │   ├── src/
│   │   │   ├── index.ts            # Express server + Kafka init
│   │   │   ├── database.ts         # SQLite schema (submissions)
│   │   │   └── kafka.ts            # Producer/Consumer for Kafka
│   │   ├── Dockerfile
│   │   └── .env
│   └── frontend/                   # React + Vite + shadcn/ui
│       ├── Dockerfile
│       └── .env
│
├── death_certificate/
│   ├── backend/                    # Death certificate API (same pattern)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── database.ts
│   │   │   └── kafka.ts
│   │   ├── Dockerfile
│   │   └── .env
│   └── frontend/                   # React + Vite + shadcn/ui
│       ├── Dockerfile
│       └── .env
│
├── pdf_service/
│   └── backend/                    # Dedicated PDF generation service
│       ├── src/
│       │   ├── index.ts            # Express server + health check
│       │   ├── database.ts         # SQLite schema (pdf metadata)
│       │   ├── kafka-consumer.ts   # Listens for generation requests
│       │   ├── kafka-producer.ts   # Publishes completion events
│       │   └── pdfGenerator.ts     # PDFKit birth/death generators
│       ├── Dockerfile
│       └── .env
│
├── admin/
│   ├── docker-compose.yml          # Independent admin testing
│   ├── backend/                    # Admin API + WebSocket + Kafka consumer
│   │   ├── src/
│   │   │   ├── index.ts            # Express + WebSocket server
│   │   │   ├── database.ts         # SQLite (users, pdfs read model, logs)
│   │   │   └── kafka-websocket.ts  # Kafka consumer + WS broadcast
│   │   ├── Dockerfile
│   │   └── .env
│   └── frontend/                   # React dashboard (shadcn/ui)
│       ├── Dockerfile
│       └── .env
│
└── database/                       # Legacy shared database (deprecated)
```

---

## 🛠️ Tech Stack

| Layer          | Technology                                |
|----------------|-------------------------------------------|
| **Languages**  | TypeScript, HTML                          |
| **Backend**    | Express 5, Node.js 20                     |
| **Frontend**   | React 18, Vite, shadcn/ui, TailwindCSS   |
| **Messaging**  | Apache Kafka (Confluent Platform)         |
| **Database**   | SQLite (better-sqlite3) — per-service     |
| **PDF**        | PDFKit                                    |
| **Gateway**    | Nginx (reverse proxy + static serving)    |
| **Realtime**   | WebSocket (ws library)                    |
| **Containers** | Docker, Docker Compose                    |

---

## 🚀 Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24+)
- [Node.js](https://nodejs.org/) v20+ (for local development only)

### Run the Full Stack

```bash
# Clone and navigate to the project
cd microservice-kafka

# Build and start all services
docker compose up --build

# The system will be available at:
#   Dashboard:          http://localhost
#   Birth Certificate:  http://localhost/birth-certificate
#   Death Certificate:  http://localhost/death-certificate
#   Admin Panel:        http://localhost/admin
```

### Run Admin Service Independently

The admin service includes its own `docker-compose.yml` with embedded Kafka:

```bash
cd admin
docker compose up --build

# Frontend:  http://localhost:8080
# Backend:   http://localhost:3004
# Health:    http://localhost:3004/health
```

### Local Development (without Docker)

Each backend can be developed locally:

```bash
# Terminal 1 — Start Kafka (requires Docker)
docker compose up zookeeper kafka

# Terminal 2 — Run a backend service
cd birth_certificate/backend
npm install
npm run dev     # or: npx ts-node src/index.ts

# Terminal 3 — Run a frontend
cd birth_certificate/frontend
npm install
npm run dev
```

---

## 🌐 API Reference

### Birth Certificate Service (`:3001`)

| Method | Endpoint            | Description                       |
|--------|---------------------|-----------------------------------|
| GET    | `/health`           | Service health check              |
| POST   | `/submit-form`      | Submit a birth certificate form   |
| GET    | `/submission/:id`   | Get submission status and data    |

### Death Certificate Service (`:3002`)

| Method | Endpoint            | Description                       |
|--------|---------------------|-----------------------------------|
| GET    | `/health`           | Service health check              |
| POST   | `/submit-form`      | Submit a death certificate form   |
| GET    | `/submission/:id`   | Get submission status and data    |

### PDF Service (`:3003`)

| Method | Endpoint            | Description                       |
|--------|---------------------|-----------------------------------|
| GET    | `/health`           | Service health check              |
| GET    | `/pdfs`             | List all generated PDFs           |
| GET    | `/pdf/:id`          | Get specific PDF metadata         |

### Admin Service (`:3004`)

| Method | Endpoint            | Description                       |
|--------|---------------------|-----------------------------------|
| GET    | `/health`           | Service health check              |
| POST   | `/login`            | Admin authentication              |
| GET    | `/stats`            | System statistics                 |
| GET    | `/pdfs`             | List PDFs (read model)            |
| GET    | `/pdf/:id`          | Download a specific PDF           |
| WS     | `/` (WebSocket)     | Real-time event stream            |

---

## 📨 Kafka Topics

| Topic                      | Producer(s)             | Consumer(s)                  | Payload                          |
|----------------------------|-------------------------|------------------------------|----------------------------------|
| `certificate-requests`     | Birth, Death backends   | Admin backend                | `{ service, submissionId, formData }` |
| `pdf-generation-requests`  | Birth, Death backends   | PDF Service                  | `{ type, submissionId, formData }`    |
| `pdf-generation-complete`  | PDF Service             | Birth, Death, Admin backends | `{ submissionId, pdfId, pdfPath }`    |
| `admin-logs`               | All backends            | Admin backend                | `{ service, action, details }`        |

---

## 💾 Databases

Each service manages its own SQLite database (no shared databases):

| Service             | Database Path                   | Tables                          |
|---------------------|---------------------------------|---------------------------------|
| Birth Certificate   | `birth_certificate/backend/data/submissions.db` | `submissions`       |
| Death Certificate   | `death_certificate/backend/data/submissions.db` | `submissions`       |
| PDF Service         | `pdf_service/backend/data/pdfs.db`               | `pdfs`              |
| Admin               | `admin/backend/data/admin.db`                    | `users, pdfs, logs` |

---

## 🔧 Environment Variables

### Backend Services

| Variable              | Default             | Description                           |
|-----------------------|---------------------|---------------------------------------|
| `PORT`                | Service-specific    | HTTP server port                      |
| `NODE_ENV`            | `development`       | Node environment                      |
| `KAFKA_BROKER`        | `kafka:29092`       | Kafka broker address                  |
| `DATABASE_PATH`       | `./data/*.db`       | Path to SQLite database file          |
| `SHARED_STORAGE_PATH` | `/app/certificates` | Shared volume for generated PDFs      |
| `CERTIFICATES_PATH`   | `/app/certificates` | PDF output directory (PDF service)    |

### Frontend Services

| Variable        | Default         | Description                           |
|-----------------|-----------------|---------------------------------------|
| `VITE_API_URL`  | `/api/<service>`| Backend API base URL                  |
| `VITE_WS_URL`   | `/ws/admin`     | WebSocket URL (admin only)            |

---

## 🐳 Docker Services

| Service            | Image / Build              | Port(s) | Depends On |
|--------------------|----------------------------|---------|------------|
| `zookeeper`        | `confluentinc/cp-zookeeper`| 2181    | —          |
| `kafka`            | `confluentinc/cp-kafka`    | 9092    | zookeeper  |
| `birth-backend`    | `./birth_certificate/backend` | 3001 | kafka      |
| `birth-frontend`   | `./birth_certificate/frontend`| —    | birth-backend |
| `death-backend`    | `./death_certificate/backend` | 3002 | kafka      |
| `death-frontend`   | `./death_certificate/frontend`| —    | death-backend |
| `pdf-service`      | `./pdf_service/backend`    | 3003    | kafka      |
| `admin-backend`    | `./admin/backend`          | 3004    | kafka      |
| `admin-frontend`   | `./admin/frontend`         | —       | admin-backend |
| `gateway`          | `nginx:alpine`             | **80**  | all services |

---

## 🔑 Default Credentials

| Service      | Username | Password   |
|--------------|----------|------------|
| Admin Panel  | `admin`  | `admin123` |

> ⚠️ Change these credentials before deploying to production.

---

## 📋 Common Commands

```bash
# Build and start everything
docker compose up --build

# Start in background
docker compose up -d --build

# View logs for a specific service
docker compose logs -f birth-backend

# Rebuild a single service
docker compose build admin-backend

# Stop all services
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v

# Check service health
curl http://localhost/health              # Gateway
curl http://localhost:3001/health         # Birth
curl http://localhost:3002/health         # Death
curl http://localhost:3003/health         # PDF
curl http://localhost:3004/health         # Admin
```

---

## 📜 License

This project is for educational and government use.
