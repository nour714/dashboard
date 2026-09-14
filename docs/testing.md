# AfricaTravel — Testing Strategy & Test Suite Reference

## 1. Overview

AfricaTravel features a comprehensive automated test harness covering pure mathematical calculations, client-side UI components, backend route handlers, database integrity, security boundaries, and browser user journeys.

---

## 2. Directory Structure

All test assets are categorized inside `tests/`:

```
tests/
├── fixtures/                     # Test environment bootstrap and mock configurations
│   └── setup-env.js
├── unit/                         # Unit tests with isolated scope and no network calls
│   ├── backend-domain.test.js
│   ├── dark-mode-html-integrity.test.js
│   ├── flight-modification-fee-split.test.js
│   ├── schema-bounds.test.js
│   ├── sidebar-collapse-listener.test.js
│   ├── ticket-payment-status.test.js
│   ├── ticket-schema-nullables.test.js
│   └── frontend/                 # Frontend component & utility unit tests (JSDOM)
│       ├── calculations.test.js
│       ├── domain-rules.test.js
│       ├── i18n.test.js
│       ├── modal-rendering.test.js
│       └── security-utils.test.js
├── integration/                  # Cross-boundary API, database, and business flows
│   ├── airlines-catalog.test.js
│   ├── backend-api.test.js
│   ├── backend-auth.test.js
│   ├── boot-splash.test.js
│   ├── business-flow.test.js     # 128 core business scenario tests
│   ├── customer-payments-report.test.js
│   ├── customer-performance.test.js
│   ├── employee-delete.test.js
│   ├── expenses.test.js
│   ├── i18n-bilingual.test.js
│   ├── mobile-search.test.js
│   ├── passport-document.test.js
│   ├── postgres-integration.test.js
│   ├── production-hardening.test.js
│   ├── pwa-install.test.js
│   ├── round-trip-flight.test.js
│   ├── ticket-customer-link.test.js
│   ├── ticket-edit-expansion.test.js
│   └── ticket-extraction.test.js
├── security/                     # Hardening, authorization, and rate-limiting tests
│   ├── audit-fixes.test.js
│   ├── audit-p0-fixes.test.js
│   ├── purge-actions.test.js
│   ├── rate-limiter.test.js
│   ├── rbac-ui.test.js
│   ├── security-fixes.test.js
│   ├── security-hardening-round2.test.js
│   └── security-hardening-round3.test.js
└── e2e/                          # Playwright browser end-to-end user specs
    ├── auth.spec.js
    ├── i18n-rtl.spec.js
    ├── rbac-visibility.spec.js
    └── ticket-lifecycle.spec.js
```

---

## 3. Running Tests

### 3.1 Complete Test Suite
To execute all 34 unit, integration, and security test suites:
```bash
npm test
```

### 3.2 Frontend Unit Tests (JSDOM)
Run all client-side unit tests in a simulated DOM environment:
```bash
npm run test:frontend-unit
```

### 3.3 Domain & Business Logic
```bash
# Core 128-scenario agency business lifecycle (tickets, modifications, refunds)
npm run test:business-flow

# Financial calculations & ticket payment status derivation
npm run test:domain
npm run test:ticket-status
npm run test:fee-split
```

### 3.4 Security & RBAC Verification
```bash
npm run test:security
npm run test:security-round2
npm run test:security-round3
npm run test:rbac
npm run test:audit
npm run test:purge
npm run test:rate-limit
```

### 3.5 End-to-End Browser Tests (Playwright)
```bash
# Run headless browser specs
npx playwright test

# Run interactive UI mode
npx playwright test --ui
```

---

## 4. Test Categories Explained

### 4.1 Business Flow Tests (`tests/integration/business-flow.test.js`)
Validates complete multi-step agency operations:
1. Customer creation with unique passport validation.
2. Ticket issuance (single, round-trip) with initial status `CONFIRMED` or `PENDING_PAYMENT`.
3. Split payment processing: allocating partial amounts across multiple dates and methods.
4. Itinerary modifications: calculating airline penalties vs. agency service fees.
5. Ticket cancellations and refund distribution to customers.
6. Debt ledger aging: ensuring customer total balance matches cumulative ticket, modification, and payment delta.

### 4.2 Security Hardening Tests (`tests/security/`)
- Verifies that `AGENT` roles cannot invoke administrative endpoints (`/api/employees`, `/api/audit/all`, `/api/system/settings`).
- Verifies that static asset requests cannot traverse outside `frontend/` using `%2e%2e/` or `..`.
- Verifies that `X-Frame-Options` and `Content-Security-Policy` headers are strictly emitted.
- Verifies that invalid login attempts trigger rate limits.

### 4.3 Production Hardening Tests (`tests/integration/production-hardening.test.js`)
- Validates that environment configurations reject placeholder keys in production.
- Ensures all API error responses sanitize stack traces and SQL error details.
- Validates that the PWA service worker and web manifest are syntactically valid and link to actual asset files.
