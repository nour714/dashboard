# AfricaTravel — Database Architecture & Schema Reference

## 1. Overview

AfricaTravel uses **PostgreSQL** managed through **Prisma ORM**. The database schema is designed for high data integrity, strict referential constraints, optimized query indexing, and complete auditability.

- **Schema Location**: `database/prisma/schema.prisma`
- **Migrations Location**: `database/prisma/migrations/`
- **Seed Script**: `database/prisma/seed.js`
- **Integrity Verifier**: `scripts/database/check-unique-integrity.js`

---

## 2. Connection Strategy

The database supports both direct and pooled connections for maximum compatibility across server environments (Docker, bare-metal VPS, and Vercel Serverless):

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

- **`DATABASE_URL`**: Pooled connection string (e.g. Supabase Transaction Pooler on port `6543`) utilized for standard queries and runtime traffic.
- **`DIRECT_URL`**: Direct connection string (port `5432`) required for executing Prisma migrations and DDL schema alterations without pooler transaction timeouts.

---

## 3. Data Models & Entity Relationship

```
+---------------+          1:N         +-------------------+
|     User      |--------------------->|      Ticket       |
| (Employees)   |                      +-------------------+
+-------+-------+                                | 1:N
        |                                        |
        | 1:N                                    +--------> Payment
        |                                        | 1:N
        +------------> RefreshToken              +--------> Modification
        | 1:N                                    | 1:N
        +------------> AuditLog                  +--------> Refund
        | 1:N
        +------------> Expense
        
+---------------+          1:N         +-------------------+
|   Customer    |--------------------->|      Ticket       |
+-------+-------+                      +-------------------+
        | 1:N
        +------------> CustomerNote
```

### 3.1 Entities

| Model | Table Name | Description | Key Indexes |
|---|---|---|---|
| `User` | `users` | Staff members (Admin, Agent, Ticket-Only) | `email` (unique) |
| `Customer` | `customers` | Client passenger profiles & passport document references | `passport` (unique), `deletedAt` |
| `CustomerNote` | `customer_notes` | Internal communication log entries per customer | `customerId` |
| `Ticket` | `tickets` | Flight booking records, route details, and pricing | `customerId`, `createdById`, `deletedAt` |
| `Payment` | `payments` | Monetary receipts allocated to tickets | `ticketId`, `addedById` |
| `Modification` | `modifications` | Itinerary flight changes, date changes, change fees | `ticketId`, `processedById` |
| `Refund` | `refunds` | Cancelled tickets and processed refund transactions | `ticketId` |
| `AuditLog` | `audit_logs` | Immutable audit trail of administrative & business actions | `userId`, `timestamp` |
| `RefreshToken` | `refresh_tokens`| Hashed session tokens for persistent authentication | `tokenHash` (unique), `userId` |
| `Expense` | `expenses` | Internal operational expenses (Services, Transfers) | `createdById`, `date` |
| `SystemSetting`| `system_settings`| Agency configuration key-value storage | `id` (primary key) |

### 3.2 Enums

- **`Role`**: `ADMIN`, `AGENT`, `TICKET_ONLY`
- **`EmployeeStatus`**: `ACTIVE`, `INACTIVE`
- **`ExpenseCategory`**: `SERVICES`, `TRANSFERS`
- **`PaymentType`**: `TICKET` (default, base ticket payment), `MODIFICATION` (change fee payment)

---

## 4. Integrity & Indexing Rules

