# Changelog

All notable changes to the **AfricaTravel** Operations Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.6.0] - 2026-09-20 — Financial Audit Remediation

### Added
- **Canonical Financial Ledger (`backend/src/domain/ledger.js`)**: Single source of truth for all ticket financial calculations (`computeTicketLedger`, `aggregateLedgers`) using `decimal.js` end-to-end to prevent float rounding errors.
- **Payment Classification Enum (`PaymentType`)**: Added `PaymentType` enum (`TICKET`, `MODIFICATION`) to decouple base ticket payments from modification fee collections and prevent cross-allocation.
- **Legacy Uncosted Ticket Audit Tool (`scripts/database/report-zero-cost-tickets.js`)**: Diagnostic tool to audit and list legacy tickets with `costPrice = 0` and `ticketPrice > 0` requiring cost attribution.
- **PostgreSQL Financial CHECK Constraints**: Added non-validating then validated CHECK constraints preventing negative prices, non-positive payments/refunds/expenses, and non-negative modification fees.
- **Agency Net Profit Calculation**: Integrated total operational expenses into agency profit reporting in `GET /reports/summary` (`agencyNetProfit = totalGrossProfit - totalExpenses`).
- **Comprehensive Audit Test Suite (`tests/unit/financial-audit-scenarios.test.js`)**: 14 automated test scenarios covering the complete financial audit matrix.

### Changed
- **Nullable Ticket Cost Price**: Schema updated so `Ticket.costPrice` is nullable without default; tickets with unknown costs yield `netProfit = null` (rendered as `"N/A"` in the UI) instead of treating cost as free ($0).
- **Modification Cost and Profit Accounting**: Included `modificationProfit` (`changeFee - airlineFee`) into overall ticket net profit and reporting aggregations.
- **Expenses Full-Dataset Aggregation**: `ExpenseService.getExpenses` computes currency totals across the entire filtered database query rather than only the active pagination slice.
- **Cohort-Consistent Weekly Trends**: Decoupled weekly trends into cohort-based ticket metrics and transaction-time collections and modifications.
- **Frontend Minor-Unit Calculations**: Refactored `frontend/js/domain/ticket-rules.js` to compute money in integer minor units (cents) to eradicate client-side floating point drift.
- **Multi-Currency UI Display**: Updated dashboard, reports, customers, and employee views to present financials categorized per currency via `formatMultiCurrency` without cross-currency summation.

### Security
- **Strict Role-Based Access Control (RBAC)**: Sanitized all ticket, modification, refund, and report responses to completely strip `costPrice`, `netProfit`, `grossProfit`, `modificationProfit`, `airlineFee`, and `airlineRefundAmount` for non-`ADMIN` users.
- **CSV Formula Injection Neutralization**: Added `sanitizeCsvCell` in `frontend/js/utils/security.js` escaping leading `=`, `+`, `-`, `@`, `\t`, and `\r` characters with single apostrophes across all CSV exports.
- **Concurrency & Race Condition Hardening**: Wrapped payment and refund transaction handlers in `withSerializableRetry` with PostgreSQL serializable isolation and exponential backoff retry on conflict.
- **Schema Input Bounds**: Enforced strict upper bounds (`max(100_000_000)`) and strict boolean parsing across all Zod schema validation boundaries.

### Fixed
- **Partial Refund on Underpaid Tickets**: Prevented issuing refunds exceeding the actual net customer cash collected (`totalCollected - totalRefunds`).
- **Revenue Inclusions on Refunded Tickets**: Corrected sales and revenue aggregations to exclude fully refunded tickets and net out partial customer refunds.
- **Payment Modal Classification**: Added `TICKET` vs `MODIFICATION` selector with real-time balance validation preventing overpayment.
- **Refund Modal Cost Defaulting**: Removed unsafe default of airline refund amount to ticket cost price; set default to 0 with manual review, status selection, and dynamic ticket closure toggle.

---

## [2.5.0] - 2026-09-15

