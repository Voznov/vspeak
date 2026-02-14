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

## Deployment

### Prerequisites

- Docker & Docker Compose

### Quick Start

1. **Configure**

   Edit `docker-compose.yml`:

   ```yaml
   # Required secrets
   JWT_SECRET: <generate with: openssl rand -base64 32>
   ADMIN_KEY: <generate with: openssl rand -base64 32>

   # Set your public IP or domain
   MEDIASOUP_ANNOUNCED_IP: your-domain.com  # Or 127.0.0.1 for local testing

   # WebRTC ports (default: 40000-40999, change if conflicts)
   ports:
     - "40000-40999:40000-40999/udp"
   environment:
     MEDIASOUP_MIN_PORT: 40000
     MEDIASOUP_MAX_PORT: 40999
   ```

2. **Start**

   ```bash
   docker compose up -d
   ```

   VSpeak will be available at `http://localhost` (or your server IP).

### HTTPS Setup (Required for Production WebRTC)

VSpeak includes nginx, so HTTPS setup is straightforward:

1. **Place SSL certificates** in `nginx/ssl/`:

   ```bash
   # Using Let's Encrypt
   certbot certonly --standalone -d your-domain.com
   cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
   cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
   ```

2. **Uncomment HTTPS in `nginx/nginx.conf`**:

   ```nginx
   server {
       listen 443 ssl http2;
       server_name your-domain.com; # Update it

       ssl_certificate /etc/nginx/ssl/cert.pem;
       ssl_certificate_key /etc/nginx/ssl/key.pem;

       include /etc/nginx/locations.conf;
   }
   ```

3. **Uncomment HTTPS port in `docker-compose.yml`**:

   ```yaml
   nginx:
     ports:
       - '80:80'
       - '443:443' # Uncomment this line
   ```

4. **Update announced IP** in `docker-compose.yml`:
   ```yaml
   MEDIASOUP_ANNOUNCED_IP: your-domain.com
   ```
