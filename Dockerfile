# AfricaTravel - Multi-stage Production Dockerfile
# Base Runtime targeting Node.js 24
FROM node:24-alpine AS base

WORKDIR /app

# Install dependencies needed for build
RUN apk add --no-cache libc6-compat openssl

# Copy package files
COPY package*.json ./
COPY database/prisma ./database/prisma/

# Install all dependencies (including devDependencies for prisma build)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate --schema=database/prisma/schema.prisma

# Prune devDependencies to keep production image minimal
RUN npm prune --omit=dev

# Stage 2: Production image
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install runtime dependencies for openssl / postgres client
RUN apk add --no-cache openssl

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 africatravel

# Copy built application & node_modules with non-root ownership
COPY --chown=africatravel:nodejs --from=base /app/node_modules ./node_modules
COPY --chown=africatravel:nodejs --from=base /app/database/prisma ./database/prisma
COPY --chown=africatravel:nodejs package*.json ./
COPY --chown=africatravel:nodejs server.js ./
COPY --chown=africatravel:nodejs backend ./backend/
COPY --chown=africatravel:nodejs frontend ./frontend/

USER africatravel

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
