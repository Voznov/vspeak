# Stage 1: Install dependencies
FROM node:20 AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace configuration and lock file
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy workspace package.json files (server only)
COPY server/package.json ./server/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Build backend
FROM node:20-alpine AS build-backend

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy source files
COPY server ./server
COPY libs ./libs

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml ./

# Build backend
RUN pnpm --filter server build

# Stage 3: Production runtime
FROM node:20

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY server/package.json ./server/

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules

# Copy built artifacts
COPY --from=build-backend /app/server/dist ./server/dist

# Set working directory to server
WORKDIR /app/server

# Expose ports
EXPOSE 3000
EXPOSE 40000-49999/udp

# Start the application
CMD ["node", "dist/server/src/main.js"]