### Added
- **Dedicated Test Runner**: Added `scripts/testing/test-runner.js` with structured progress logging, elapsed test timing, and suite filtering flags (`--unit`, `--integration`, `--security`, `--bail`).
- **Comprehensive E2E Smoke Tests**: Added read-only production smoke test suite using Playwright (`e2e-smoke/`).
- **Distributed Rate Limiting**: Added Upstash Redis rate limiting via `@upstash/ratelimit` and `@upstash/redis` to synchronize rate budgets across serverless instances, with automatic fail-open in-memory fallback.
- **Flight Modification Fee Split**: Added explicit tracking and validation for customer `changeFee` vs. airline cost `airlineFee` with net profit calculation in `enrichTicketFinancials`.
- **Dark Mode HTML Integrity**: Added dark mode theme persistence and DOM integrity verification test suite.
- **Comprehensive Linting & Type Safety**: Updated ESLint to v10 with zero warnings across frontend and backend.

### Security
- **Strict Content Security Policy (CSP)**: Hardened Helmet headers with whitelist domains, Frame-Options DENY, and HSTS preload.
- **Path Traversal & Dotfile Protection**: Enhanced `validatePath` middleware preventing path traversal and blocking access to sensitive dotfiles.
- **Atomic Refresh Token Rotation**: Implemented token reuse family detection revoking all active sessions upon replay detection.
- **In-Memory Access Token Storage**: Enforced strict in-memory token storage on frontend to eliminate XSS token theft via `localStorage`.

### Fixed
- Fixed required `title` field validation across test user creation fixtures.
- Fixed responsive ticket link locators and deletion container selectors in Playwright E2E.
- Resolved Prisma unique constraint error mapping for passport, pnr, and email duplicates.

---

## [2.4.0] - 2026-08-20

### Added
- **Airlines Catalog**: Integrated comprehensive airline directory (`frontend/js/data/airlines.js` and `backend/src/constants/airlines.js`) with IATA codes, logos, and flight number prefix formatting.
- **Gemini AI Ticket Extraction**: Integrated Google Gemini API for automatic passenger details, flight numbers, and PNR extraction from uploaded PDFs and images.
- **Mobile Responsive Search**: Mobile bottom-nav bar with instant search overlay and quick action drawer for field agents.
- **PWA Capabilities**: Service Worker with stale-while-revalidate caching for app shell and Web App Manifest supporting installability.

---

## [2.3.0] - 2026-07-15

### Added
- **Expenses Management**: Added expense tracking for agency operational expenditures with categorized filtering (`SERVICES`, `TRANSFERS`).
- **Employee Lifecycle**: Full employee management with role assignments (`ADMIN`, `AGENT`, `TICKET_ONLY`), status toggles (`ACTIVE`, `INACTIVE`), and secure password resets.
- **Purge & Permanent Deletion Controls**: Added role-restricted purge mechanisms for soft-deleted customer and ticket records.

### Changed
- Refactored ticket ledger balances to use `decimal.js` ensuring floating-point precision in all financial math.

---

## [2.2.0] - 2026-06-10

### Added
- **Passport Document Storage**: Integrated Supabase Storage private bucket for uploading, previewing, and securing customer passport documents.
- **Magic Byte Validation**: Server-side file validation enforcing genuine JPEG, PNG, and PDF payloads regardless of file extension.
- **Customer Merge & History**: Detailed customer profiles with associated booking history, payment summaries, and customer notes.

---

## [2.1.0] - 2026-05-01

### Added
- **Audit Logging**: Comprehensive activity tracking recording user, IP, User-Agent, action type, and JSON metadata.
- **Bilingual Internationalization (i18n)**: Full Arabic and English localization with automatic RTL/LTR document layout direction switching.
- **Boot Splash Screen**: Elegant branded 4-step initialization loader displaying live connection and session verification progress.

---

## [2.0.0] - 2026-03-15

### Added
- **PostgreSQL & Prisma Migration**: Migrated data store to PostgreSQL 16 managed by Prisma ORM with connection pooling support.
- **Modular Architecture**: Restructured codebase into domain layers (`backend/src/domain`, `frontend/js/domain`), distinct service modules, and unified error classes.
- **Docker Compose Setup**: Multi-stage containerized environment for application and PostgreSQL database with automated health checks.

---

## [1.0.0] - 2026-01-10

### Added
- Initial release of AfricaTravel Operations Platform.
- Core airline ticket booking and customer management.
- Basic payment records and invoice tracking.
- Role-based access control and session management.
