# Build stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy source
COPY web-client ./web-client
COPY libs ./libs

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build
RUN pnpm --filter web-client build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/web-client/dist /usr/share/nginx/html

# Copy nginx config
COPY web-client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
