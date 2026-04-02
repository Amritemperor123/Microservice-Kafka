# Government Certificate Services

Event-driven microservice demo for birth and death certificate processing. The stack uses Node.js, Kafka, SQLite, Docker Compose, and an Nginx gateway.

## What Is Implemented

- Separate birth, death, PDF, and admin services
- Gateway-based routing for all frontend and API traffic
- Asynchronous certificate processing with Kafka
- Durable producer outbox with retry for birth, death, and PDF services
- Authenticated admin API and WebSocket access
- Hashed bootstrap admin password storage
- Request validation on submission APIs
- Submission status polling until PDF generation completes
- Basic backend test scripts for auth, validation, and event metadata

## Architecture

### Services

- `birth-backend`: accepts birth submissions, stores local state, publishes Kafka events
- `death-backend`: accepts death submissions, stores local state, publishes Kafka events
- `pdf-service`: consumes generation requests, creates PDFs, publishes completion events
- `admin-backend`: consumes system events, stores admin read models, serves authenticated admin APIs and WebSocket updates
- `birth-frontend`: birth submission UI
- `death-frontend`: death submission UI
- `admin-frontend`: admin dashboard UI
- `gateway`: single public entrypoint

### Kafka Topics

- `certificate-requests`
- `pdf-generation-requests`
- `pdf-generation-complete`
- `admin-logs`

## Public URLs

After `docker compose up --build`:

- Dashboard: `http://localhost/`
- Birth certificate UI: `http://localhost/birth-certificate`
- Death certificate UI: `http://localhost/death-certificate`
- Admin UI: `http://localhost/admin`
- Gateway health: `http://localhost/health`
- Birth health: `http://localhost/api/birth/health`
- Death health: `http://localhost/api/death/health`
- PDF health: `http://localhost/api/pdf/health`
- Admin health: `http://localhost/api/admin/health`

## Admin Access

Bootstrap credentials are seeded into the admin database on first start.

- Default username: `admin`
- Default password: `admin123`

The password is stored as a hash in the database. You can override bootstrap credentials with:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_TOKEN_SECRET`

## Running The Stack

### Prerequisites

- Docker Desktop
- Node.js 20+ for local backend/frontend work

### Full Stack

```bash
docker compose up --build
```

### Background Mode

```bash
docker compose up -d --build
```

### Shutdown

```bash
docker compose down
```

### Reset Volumes

```bash
docker compose down -v
```

## Local Development

### Kafka Only

```bash
docker compose up zookeeper kafka kafka-init
```

### Backends

Use the backend package in the service directory:

```bash
cd birth_certificate/backend
npm install
npm run build
node dist/index.js
```

Equivalent service directories exist for:

- `death_certificate/backend`
- `pdf_service/backend`
- `admin/backend`

### Frontends

```bash
cd birth_certificate/frontend
npm install
npm run dev
```

Equivalent service directories exist for:

- `death_certificate/frontend`
- `admin/frontend`

## API Summary

### Birth API

- `POST /api/birth/submit-form`
- `GET /api/birth/submission/:id`
- `GET /api/birth/submission/:id/pdf`
- `GET /api/birth/health`

### Death API

- `POST /api/death/submit-form`
- `GET /api/death/submission/:id`
- `GET /api/death/submission/:id/pdf`
- `GET /api/death/health`

### PDF API

- `GET /api/pdf/pdfs`
- `GET /api/pdf/pdf/:id`
- `GET /api/pdf/health`

### Admin API

- `POST /api/admin/login`
- `GET /api/admin/stats`
- `GET /api/admin/pdfs`
- `GET /api/admin/pdf/:id`
- `GET /api/admin/health`
- `WS /ws/admin?token=<token>`

## Request And Processing Flow

1. A user submits a birth or death form.
2. The service validates the payload and stores the submission locally.
3. The service writes outbound events to its outbox table.
4. The outbox publisher delivers Kafka events and retries failures with backoff.
5. The PDF service consumes generation requests and creates the PDF.
6. The PDF service stores PDF metadata and emits completion/admin events through its outbox.
7. The birth/death service updates the submission to `pdf_ready`.
8. The frontend polls submission status and enables PDF download only when ready.

## Persistence

### SQLite Databases

- `birth_certificate/backend/data/submissions.db`
- `death_certificate/backend/data/submissions.db`
- `pdf_service/backend/data/pdfs.db`
- `admin/backend/data/admin.db`

### Persistent Docker Volumes

- `shared-certificates`
- `kafka-data`
- `zookeeper-data`
- `zookeeper-log`

## Tests

Backend test scripts are implemented for the most important current checks:

```bash
cd admin/backend
npm test

cd ../../birth_certificate/backend
npm test

cd ../../death_certificate/backend
npm test

cd ../../pdf_service/backend
npm test
```

These currently cover:

- admin auth token/password helpers
- birth payload validation
- death payload validation
- PDF event metadata generation

## Operational Notes

- Kafka topics are created explicitly by the `kafka-init` service.
- Kafka auto-topic creation is disabled.
- Service health endpoints now report real database/Kafka readiness instead of static booleans.
- Admin realtime traffic is authenticated and redacted.
- Aadhaar file uploads are intentionally not part of the UI anymore because the backend does not accept document uploads.

## Review Status

Current project status and resolved issues are tracked in [REVIEW_FINDINGS.md](./REVIEW_FINDINGS.md).
