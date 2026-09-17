# AfricaTravel — Deployment & Operations Guide

## 1. Overview

AfricaTravel is engineered for dual deployment flexibility:
1. **Containerized Linux / VPS Runtime**: Docker & Docker Compose running the standalone Express server (`server.js`).
2. **Serverless Edge Runtime**: Vercel deployment with edge CDN caching for static frontend assets and serverless execution for the API (`api/index.js`).

---

## 2. Environment Variables

Create `.env` based on `.env.example`:

| Variable | Required | Description | Example |
|---|---|---|---|
| `NODE_ENV` | Yes | Application environment | `production` / `development` |
| `PORT` | No | HTTP listening port (defaults to 3000) | `3000` |
| `DATABASE_URL` | Yes | PostgreSQL connection string (pooled) | `postgresql://user:pass@host:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20` |
| `DIRECT_URL` | Yes | Direct PostgreSQL connection string | `postgresql://user:pass@host:5432/postgres` |
| `JWT_SECRET` | Yes | Secret key for signing access tokens (min 32 chars) | `<secure_random_string>` |
| `JWT_REFRESH_SECRET` | Yes | Secret key for signing refresh tokens (min 32 chars) | `<secure_random_string>` |
| `CORS_ORIGIN` | No | Whitelisted CORS origins (comma-separated) | `https://africatravel.example.com` |
| `SUPABASE_URL` | Yes | Supabase project API URL | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase secret service role key | `eyJ...` |
| `SUPABASE_STORAGE_BUCKET` | No | Target document storage bucket | `customer-documents` |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis REST URL for rate limiting | `https://<endpoint>.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN`| No | Upstash Redis REST Token | `<token>` |

---

## 3. Deployment Methods

### 3.1 Docker Container Deployment (Recommended for VPS / Cloud Run)

The repository provides a production-grade `Dockerfile` using Node 24 Alpine:

```bash
# 1. Build the production Docker image
docker build -t africatravel:latest .

# 2. Run the container with environment configuration
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name africatravel \
  --restart unless-stopped \
  africatravel:latest
```

#### Docker Compose (App + Local Database)
For self-contained local or private server deployments:
```bash
# Spin up both PostgreSQL and the application server
docker compose up -d

# Verify container health
docker compose ps
```

### 3.2 Vercel Deployment (Serverless)

The project includes pre-configured `vercel.json`:
- Static assets (`frontend/assets`, `frontend/js`, `frontend/styles`, `frontend/manifest.json`, `frontend/sw.js`) are served directly by Vercel's global CDN.
- Dynamic requests (`/api/*`) are directed to `api/index.js` which mounts the Express application.
- All non-API routes fallback to `frontend/index.html` for single-page routing.

#### Deploying via Vercel CLI:
```bash
# 1. Install Vercel CLI if needed
npm install -g vercel

# 2. Deploy preview
vercel

# 3. Deploy to production
vercel --prod
```

Configure environment variables in the Vercel Dashboard under **Project Settings > Environment Variables**.

#### Supabase Connection Pooling & PgBouncer Configuration on Vercel:
When deploying on Vercel (Serverless Edge/Node Runtime), every function invocation runs in an isolated container with an independent Prisma Client instance. With standard connection defaults, concurrent serverless invocations can rapidly exhaust the database connection pool, leading to connection pool timeouts (`P2024`) and `"can't reach database server"` errors.

To avoid this, you must configure `DATABASE_URL` on Vercel to connect through Supabase's **PgBouncer connection pooler (port 6543, Transaction mode)** with these exact parameters:
```bash
DATABASE_URL="postgresql://user:pass@host:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20"
```
- **`connection_limit=1` is strictly required on Vercel** (not the default of 5 or higher) so that each serverless function instance allocates exactly 1 connection slot, allowing PgBouncer to efficiently multiplex connections across concurrent function instances without starving the pool.
- **`pool_timeout=20`** provides a resilient 20-second timeout window before failing, allowing transient traffic spikes to settle.
- **`pgbouncer=true`** ensures Prisma disables prepared statements which are incompatible with transaction-mode pooling.

---

## 4. Continuous Integration (GitHub Actions)

Workflow definition: `.github/workflows/ci.yml`

The CI pipeline triggers on all pushes and pull requests to `main`:
1. Spins up a dedicated **PostgreSQL 16** service container.
2. Installs clean dependencies via `npm ci`.
3. Validates code style via `npm run lint`.
4. Generates Prisma Client (`npm run prisma:generate`).
5. Audits schema drift against database migrations (`npm run prisma:check-drift`).
6. Executes automated integration, security, and unit test suites against the test database.

---

## 5. Deployment Verification Script

Verify environment, database readiness, and critical asset integrity before and after deployment:
```bash
node scripts/deployment/verify-deployment.js
```
The script performs the following pre-flight checks:
- Verifies all required environment variables are present and meet minimum length constraints.
- Tests database connectivity and executes a query via Prisma.
- Validates the generated Prisma Client version.
- Confirms critical frontend entry files (`frontend/index.html`, `frontend/js/bootstrap.js`, `frontend/manifest.json`, `frontend/sw.js`) are accessible.
