# AfricaTravel — Security Architecture & Hardening

## 1. Overview

AfricaTravel implements a defense-in-depth security model protecting financial data, customer personal identification information (PII), and flight booking records. Security controls span transport, network, authentication, authorization, filesystem, and data persistence layers.

---

## 2. Authentication Architecture

### 2.1 Dual-Token JWT Architecture
Authentication relies on asymmetric token lifecycles:
- **Access Token**: Short-lived (15 minutes). Signed using `JWT_SECRET`. Contains claims `id`, `email`, and `role`. Verified statelessly on every protected API call via `authenticateToken` middleware.
- **Refresh Token**: Long-lived (7 days by default, 30 days for "Remember Me"). Signed using `JWT_REFRESH_SECRET`. Stored as a one-way **SHA-256 hash** (`tokenHash`) in the PostgreSQL `refresh_tokens` table.

```
Client                             Server                           PostgreSQL
  |                                  |                                  |
  |-- POST /api/auth/login --------->|                                  |
  |   { email, password }            |-- Verify bcrypt (cost=12) ------>|
  |                                  |-- Create RefreshToken (SHA-256)->|
  |<-- Set-Cookie: accessToken ------|                                  |
  |    Set-Cookie: refreshToken -----|                                  |
  |    (httpOnly, secure, sameSite)  |                                  |
  |                                  |                                  |
  |-- GET /api/customers ----------->|                                  |
  |   (Cookie: accessToken)          |-- Verify JWT signature & role    |
  |<-- 200 OK + Data ----------------|                                  |
  |                                  |                                  |
  |-- POST /api/auth/refresh ------->|                                  |
  |   (Cookie: refreshToken)         |-- Hash token & verify DB state ->|
  |<-- 200 OK (New accessToken) -----|                                  |
```

### 2.2 Secure Cookie Delivery
Tokens are transmitted strictly within HTTP response headers:
```javascript
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/'
}
```
- **XSS Mitigation**: Client-side JavaScript cannot read `document.cookie`, preventing exfiltration via script injection.
- **CSRF Mitigation**: `SameSite=Lax` ensures cookies are not sent on cross-site subrequests.

### 2.3 Token Revocation & Session Invalidation
Logging out triggers explicit revocation in the database (`revoked: true`), rendering stolen refresh tokens permanently unusable.

---

## 3. Authorization & RBAC

Access control is enforced at the route middleware level using `requireRole`:

| Role | Access Permissions |
|---|---|
| `ADMIN` | Unrestricted access: user management, financial reports, system audits, hard-purge operations, settings. |
| `AGENT` | Operational access: create/read/update customers, tickets, modifications, refunds, payments, expenses. |
| `TICKET_ONLY` | Restricted operational access: view and issue flight tickets only; no access to financials or customers. |

```javascript
// Example route authorization
router.delete('/purge/:id', authenticateToken, requireRole('ADMIN'), purgeTicketHandler);
```

---

## 4. Network & Middleware Defenses

### 4.1 Content Security Policy (Helmet)
Configured in `backend/src/app.js` using `helmet()`:
- `default-src 'self'`
- Scripts restricted to trusted origins
- Styles restricted to `'self'` and Google Fonts
- `frame-ancestors 'none'` (Clickjacking prevention)
- `X-Content-Type-Options: nosniff` (MIME-sniffing prevention)
- `Referrer-Policy: strict-origin-when-cross-origin`

### 4.2 Rate Limiting
- **Global API Rate Limit**: 300 requests per 15-minute window per IP.
- **Authentication Route Rate Limit**: 10 login requests per 15-minute window per IP to defend against brute-force password guessing.
- **Distributed Limiting**: When `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are configured, rate limits use an atomic sliding-window algorithm across serverless instances; falls back safely to in-memory rate limiting when unconfigured.

### 4.3 Static Path Traversal Guard
Static file serving in `backend/src/app.js` employs defensive path normalization:
- Rejects requests containing `%2e%2e`, `..`, or null bytes (`\0`).
- Validates that `path.resolve(targetPath).startsWith(frontendDir)`.
- Responds with `403 Forbidden` if an escape attempt is detected.

---

## 5. Secure File Uploads & Storage

Customer passport scans and documents are handled with strict upload controls:
- **In-Memory Buffering**: Files are buffered via `multer.memoryStorage()`, preventing temporary unverified files from touching the disk.
- **Magic-Number MIME Validation**: Uses `file-type` to inspect binary file headers, rejecting spoofed extensions (e.g. an `.exe` renamed to `.png`).
- **Whitelisted File Types**: `image/jpeg`, `image/png`, `application/pdf`.
- **Payload Limits**: Max 15 MB per file.
- **Storage Isolation**: Stored in a private Supabase Storage bucket (`customer-documents`). Files are accessed exclusively via short-lived, signed URLs generated server-side.

---

## 6. Audit Logging

Every critical business action records an immutable row in `audit_logs`:
- Actor User ID & User Display Name
- Action Type (`TICKET_CREATE`, `TICKET_PURGE`, `REFUND_PROCESS`, `USER_UPDATE`, etc.)
- Target Entity IDs (`ticketId`, `customerId`)
- Contextual Metadata JSON (before/after state diffs)
- Request IP Address & User-Agent
