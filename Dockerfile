# AfricaTravel - Multi-stage Production Dockerfile
# Base Runtime targeting Node.js 26
FROM node:26-alpine AS base

WORKDIR /app

# Install dependencies needed for build
RUN apk add --no-cache libc6-compat openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for prisma build)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Stage 2: Production image
FROM node:26-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install runtime dependencies for openssl / postgres client
RUN apk add --no-cache openssl

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 africatravel

# Copy built application & node_modules
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/prisma ./prisma
COPY package*.json ./
COPY server.js ./
COPY server ./server/
COPY js ./js/
COPY styles ./styles/
COPY assets ./assets/
COPY index.html ./

USER africatravel

EXPOSE 3000

CMD ["node", "server.js"]