### 4.1 Partial Unique Index on Active Tickets
To prevent duplicate ticket numbers and PNRs while allowing soft-deleted records to retain their original historical identifiers, partial unique indexes are enforced in PostgreSQL:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS "tickets_ticketNumber_active_idx" 
ON "tickets"("ticketNumber") 
WHERE "deletedAt" IS NULL AND "ticketNumber" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "tickets_pnr_active_idx" 
ON "tickets"("pnr") 
WHERE "deletedAt" IS NULL AND "pnr" IS NOT NULL;
```

### 4.2 Soft-Delete Patterns
`Customer`, `Ticket`, and `Expense` implement soft-deletion via nullable `deletedAt DateTime?` timestamps. Database queries filter active records with `where: { deletedAt: null }`. Hard purging is restricted to administrators and validated via security tests.

### 4.3 Restrict Deletion of Financial Records
Child transaction tables (`payments`, `modifications`, `refunds`) define `onDelete: Restrict` with respect to their parent `Ticket`: PostgreSQL blocks any attempt to hard-delete a `Ticket` row while payments, modifications, or refunds still reference it. Tickets are removed from view via the soft-delete `deletedAt` timestamp instead (see 4.2); the underlying row — and its full financial history — is never physically deleted while dependents exist. `User` relations on these tables (`addedById`, `processedById`, `createdById`) use `onDelete: SetNull` so removing a staff account never deletes their financial history.

---

### 4.4 Financial CHECK Constraints
PostgreSQL CHECK constraints enforce domain financial invariants at the database level:
- `payments.amount > 0`: Prevents recording non-positive payments.
- `refunds.amount > 0`: Prevents recording non-positive customer refunds.
- `expenses.amount > 0`: Prevents recording non-positive operational expenses.
- `tickets.ticketPrice >= 0`: Non-negative ticket selling price.
- `tickets.costPrice IS NULL OR >= 0`: Cost price is nullable with no default (legacy uncosted tickets stay `NULL`); when present, it must be non-negative.
- `modifications.changeFee >= 0` and `modifications.airlineFee >= 0`: Non-negative modification fees.

These constraints are added `NOT VALID` first to prevent blocking active write operations, followed by immediate asynchronous validation after preflight verification.

---

## 4.5 Migration Chain Integrity

The migration history under `database/prisma/migrations/` starts at `20260822000000_init_baseline`, which reconstructs the schema as it existed before the first ever migration was committed (the original schema was provisioned with `prisma db push`, which does not generate migration files). Every migration in the chain — including the baseline — is written to be idempotent (`IF NOT EXISTS` / existence-checked `DO $$` blocks), so:

- **Fresh environments**: `npx prisma migrate deploy` replays the full chain from an empty database and produces a schema with **zero drift** from `schema.prisma` (verified with `npx prisma migrate diff --from-url <db> --to-schema-datamodel database/prisma/schema.prisma --script`).
- **Existing environments provisioned with `db push`** (e.g. any database that predates this baseline migration): switching that database to `migrate deploy` requires a one-time bookkeeping step, because the tables already exist. Run, in migration order, for every migration older than the one that introduced this baseline:
  ```bash
  npx prisma migrate resolve --applied 20260822000000_init_baseline --schema=database/prisma/schema.prisma
  npx prisma migrate resolve --applied 20260823000000_add_customer_passport_document --schema=database/prisma/schema.prisma
  # ...repeat for each historical migration already reflected in that database's tables
  ```
  Then run `npx prisma migrate deploy` normally to apply any migrations newer than the database's actual state (e.g. `20260918000000_reconcile_fk_ondelete_and_missing_indexes`, which brings a `db push`-provisioned database's `onDelete` behavior and indexes in line with `schema.prisma` — it is idempotent, so it is also safe to run even if some of it was already applied by a previous `db push`).
- **Never mix `db push` and `migrate deploy` against the same database going forward.** `db push` does not write to the `_prisma_migrations` table, so alternating between the two silently reintroduces drift. Use `migrate deploy` exclusively once a database has been bootstrapped with it.

---

## 5. Seed Data & Initial Provisioning

The database seed script (`database/prisma/seed.js`) provisions initial staff members with securely hashed passwords (bcrypt cost factor 12):

| Account Email | Default Role |
|---|---|
| `admin@africatravel.com` | `ADMIN` |
| `ahmed.r@africatravel.com` | `ADMIN` |
| `nour.w@africatravel.com` | `AGENT` |
| `hashem.a@africatravel.com` | `AGENT` |

Password rotation can be executed at any time using:
```bash
npm run reset:passwords
# or: node scripts/maintenance/reset-admin-passwords.js
```

---

## 6. CLI Management Commands

| Command | Purpose |
|---|---|
| `npm run prisma:generate` | Generates the type-safe Prisma Client from `database/prisma/schema.prisma` |
| `npm run prisma:migrate` | Applies pending migrations in a development environment |
| `npm run prisma:check-drift` | Inspects schema diffs to identify uncommitted database drift |
| `npm run prisma:seed` | Seeds database with initial system users |
| `npm run db:check-unique-integrity` | Audits tickets and customers for duplicate or conflicting records |
| `node scripts/database/preflight-check-constraints.js` | Audits tables for violations of financial CHECK constraints |
| `node scripts/database/report-zero-cost-tickets.js` | Audits and lists legacy tickets with costPrice = 0 and ticketPrice > 0 |
