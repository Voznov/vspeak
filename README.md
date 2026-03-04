# VSpeak

Self-hosted voice & text communication platform with WebRTC

## Development

```bash
# Install dependencies
pnpm install

# Development (all services)
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

Start the local PostgreSQL instance (requires Docker):

```bash
docker compose -f local/docker-compose.yml up -d
```

## Deployment

### Prerequisites

- Docker & Docker Compose
- SSL certificates for your domain (required for WebRTC)

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
