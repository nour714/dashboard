# AfricaTravel — Travel Agency Operations Platform

**AfricaTravel** is a modern, high-efficiency internal travel agency management frontend application built from scratch with pure **HTML5**, **CSS3 (Custom Properties & Design Tokens)**, and **Vanilla JavaScript (ES Modules)**.

It provides complete lifecycle management for flight ticketing, financial payment ledgers, flight itinerary modifications, refund processing, CRM customer profiles, business intelligence reporting, employee administration, and workspace audit trails.

> [!NOTE]
> **Authentication Notice**: Authentication is currently mocked for frontend development and will be replaced by the backend authentication API.

---

## 1. Technology Architecture

* **Language & Runtime**: HTML5, CSS3, Vanilla JavaScript (ES2022+ Modules)
* **Design System**: Strict CSS Custom Properties (`styles/tokens.css`, `styles/base.css`, `styles/layout.css`, `styles/components.css`, `styles/utilities.css`, `styles/responsive.css`)
* **Typography**: Google Fonts — **Geist** (Headings, Labels, Tabular Figures) & **Inter** (Body text)
* **Color Palette**: Primary Structural Navy `#0F172A`, Sidebar `#131B2E`, Background `#F7F9FB`, Surface `#FFFFFF`, Accent Blue `#2563EB`, Success `#15803D`, Warning `#D97706`, Danger `#DC2626`
* **Routing & Guards**: Pure client-side SPA History API router (`js/router/router.js`) supporting dynamic parameters (`/tickets/:id`), query strings (`/tickets?q=...`), strict authentication route guards, and 404 state.
* **State Management**: Reactive state store (`js/state/store.js`) with pub/sub subscriptions, automatic audit logging, mutation boundary validation (`applyPayment`, `applyRefund`, `applyModification`, `createTicket`), and `localStorage` state persistence.
* **Security & Safe DOM**: Centralized sanitization (`js/utils/security.js`) and safe DOM node rendering utilities (`js/utils/dom.js`) preventing XSS vulnerabilities on all dynamic data.
* **No Framework Dependencies**: 0% React, 0% Vue, 0% Angular, 0% Tailwind, 0% Bootstrap, 0% jQuery.

---

## 2. Directory Structure

```
africatravel/
├── index.html                  # HTML5 SPA Entry Shell
├── package.json                # Project manifest (ESM)
├── server.js                   # Lightweight static & SPA HTTP server
├── README.md                   # Full system documentation
├── styles/
│   ├── tokens.css              # Design tokens (colors, typography, spacing, radius, shadows)
│   ├── base.css                # CSS reset, typography, base styles, tabular numbers
│   ├── layout.css              # App shell, fixed sidebar, topbar, mobile bottom nav
│   ├── components.css          # Buttons, forms, badges, stat cards, tables, modals, tabs
│   ├── utilities.css           # Utility classes (flex, grid, spacing, alignments, login)
│   └── responsive.css          # Tablet (1024/768px) and mobile (430/390/320px) rules
├── test/
│   └── business-flow.test.js   # Automated business domain rule & security regression tests
└── js/
    ├── app.js                  # Application bootstrap and global event coordinator
    ├── domain/                 # Domain business rules and validation errors
    │   ├── errors.js           # AppError, ValidationError, BusinessRuleError, NotFoundError
    │   ├── ticket-rules.js     # Accounting calculations and status transitions
    │   ├── payment-rules.js    # Payment validation (balance bounds)
    │   ├── refund-rules.js     # Refund validation (available refund bounds)
    │   └── modification-rules.js # Modification validation (fee and schedule chronology)
    ├── utils/
    │   ├── calculations.js     # Centralized financial math and currency/date formatters
    │   ├── dom.js              # Safe DOM creation helpers (createElement, setText, appendChildren)
    │   └── security.js         # HTML escaping and text sanitization (escapeHtml, sanitizeText)
    ├── data/
    │   └── mock-data.js        # Rich dataset (EgyptAir, Emirates, Qatar Airways, etc.)
    ├── state/
    │   └── store.js            # Reactive state store with validated mutation boundary
    ├── services/
    │   ├── auth-service.js     # Isolated mock authentication service boundary
    │   ├── ticket-service.js   # Ticket, payment, modification, and refund service
    │   ├── customer-service.js # Customer CRM statistics and profiles
    │   └── report-service.js   # Analytics KPIs, dynamic calculation vs mock fallback boundary
    ├── router/
    │   ├── router.js           # Client-side History API router with route guards
    │   └── routes.js           # Route-to-page module registry
    ├── components/
    │   ├── icons.js            # SVG icon dictionary
    │   ├── status-badge.js     # Accessible status pill renderer
    │   ├── stat-card.js        # KPI card generator with trend indicators
    │   ├── page-header.js      # Page header with breadcrumbs and actions
    │   ├── modal.js            # Desktop modal & mobile bottom-sheet manager
    │   ├── tabs.js             # Tab headers and pane switching binder
    │   ├── toast.js            # Toast notification controller
    │   ├── empty-state.js      # Empty state markup generator
    │   ├── sidebar.js          # Desktop/tablet navigation sidebar
    │   ├── topbar.js           # Topbar with global search and user profile
    │   └── bottom-nav.js       # Mobile bottom navigation & More drawer
    └── pages/
        ├── login.js            # Split-view desktop / clean mobile login
        ├── dashboard.js        # Operations dashboard with KPIs, tickets, activity
        ├── tickets.js          # Ticket management with search, filters, cards/table
        ├── ticket-create.js    # Multi-section ticket creation with live balance summary
        ├── ticket-details.js   # Ticket details dossier
        ├── ticket-details/     # Modular tabs and action modal controllers
        ├── payments.js         # Payments ledger and transaction history
        ├── refunds.js          # Refund requests with available balance validation
        ├── customers.js        # Customer CRM list and search
        ├── customer-details.js # Customer profile with lifetime stats and ticket history
        ├── reports.js          # Business intelligence analytics and charts
        ├── employees.js        # Staff roster with role/status filters and invite modal
        ├── activity.js         # Workspace audit trail with multi-filter query
        └── settings.js         # Workspace settings (Profile, Company, Security, Currency)
```

---

## 3. Business Rules & Mutation Boundary

The safe data flow is strictly enforced:
$$\text{UI} \longrightarrow \text{Service Layer} \longrightarrow \text{Domain Validation} \longrightarrow \text{Store Mutation}$$

* **Payment Rule**: `amount > 0` and `amount <= remaining balance`. Violations return `"Payment exceeds the remaining balance."`
* **Refund Rule**: `amount > 0` and `amount <= available refund (totalPaid - totalRefunded)`. Violations return `"Refund exceeds the available refundable amount."`
* **Modification Rule**: `changeFee >= 0` and `arrivalDate >= departureDate`.
* **Report Separation**: Clear separation between `mockReportData` (demo baseline fallback) and `buildReportFromTickets` (dynamically calculated from state).

---

## 4. Running and Testing the Application

### Start Local Server
```bash
npm start
# or node server.js
```
Open your browser at `http://localhost:3000`.

### Run Automated Tests
```bash
npm test
```
