# AfricaTravel — Enterprise Agency Operations Platform

AfricaTravel is a production-ready travel agency management platform built with Express 5, Prisma ORM, Supabase PostgreSQL, and Vanilla JS SPA.

---

## 🔒 Security & Architecture Overview

### 1. Authentication & Token Architecture (XSS & CSRF Resilient)
- **Access Token:** Short-lived JWT (15 minutes), stored strictly **in-memory** in the frontend client (`js/services/api-client.js`). Tokens are never stored in `localStorage` or `sessionStorage`, mitigating token theft via Cross-Site Scripting (XSS).
- **Refresh Token:** High-entropy token (80 hex chars), set by the backend as an **`httpOnly`**, `secure` (in production), `sameSite: 'lax'`, `path: '/api/auth'` cookie with a 7-day TTL.
- **Refresh Token Rotation (RTR):** Every token refresh automatically revokes the old refresh token and issues a brand-new token pair inside a database transaction (`$transaction`). Replay of revoked refresh tokens is immediately rejected.
- **Frontend Fetch:** Uses `credentials: 'include'` on all API calls to automatically exchange cookies for token lifecycle management.

### 2. Strict CORS Whitelist
- Managed in `server/src/middleware/security.js`.
- Whitelist configured strictly through `CORS_ORIGIN` environment variable.
- Localhost development origins are restricted to `NODE_ENV !== 'production'`.
- Production enforces exact origin matching (no wildcard `.vercel.app` domains).

### 3. Safe Environment & Health Diagnostics
- `/api/health` returns only `{ success, data: { status, database, timestamp } }` in production.
- Internal connection error strings, hostnames, and environment variable names are strictly hidden from unauthenticated callers in production mode.
- Production startup guard prevents execution if `JWT_SECRET`, `JWT_REFRESH_SECRET`, or `DEFAULT_ADMIN_PASSWORD` use default/insecure development values.

### 4. Database Performance Indexes
- Added foreign key performance indexes in `prisma/schema.prisma` and `prisma/supabase_setup.sql`:
  - `audit_logs(userId)`
  - `modifications(processedById)`
  - `payments(addedById)`
  - `tickets(createdById)`

---

## 🛠️ Environment Variables Reference

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `development` / `production` |
| `PORT` | HTTP port | `3000` |
| `DATABASE_URL` | PostgreSQL connection pooler URL | `postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true` |
| `JWT_SECRET` | Secret key for signing access JWTs | Generated with `openssl rand -hex 64` |
| `JWT_EXPIRES_IN` | Access token lifespan | `15m` |
| `JWT_REFRESH_SECRET`| Secret key for refresh token management | Generated with `openssl rand -hex 64` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifespan | `7d` |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `https://africiatravel.vercel.app` |
| `DEFAULT_ADMIN_PASSWORD` | Initial admin seed password | Strong password (required in production) |

---

## 🧪 Testing

Run the full automated test suite (141+ tests across 7 suites):

```bash
npm test
```

Specific test runners:
```bash
npm run test:security   # Security fixes, RTR, cookie headers, CORS, env guards
npm run test:auth       # Bcrypt, JWT verification, RBAC middleware
npm run test:tickets    # Ticket-customer find-or-create association
npm run test:rbac       # UI role-based filtering (Agent vs Admin)
npm run test:domain     # Domain business rules and validation errors
npm run test:api        # API endpoints and static security headers
npm run test:frontend   # Bilingual i18n and frontend business flows
```

---

## 🚀 Running Locally

```bash
# 1. Install dependencies and generate Prisma Client
npm install

# 2. Setup environment variables
cp .env.example .env

# 3. Seed database (development mode)
npm run prisma:seed

# 4. Start local development server
npm start
```
