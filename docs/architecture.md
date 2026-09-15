# AfricaTravel — System Architecture

## 1. Overview

AfricaTravel is an internal Travel Agency Management System engineered to handle the complete travel lifecycle: customer profiling, flight ticket management, payment and debt tracking, itinerary modifications, ticket refunds, expense logging, and administrative oversight with role-based access control (RBAC).

The system follows a clean modular monolithic architecture designed with:
- **Frontend**: Lightweight, dependency-free Vanilla ES Modules + semantic HTML5 + modern CSS3 design system with native dark mode and bidirectional RTL/LTR internationalization.
- **Backend**: Express.js REST API with layered routing, controller/service encapsulation, defensive validation, security middleware, and structured audit trails.
- **Database**: PostgreSQL orchestrated via Prisma ORM with strict referential integrity, performance indexes, and transactional consistency.
- **Deployment**: Dual deployment targets supporting continuous containerized runtime via Docker and serverless edge execution via Vercel.

---

## 2. System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 Client Browser                                    |
|                                                                                   |
|  +-------------------------+  +-------------------------+  +-------------------+  |
|  |   SPA Router (Hash)     |  |   UI Components & Views |  |   PWA Service     |  |
|  |   (/#customers, etc.)   |  |   (Sidebar, Modals, ...) |  |   Worker & Cache  |  |
|  +------------+------------+  +------------+------------+  +---------+---------+  |
|               |                            |                         |            |
|               +----------------------------+-------------------------+            |
|                                            | (Fetch API / JSON)                   |
+--------------------------------------------|--------------------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------+
|                        Application Layer (Express / Node.js)                       |
|                                                                                   |
|  [Entrypoints]: `server.js` (Standalone / Docker)  |  `api/index.js` (Vercel)     |
|                                                                                   |
|  [Security & Middleware Pipeline]                                                 |
|    - Helmet (Content Security Policy, frameguard, Referrer-Policy)                |
|    - CORS (Whitelisted origins with credentials support)                         |
|    - Rate Limiting (In-memory / Upstash Redis sliding window)                     |
|    - Cookie Parser & JSON Body Parser                                             |
|    - JWT Authentication Guard (`authenticateToken`)                              |
|    - Role-Based Access Control (`requireRole('ADMIN')`)                           |
|    - Path Traversal Guard (Static asset directory isolation)                     |
|                                                                                   |
|  [REST API Routes] (/api/*)                                                       |
|    - `/api/auth`          - Login, Refresh, Logout, Session Verification          |
|    - `/api/customers`     - Customer profiles, balance calculations, documents    |
|    - `/api/tickets`       - Flight ticket lifecycle, passenger manifest, status   |
|    - `/api/payments`      - Customer & supplier transactions, receipt generation  |
|    - `/api/modifications` - Ticket itinerary updates, airline/agency fees         |
|    - `/api/refunds`       - Ticket cancellations, refund distributions            |
|    - `/api/expenses`      - Operational agency expense tracking                   |
|    - `/api/employees`     - Staff member administration (Admin only)              |
|    - `/api/reports`       - Financial summaries, debt aging, sales metrics        |
|    - `/api/audit`         - Immutable system activity and security audit trail    |
|    - `/api/system`        - System configuration, settings, health checks         |
|                                                                                   |
|  [Domain Logic & Services]                                                        |
|    - Payment & Debt Calculations (`calculations.js`, `domain-rules.js`)           |
|    - AI Ticket Extraction (PDF / Text parser)                                     |
|    - Supabase Storage Client (Passport and invoice uploads)                       |
|    - Audit Service (Contextual actor recording)                                   |
+--------------------------------------------|--------------------------------------+
                                             | Prisma Client (ORM)
                                             v
+-----------------------------------------------------------------------------------+
|                          Data Persistence (PostgreSQL)                            |
|                                                                                   |
|  - Relational Schema with Foreign Keys & Cascades                                 |
|  - Performance Indexes on lookup fields (`customerId`, `status`, `departureDate`) |
|  - Row Level Security (RLS) policies                                              |
+-----------------------------------------------------------------------------------+
```

---

## 3. Directory Layout

The codebase is organized into isolated, single-responsibility directories:

```
Africiatravel/
├── api/                       # Vercel Serverless Function entrypoint
│   └── index.js
├── backend/                   # Backend application source code
│   ├── index.js               # Application factory & module exports
│   └── src/
│       ├── app.js             # Express app setup, middleware, and route mounting
│       ├── config/            # Environment validation & DB connections
│       ├── controllers/       # HTTP request handlers
│       ├── middleware/        # Auth, RBAC, error, rate limiting, upload
│       ├── routes/            # Express route declarations
│       └── services/          # Business logic & 3rd party integrations
├── config/                    # Centralized linter and formatter configurations
│   ├── eslint.config.js
│   └── prettier.config.js
├── database/                  # Prisma schema, migrations, seed, and SQL scripts
│   └── prisma/
│       ├── migrations/        # Version-controlled database migrations
│       ├── schema.prisma      # Relational schema definition
│       └── seed.js            # Initial data seed (Admin/Agents)
├── docs/                      # Technical documentation & project specs
│   ├── overview.md
│   ├── PRD.md
│   ├── architecture.md
│   ├── database.md
│   ├── deployment.md
│   ├── security-architecture.md
│   ├── testing.md
│   └── supabase-setup-summary.md
├── frontend/                  # Static client assets
│   ├── assets/                # Logos, images, brand graphics
│   ├── index.html             # Single-page application root markup
│   ├── js/                    # Client JavaScript (ES Modules)
│   │   ├── bootstrap.js       # App initialization & service registration
│   │   ├── app.js             # Shell layout coordinator
│   │   ├── components/        # Reusable UI widgets (modals, tabs, badges)
│   │   ├── data/              # Airline catalogues, mock fallbacks
│   │   ├── domain/            # Client-side domain validation rules
│   │   ├── i18n/              # English/Arabic translation dictionaries
│   │   ├── pages/             # View renderers (Dashboard, Tickets, etc.)
│   │   ├── router/            # Hash-based routing engine
│   │   ├── services/          # HTTP API client & state bridges
│   │   ├── state/             # Reactive application state store
│   │   └── utils/             # Calculation utilities, DOM helpers
│   ├── manifest.json          # PWA web app manifest
│   ├── styles/                # Modular CSS design system
│   │   ├── tokens.css         # Color palette, spacing, typography variables
│   │   ├── base.css           # Global resets and HTML baseline
│   │   ├── layout.css         # Grid layouts, sidebar, topbar structure
│   │   ├── components.css     # Buttons, inputs, modals, cards, badges
│   │   ├── responsive.css     # Mobile, tablet, desktop media queries
│   │   └── utilities.css      # Flex, alignment, and display helpers
│   └── sw.js                  # PWA service worker (offline caching)
├── scripts/                   # CLI maintenance, database, and dev scripts
│   ├── database/              # DB integrity audits, migrations
│   ├── deployment/            # Pre/post-deployment verification
│   └── maintenance/           # Password resets, batch operations
├── tests/                     # Comprehensive test suites
│   ├── e2e/                   # Playwright end-to-end user journeys
│   ├── fixtures/              # Test environment configuration & stubs
│   ├── integration/           # API, database, and business flow tests
│   ├── security/              # Auth, RBAC, rate-limiting, and hardening tests
│   └── unit/                  # Domain rules, math calculations, schema tests
│       └── frontend/          # JSDOM component & utility unit tests
├── .env.example               # Example environment configuration
├── .env.test.example          # Example test environment configuration
├── Dockerfile                 # Production container definition
├── docker-compose.yml         # Local development environment composition
├── package.json               # Dependencies and scripts definition
├── playwright.config.js       # Playwright E2E configuration
├── server.js                  # Main production HTTP entrypoint
└── vercel.json                # Vercel deployment routing & headers
```

---

## 4. Execution Lifecycle

### 4.1 Server Initialization (`server.js`)
1. Environment variables are loaded and validated against strict schemas (`backend/src/config/env.js`).
2. Express application is initialized via `createApp()` in `backend/src/app.js`.
3. Database connectivity is checked via `connectDB()`.
4. Middleware chain is mounted (Helmet, CORS, rate limiter, cookie/JSON parsers).
5. Static directory `frontend/` is mounted with secure path traversal safeguards.
6. API routes are mounted under `/api/*`.
7. SPA fallback route sends `frontend/index.html` for client-side routing.
8. HTTP server listens on `process.env.PORT` (defaults to 3000).

### 4.2 Vercel Serverless Invocation (`api/index.js`)
1. Vercel routes `/api/(.*)` requests directly to `api/index.js`.
2. The export `createApp()` is lazily initialized and handles the incoming serverless event.
3. Static files are served directly by Vercel's edge CDN as declared in `vercel.json`.

### 4.3 Client-Side Lifecycle (`frontend/index.html`)
1. Browser requests `/` and receives `frontend/index.html` with pre-configured CSP headers.
2. `bootstrap.js` executes:
   - Registers Service Worker (`sw.js`).
   - Initializes `i18n` locale settings (detecting Arabic RTL or English LTR).
   - Initializes application state in `store.js`.
   - Mounts the router (`router.js`).
3. Hash router examines current window location (`#dashboard`, `#tickets`, etc.) and renders the corresponding view into the main DOM container.
4. Navigation guards verify user authentication state; unauthenticated users are seamlessly routed to `#login`.
