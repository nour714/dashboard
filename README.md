# AfricaTravel — Travel Agency Management System

A robust, full-featured Travel Agency Management System engineered for flight ticket management, customer profiling, financial ledgers, itinerary modifications, ticket cancellations/refunds, expense tracking, and security auditing.

Built with a fast, zero-bundle Vanilla JavaScript + CSS frontend, an Express.js backend API, and a PostgreSQL database powered by Prisma ORM.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla JavaScript (ES Modules), HTML5, CSS3 Custom Properties (Design System), PWA (Service Worker) |
| **Backend** | Node.js 24, Express.js 5, Helmet, CORS, Cookie-Parser, Multer, Zod |
| **Database** | PostgreSQL, Prisma ORM 6 |
| **Authentication** | JWT (Dual Access + Refresh Tokens in `httpOnly` cookies), bcrypt, RBAC |
| **Storage & Caching** | Supabase Storage (Private document bucket), Upstash Redis (Sliding-window rate limiting) |
| **Deployment** | Docker (Alpine Linux), Vercel Serverless Functions, GitHub Actions CI |

---

## Directory Structure

The project uses a clean modular structure with strict separation of concerns:

```
Africiatravel/
├── api/                       # Vercel Serverless Function entrypoint (api/index.js)
├── backend/                   # Express backend application source code
│   ├── index.js               # Application factory and module exports
│   └── src/
│       ├── app.js             # Express app setup, middleware, static serving, and routes
│       ├── config/            # Environment validation & Prisma DB client
│       ├── controllers/       # HTTP request handlers
│       ├── middleware/        # Auth, RBAC, error handling, rate limiting, upload
│       ├── routes/            # REST API route declarations (/api/*)
│       └── services/          # Business logic, audit logging, Supabase storage
├── config/                    # Centralized linter and tool configurations
│   ├── eslint.config.js       # ESLint flat configuration
│   └── prettier.config.js     # Prettier formatting rules
├── database/                  # Prisma database layer
│   └── prisma/
│       ├── migrations/        # Version-controlled database migrations
│       ├── schema.prisma      # Prisma schema (PostgreSQL)
│       └── seed.js            # Initial database seeder
├── docs/                      # Technical documentation
│   ├── PRD.md                 # Product Requirements Document
│   ├── architecture.md        # System architecture & execution lifecycle
│   ├── database.md            # Database models, indexes, and migrations
│   ├── deployment.md          # Docker, Vercel, and CI/CD operations
│   ├── security-architecture.md # Auth, RBAC, encryption, and hardening
│   ├── testing.md             # Automated testing guide & command reference
│   └── supabase-setup-summary.md # Supabase infrastructure summary
├── frontend/                  # Static Single Page Application (SPA)
│   ├── assets/                # Brand logos, icons, graphics
│   ├── index.html             # Application entrypoint markup
│   ├── js/                    # Client-side ES Modules (router, components, pages, state)
│   ├── manifest.json          # PWA web manifest
│   ├── styles/                # Modular CSS design system (tokens, layout, components)
│   └── sw.js                  # PWA service worker with offline caching
├── scripts/                   # Operational and maintenance CLI utilities
│   ├── database/              # Database integrity checks
│   ├── deployment/            # Pre-flight deployment verifications
│   └── maintenance/           # Admin password resets
├── tests/                     # Automated test suites (34+ suites)
│   ├── e2e/                   # Playwright end-to-end browser tests
│   ├── fixtures/              # Environment setup & mocks
│   ├── integration/           # API contracts, business flows, PWA, database
│   ├── security/              # Auth, RBAC, audit logs, rate limiting
│   └── unit/                  # Domain rules, math calculations, JSDOM frontend tests
├── .env.example               # Template environment configuration
├── .env.test.example          # Template test environment configuration
├── Dockerfile                 # Production container specification
├── docker-compose.yml         # Container composition for local development
├── package.json               # Project manifest, dependencies, and npm scripts
├── playwright.config.js       # Playwright E2E configuration
├── server.js                  # Main production HTTP entrypoint
└── vercel.json                # Vercel deployment configuration
```

---

## Quick Start

### Prerequisites
- **Node.js**: >= 20.x (Recommended: 24.x)
- **npm**: >= 10.x
- **PostgreSQL**: 15+ (Local or cloud-hosted on Supabase)

### 1. Clone & Install
```bash
git clone https://github.com/nour714/dashboard.git
cd Africiatravel
npm install
```

### 2. Configure Environment
Copy the template configuration and fill in your database and security credentials:
```bash
cp .env.example .env
```

### 3. Initialize Database
Generate the Prisma client and apply database migrations:
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 4. Start the Application
```bash
# Production / Local server
npm start
```
The application will be accessible at: `http://localhost:3000`

Default seeded administrative credentials:
- **Email**: `admin@africatravel.com`
- **Password**: Configured during seed or reset via `npm run reset:passwords`

---

## Available NPM Scripts

### Application & Build
| Command | Description |
|---|---|
| `npm start` | Starts the Express production server (`server.js`) |
| `npm run build` | Builds/generates the Prisma client for production |
| `npm run postinstall` | Automatically generates Prisma client on package install |
| `npm run lint` | Runs ESLint across `backend/`, `tests/`, and `frontend/js/` |

### Database
| Command | Description |
|---|---|
| `npm run prisma:generate` | Generates Prisma Client (`database/prisma/schema.prisma`) |
| `npm run prisma:migrate` | Runs database migrations in development |
| `npm run prisma:check-drift` | Inspects schema drift against migrations |
| `npm run prisma:seed` | Seeds database with initial staff accounts |
| `npm run db:check-unique-integrity`| Audits active tickets & customers for conflicting records |
| `npm run reset:passwords` | Resets admin and agent passwords securely |

### Testing
| Command | Description |
|---|---|
| `npm test` | Runs all 34 unit, integration, and security test suites |
| `npm run test:frontend-unit` | Runs all JSDOM client component and utility tests |
| `npm run test:business-flow` | Runs the 128 core business workflow scenarios |
| `npm run test:security` | Runs API security regression checks |
| `npm run test:rbac` | Verifies Role-Based Access Control enforcement |
| `npm run test:rate-limit` | Tests in-memory and Redis rate limiting |
| `npm run test:hardening` | Tests production hardening configurations |
| `npx playwright test` | Executes Playwright end-to-end browser journeys |

---

## Deployment

### Docker
```bash
docker build -t africatravel .
docker run -p 3000:3000 --env-file .env africatravel
```

### Vercel
Deploy seamlessly using the Vercel CLI or Git integration. Static assets in `frontend/` are cached at the edge, and dynamic requests are routed to `api/index.js`.
```bash
vercel --prod
```

Verify deployment readiness:
```bash
node scripts/deployment/verify-deployment.js
```

---

## Technical Documentation

Detailed guides are available in the [`docs/`](./docs) directory:
- [System Architecture](docs/architecture.md): Lifecycle, component hierarchy, and routing.
- [Database Guide](docs/database.md): Schema models, relationships, indexing, and migrations.
- [Security Guide](docs/security-architecture.md): JWT cookie delivery, RBAC, CSP, and rate limiting.
- [Deployment Guide](docs/deployment.md): Docker, Vercel, and CI pipeline setup.
- [Testing Guide](docs/testing.md): Automated testing framework and test suites reference.
- [Product Requirements (PRD)](docs/PRD.md): Functional specification and business rules.

---

## License

Internal proprietary software — AfricaTravel. All rights reserved.
