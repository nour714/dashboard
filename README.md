# AfricaTravel — Enterprise Agency Operations Platform

AfricaTravel is a production-ready travel agency management platform built with Express 5, Prisma ORM, Supabase PostgreSQL, and Vanilla JS SPA.

---

## 🔒 Security & Architecture Overview

### 1. Authentication & Token Architecture (XSS & CSRF Resilient)
- **Access Token:** Short-lived JWT (15 minutes), stored strictly **in-memory** in the frontend client (`js/services/api-client.js`). Tokens are never stored in `localStorage` or `sessionStorage`, mitigating token theft via Cross-Site Scripting (XSS).
- **Refresh Token:** High-entropy token (80 hex chars), set by the backend as an **`httpOnly`**, `secure` (in production), `sameSite: 'lax'`, `path: '/api/auth'` cookie with a 7-day TTL.
- **Refresh Token Rotation (RTR):** Every token refresh automatically revokes the old refresh token and issues a brand-new token pair inside a database transaction (`$transaction`). Replay of revoked refresh tokens is immediately rejected.
- **Cookie-Only Refresh Contract:** `POST /api/auth/refresh` strictly rejects any token passed in the request body, accepting only the verified `httpOnly` cookie.
- **Dedicated Refresh Rate Limiter:** `refreshRateLimiter` enforces a strict 30 requests / 15-minute window limit specifically on token rotation to prevent brute force and session exhaustion.
- **Frontend Fetch:** Uses `credentials: 'include'` on all API calls to automatically exchange cookies for token lifecycle management.

### 2. Strict CORS & Transport Security
- Managed in `server/src/middleware/security.js`.
- Whitelist configured strictly through `CORS_ORIGIN` environment variable.
- Wildcards (`*`) are automatically filtered out in production when credentials are enabled.
- Localhost development origins are restricted to `NODE_ENV !== 'production'`.
- Supports preflight `OPTIONS` with `204 No Content` and exact domain matching.

### 3. Database Integrity & Unique Constraints
- **Customer Passport Uniqueness:** `Customer.passport` enforces a `@unique` constraint in PostgreSQL, preventing race condition duplicates.
- **Ticket PNR Uniqueness:** `Ticket.pnr` enforces a `@unique` nullable constraint. PostgreSQL allows multiple `NULL` values while guaranteeing strict uniqueness for all assigned PNR codes.
- **Preflight Integrity Check (Zero Data Mutation):** The database migration does NOT alter, suffix, or delete any customer or ticket data. Instead, it executes an automated PostgreSQL preflight assertion that halts execution if duplicate records exist. Administrators can run `npm run db:check-unique-integrity` to detect duplicate legacy records safely without any writes.
- **Soft Delete & Uniqueness Semantics:** Under PostgreSQL `@unique` constraints, a passport or PNR value remains reserved in the table even after soft deletion (`deletedAt != null`). To reassign a passport or PNR, an administrator must permanently purge the soft-deleted record via the double-confirmation purge flow, protecting historical audit logs and preventing identity confusion.
- **Foreign Key Performance Indexes:** Key relation columns (`audit_logs.userId`, `modifications.processedById`, `payments.addedById`, `tickets.createdById`, `expenses.createdById`, `expenses.date`) are indexed.

### 4. Robust Error Handling Contract
- **Prisma P2002 (Unique Constraint):** Automatically translated to `409 Conflict` with human-readable error messages (e.g. `"Passport number already exists"`, `"PNR already exists"`, `"Ticket number already exists"`).
- **Prisma P2025 (Record Not Found):** Automatically translated to `404 Not Found`.
- **Validation Errors:** Zod validation schema errors return structured `400 Bad Request` payloads with specific field issues.

### 5. Safe Environment & Health Diagnostics
- `/api/health` returns only `{ success, data: { status, database, timestamp } }` in production.
- Internal connection error strings, hostnames, and environment variable names are strictly hidden from unauthenticated callers in production mode.
- Environment validation requires a strong `JWT_SECRET` and `DEFAULT_ADMIN_PASSWORD` in every environment; there are no application secret defaults.

### 6. Serverless Architecture Considerations
- **Stateless Core:** Access tokens are cryptographically verified JWTs; sessions and refresh tokens are persisted in PostgreSQL.
- **Rate limits:** Vercel deployments must configure the Upstash integration (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`) so login, refresh, upload, and extraction limits are shared across instances. Local development falls back to an in-memory store.

### 7. Passport document retention
- Passport documents remain in private storage when a customer is soft-deleted, so the archived record remains reviewable.
- They are deleted only when an administrator permanently purges an eligible customer. A customer with ticket history cannot be purged, preserving its document alongside the retained operational record.
- Every signed URL issuance is recorded as `PASSPORT_DOCUMENT_VIEWED` with the actor, customer, IP address, and user agent.

---

## 🛠️ Environment Variables Reference

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `development` / `production` |
| `PORT` | HTTP port | `3000` |
| `DATABASE_URL` | PostgreSQL connection pooler URL | `postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true&connection_limit=1` |
| `JWT_SECRET` | Secret key for signing access JWTs (min 32 chars) | Generated with `openssl rand -hex 64` |
| `JWT_EXPIRES_IN` | Access token lifespan | `15m` |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `https://africiatravel.vercel.app` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window duration (ms) | `900000` (15 minutes) |
| `RATE_LIMIT_MAX_AUTH` | Max requests per window for login | `10` |
| `RATE_LIMIT_MAX_REFRESH` | Max requests per window for refresh | `30` |
| `RATE_LIMIT_MAX_API` | Max requests per window for general API | `500` |
| `DEFAULT_ADMIN_PASSWORD` | Initial admin seed password | Strong password (required in production) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Shared Vercel rate-limit store | Configure through the Upstash integration |
| `GEMINI_API_KEY` | Google Gemini API key for document extraction | `AIzaSy...` (optional) |
| `GEMINI_MODEL` | Primary Gemini model | `gemini-2.5-flash` |
| `SUPABASE_URL` | Supabase project URL | `https://[PROJECT].supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Private key |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket for customer documents | `customer-documents` |

---

## 🧪 Testing

Run the full automated test suite (22 test files covering security, hardening, auth, domain, RBAC, i18n, API, AI extraction, and more):

```bash
npm test
```

Before deploying a migration to a configured target database, run `npm run prisma:check-drift`. It compares the live database schema with `prisma/schema.prisma`; the command must produce no SQL before deployment. The production Supabase transaction-pooler URL must include `pgbouncer=true&connection_limit=1`.

Specific test runners:
```bash
npm run test:hardening # Refresh limits, passport/PNR uniqueness, date clearing, P2002/P2025 handling
npm run test:security  # Security fixes, RTR, cookie headers, CORS, env guards
npm run test:auth      # Bcrypt, JWT verification, RBAC middleware
npm run test:tickets   # Ticket-customer find-or-create association
npm run test:rbac      # UI role-based filtering (Agent vs Admin)
npm run test:domain    # Domain business rules and validation errors
npm run test:api       # API endpoints and static security headers
npm run test:frontend  # Bilingual i18n and frontend business flows
```

---

## 🚀 Running Locally

```bash
# 1. Install dependencies and generate Prisma Client
npm install

# 2. Setup environment variables
cp .env.example .env

# 3. Apply migrations & seed database
npx prisma migrate dev
npm run prisma:seed

# 4. Start local development server
npm start
```
