# KIN Platform Dockerfile
# Multi-stage build for optimized production image

# =============================================================================
# Build Stage
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# =============================================================================
# Production Stage
# =============================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S kin && \
    adduser -S kin -u 1001 -G kin

# Copy built files and dependencies
COPY --from=builder --chown=kin:kin /app/dist ./dist
COPY --from=builder --chown=kin:kin /app/node_modules ./node_modules
COPY --from=builder --chown=kin:kin /app/package.json ./
COPY --from=builder --chown=kin:kin /app/db ./db
COPY --from=builder --chown=kin:kin /app/companions ./companions

# Create data directory for SQLite
RUN mkdir -p /app/data && chown kin:kin /app/data

# Switch to non-root user
USER kin

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/kin.db

# Start with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/api/server.js"]

# =============================================================================
# Development Stage
# =============================================================================
FROM node:20-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy source code
COPY . .

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Environment defaults
ENV NODE_ENV=development
ENV PORT=3000

# Start in development mode with hot reload
CMD ["npm", "run", "dev"]
