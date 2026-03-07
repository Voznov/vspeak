# VSpeak

Self-hosted voice & text communication platform with WebRTC

## Development

Requires Docker for local infrastructure (PostgreSQL + MinIO).

```bash
# Install dependencies
pnpm install

# Start local infrastructure (PostgreSQL + MinIO)
pnpm infra:up

# Development (all services in parallel)
pnpm dev

# Development (separate terminals)
pnpm dev:server   # Backend on :3000
pnpm dev:client   # Frontend on :5173

# Build
pnpm build

# Lint
pnpm lint
pnpm lint:fix
```

Configure local environment in `server/.env.local` (see `server/.env.example` if available). MinIO is available at `http://localhost:9000`, console at `http://localhost:9001`.

## Deployment

### Prerequisites

- Docker & Docker Compose
- SSL certificates for your domain (required for HTTPS, which browsers enforce for microphone/camera access)

### Setup

1. Create `.env.prod` from the example and fill in all empty values:

   ```bash
   cp .env.prod.example .env.prod
   ```

2. Start:

   ```bash
   docker compose --env-file .env.prod up -d
   ```

### Updates

```bash
git pull && docker compose --env-file .env.prod pull && docker compose --env-file .env.prod up -d
```
