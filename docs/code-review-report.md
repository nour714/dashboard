# Website Code Review Report

**Review date:** 2026-09-28  
**Repository:** AfricaTravel  
**Review type:** Read-only application and code review

## Executive summary

The application has strong foundations: its API uses authentication and role checks, request schemas, a centralized error handler, and a dedicated financial ledger; its existing automated suite passes. I found two material risks in the spreadsheet import path:

1. The application parses uploaded workbooks with `xlsx@0.18.5`, a version covered by high-severity SheetJS advisories for ReDoS and prototype pollution. The package reads user-supplied workbooks on an authenticated API path.
2. Bulk uploads are buffered wholly in memory, with up to 50 files at 25 MB each and up to 10 concurrent uploads per process. This permits very large memory allocations and can make the service unavailable under load.

These findings merit remediation before treating the upload feature as hardened for hostile inputs. I did not modify application code during this review.

## Findings

### High — Vulnerable spreadsheet parser processes uploaded files

**Locations:** [package.json](../package.json) (`xlsx` dependency), [bulk-ticket-parser.service.js](../backend/src/services/bulk-ticket-parser.service.js:178), [ticket.routes.js](../backend/src/routes/ticket.routes.js:108)

The project specifies `xlsx` as `^0.18.5`, and the installed version is `0.18.5`. The bulk-import service passes uploaded workbook buffers to `XLSX.read()`. The import endpoint is authenticated and available to `ADMIN`, `AGENT`, and `TICKET_ONLY` users.

GitHub's advisories list versions below 0.20.2 as affected by a high-severity regular-expression denial of service, and versions through 0.19.2 as affected by prototype pollution when reading specially crafted files. The npm package has no patched release; the advisory points to the vendor's separately distributed patched release. The current semver range cannot resolve to those patched versions. [ReDoS advisory](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9) · [Prototype-pollution advisory](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6)

**Impact:** A malicious workbook supplied by an authenticated user could exploit parser behavior, including consuming excessive CPU. Prototype pollution impact depends on how parsed objects are used downstream; I did not establish a concrete application-level integrity exploit in this review.

**Recommended action:** Replace the npm-resolved package with a maintained parser or pin a vendor-patched SheetJS release from its official distribution. Keep arbitrary workbook parsing isolated and resource-limited, and add regression coverage for hostile workbook inputs.

### High — Bulk import permits excessive per-process memory use

**Locations:** [upload.js](../backend/src/middleware/upload.js:189), [ticket.routes.js](../backend/src/routes/ticket.routes.js:108)

Multer uses `memoryStorage()` with a 25 MB per-file limit and accepts up to 50 files on the bulk-import route. The upload concurrency budget allows 10 simultaneous requests per process. The configured limits therefore permit up to **1.25 GB of file buffers for one request** and **12.5 GB across ten concurrent requests**, before accounting for parser allocations, request overhead, or the rest of the application. The concurrency counter is process-local, so it does not impose a shared cap across multiple serverless instances.

**Impact:** An authenticated user, or a set of users, can cause high memory pressure or process termination by sending large allowed uploads. The parser may allocate additional memory while decoding workbook contents.

**Recommended action:** Set a much lower aggregate request-size and file-count limit, stream to bounded temporary storage where practical, reject files based on verified content, and enforce a distributed upload/concurrency budget in deployments with multiple instances. Treat decompressed workbook size and parsing time as separate limits from compressed upload size.

## Additional observations

- `npm audit --omit=dev --json` reported four high-severity dependency advisories in the installed dependency tree: two for `xlsx`, and a `deepmerge-ts` advisory through Prisma tooling. The `deepmerge-ts` issue concerns merging recursive object graphs; I did not find a path from untrusted application requests into Prisma's configuration merge logic, so I have not rated it as an application vulnerability. Review it when upgrading the Prisma CLI/toolchain.
- [hotels.js](../frontend/js/pages/hotels.js:2199) assigns an editable phone value to `innerHTML`. This is an unsafe DOM sink and should use `textContent` or a DOM node. During this review I confirmed the value can be entered into the current user's own quick-edit form; I did not establish a cross-user stored-XSS path, so this is recorded as a hardening item rather than a confirmed exploitable finding.
- Lint completed without errors and reported five unused-variable warnings in `visa.controller.js`, `hotels.js`, `visa-details.js`, and `ticket-service.js`.
- Prisma warns that `package.json#prisma` is deprecated and will be removed in Prisma 7; migrate this configuration to a Prisma config file as part of a future toolchain upgrade.

## Review coverage

Reviewed project guidance and architecture/deployment/security documentation; server and serverless entry points; Express middleware and route composition; authentication, authorization, validation, uploads, and error handling; representative ticket/customer/financial services and schemas; Prisma models and migration layout; frontend API/session handling, routing, service worker behavior, and HTML rendering sinks; dependency metadata; and repository ignore/tracking configuration. Local `.env` files were not read or included in output.

This was a source review, not a production penetration test. It did not exercise a live deployment, a production database, external AI or storage integrations, browser accessibility, or every role-specific workflow manually. Automated tests and static checks can miss defects outside their exercised cases.

## Checks run

- `npm test` — **passed**, 45 passed, 0 failed (54.39 seconds).
- `npm run lint` — **passed with warnings**, 0 errors and 5 unused-variable warnings.
- `npx prisma validate --schema=database/prisma/schema.prisma` — **passed**, schema is valid. Prisma also emitted the deprecation warning noted above.
- `npm audit --omit=dev --json` — reported four high-severity findings in the installed dependency graph; see the findings and additional observations.
