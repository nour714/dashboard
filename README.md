# VoyageDesk — Travel Agency Operations Platform

**VoyageDesk** is a modern, high-efficiency internal travel agency management frontend application built from scratch with pure **HTML5**, **CSS3 (Custom Properties & Design Tokens)**, and **Vanilla JavaScript (ES Modules)**.

It provides complete lifecycle management for flight ticketing, financial payment ledgers, flight itinerary modifications, refund processing, CRM customer profiles, business intelligence reporting, employee administration, and workspace audit trails.

---

## 1. Technology Architecture

* **Language & Runtime**: HTML5, CSS3, Vanilla JavaScript (ES2022+ Modules)
* **Design System**: Strict CSS Custom Properties (`styles/tokens.css`, `styles/base.css`, `styles/layout.css`, `styles/components.css`, `styles/utilities.css`, `styles/responsive.css`)
* **Typography**: Google Fonts — **Geist** (Headings, Labels, Tabular Figures) & **Inter** (Body text)
* **Color Palette**: Primary Structural Navy `#0F172A`, Sidebar `#131B2E`, Background `#F7F9FB`, Surface `#FFFFFF`, Accent Blue `#2563EB`, Success `#15803D`, Warning `#D97706`, Danger `#DC2626`
* **Routing**: Pure client-side SPA History API router (`js/router/router.js`) supporting dynamic parameters (`/tickets/:id`), query strings (`/tickets?q=...`), route guards, and 404 state.
* **State Management**: Reactive state store (`js/state/store.js`) with pub/sub subscriptions, automatic audit logging, and `localStorage` state persistence.
* **No Framework Dependencies**: 0% React, 0% Vue, 0% Angular, 0% Tailwind, 0% Bootstrap, 0% jQuery.

---

## 2. Directory Structure

```
voyagedesk_app/
├── index.html                  # HTML5 SPA Entry Shell
├── package.json                # Project manifest (ESM)
├── server.js                   # Lightweight static & SPA HTTP server
├── README.md                   # Full system documentation
├── VOYAGEDESK_DESIGN_HANDOFF.md# Original design specification
├── STITCH_DESIGN_SOURCE.md     # Reference design tokens
├── design-references/          # 32 UI visual reference screenshots
├── styles/
│   ├── tokens.css              # Design tokens (colors, typography, spacing, radius, shadows)
│   ├── base.css                # CSS reset, typography, base styles, tabular numbers
│   ├── layout.css              # App shell, fixed sidebar, topbar, mobile bottom nav
│   ├── components.css          # Buttons, forms, badges, stat cards, tables, modals, tabs
│   ├── utilities.css           # Utility classes (flex, grid, spacing, alignments, login)
│   └── responsive.css          # Tablet (1024/768px) and mobile (430/390/320px) rules
└── js/
    ├── app.js                  # Application bootstrap and global event coordinator
    ├── utils/
    │   └── calculations.js     # Centralized financial math and currency/date formatters
    ├── data/
    │   └── mock-data.js        # Rich dataset (EgyptAir, Emirates, Qatar Airways, etc.)
    ├── state/
    │   └── store.js            # Reactive state store with action dispatchers & persistence
    ├── services/
    │   ├── ticket-service.js   # Ticket querying, filtering, and aggregation
    │   ├── customer-service.js # Customer CRM statistics and profiles
    │   └── report-service.js   # Analytics KPIs, monthly sales, and leaderboard data
    ├── router/
    │   ├── router.js           # Client-side History API router
    │   └── routes.js           # Route-to-page module registry
    ├── components/
    │   ├── icons.js            # Feather-inspired SVG icon dictionary
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
        ├── ticket-details.js   # Core ticket view (Overview, Payments, Modifications, Refunds)
        ├── payments.js         # Payments ledger and transaction history
        ├── refunds.js          # Refund requests and maximum available limit validation
        ├── customers.js        # Customer CRM list and search
        ├── customer-details.js # Customer profile with lifetime stats and ticket history
        ├── reports.js          # Business intelligence analytics and charts
        ├── employees.js        # Staff roster with role/status filters and invite modal
        ├── activity.js         # Workspace audit trail with multi-filter query
        └── settings.js         # Workspace settings (Profile, Company, Security, Currency)
```

---

## 3. Implemented Routes & Navigation

| Route | Page Module | Description |
| :--- | :--- | :--- |
| `/login` | `LoginPage` | Split-view desktop / clean mobile login with demo credentials |
| `/dashboard` | `DashboardPage` | Executive operations overview with 4 KPI cards, recent tickets, flights, and activity |
| `/tickets` | `TicketsPage` | Ticket list with live search, status pills, airline filter, date filter, desktop table & mobile cards |
| `/tickets/new` | `TicketCreatePage` | 4-section ticket creation form with live transaction balance preview |
| `/tickets/:id` | `TicketDetailsPage` | Complete ticket dossier with Financial Ledger banner, itinerary, passenger details, and 5 interactive tabs |
| `/customers` | `CustomersPage` | CRM customer directory with search and VIP indicators |
| `/customers/:id` | `CustomerDetailsPage`| Deep customer profile with lifetime travel stats, ticket ledger, and notes |
| `/payments` | `PaymentsPage` | Global payments ledger with financial summary and Add Payment modal |
| `/refunds` | `RefundsPage` | Refund claims management with available balance enforcement |
| `/reports` | `ReportsPage` | Analytics with monthly sales bar charts, refund area charts, and leaderboards |
| `/employees` | `EmployeesPage` | Team member roster with role/status filters and Invite Employee modal |
| `/activity` | `ActivityPage` | Workspace audit trail filtering by action type, employee, and ticket |
| `/settings` | `SettingsPage` | Workspace settings (Profile, Security, Company, Currency) |

---

## 4. Centralized Financial Calculations

All financial values are strictly computed via `js/utils/calculations.js` and never manually entered or duplicated:

* `totalPaid = SUM(payments.amount)`
* `remaining = ticketPrice - totalPaid`
* `totalRefunded = SUM(refunds.amount)`
* `availableRefund = totalPaid - totalRefunded`
* `netValue = ticketPrice + totalModificationFees - totalRefunded`
* `status = derivePaymentStatus(ticketPrice, totalPaid, baseStatus)`

---

## 5. Running the Application

### Prerequisites
* Node.js v18+ (no build step or `npm install` needed!)

### Start Local Server
```bash
node server.js
```
Open your browser at:
```
http://localhost:3000
```
Default demo credentials are prefilled (`admin@voyagedesk.com` / `password123`).

---

## 6. Responsive Design Coverage

The application is engineered with custom responsive layouts across all standard viewports:
* **Desktop (1440px / 1280px)**: 260px fixed navy sidebar, multi-column grids, data tables.
* **Tablet (1024px / 768px)**: Collapsed icon sidebar, reflowed stat cards, responsive tables.
* **Mobile (430px / 390px / 320px)**: Fixed bottom navigation with 4 key actions, bottom "More" drawer, tables converted to touch-friendly cards, modals converted to bottom sheets, 44px+ touch targets.
