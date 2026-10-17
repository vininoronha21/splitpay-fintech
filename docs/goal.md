# Goal

## Purpose

Build a demonstrable MVP of a personal-finance fintech whose differentiator is **shared expense splitting**. It is an academic project (FIAP, class 1TDSOE). It must be presentable, built within a strict 1-month timeframe, and easy to explain. It must cover the core software concepts (database, backend, API, frontend, deploy) **without over-engineering**.

## Epic

Smart shared-expense management and cash-flow automation: one place for balance, expenses, splits and reimbursements, with automatic categorization and notes, so the user always knows what they owe and what they are owed.

## User Stories (source: `docs/assets/USER-STORIES.pdf`)

Priority order is fixed by the backlog matrix.

| # | Story | Acceptance criteria |
|---|-------|---------------------|
| 1 | **US05 Balance integrity** — set an initial balance and adjust inflows/outflows | Balance = initial + inflows − outflows + manual adjustments. A manual adjustment requires a short reason and is kept in history. Initial balance rejects non-numeric and negative values. |
| 2 | **US01 Social split (1-to-1)** — log an expense, tag a friend, compute shares | Total amount split with exactly one person (1-to-1). Split modes: equal, percentage or fixed amount. Only the user's own share counts against the monthly budget. Example: R$ 100.00 split with 1 friend = R$ 50.00 each. |
| 3 | **US02 Category automation** — suggest a category from keywords | "Janta" suggests "Alimentação". "Combustível" suggests "Transporte". The user can create rules (e.g. "Uber" → "Transporte"). |
| 4 | **US03 Notes and reimbursement tracking** — notes and status tags per expense | A transaction opens a detail view: place, amount, installment, payment method, notes and the single person involved. Transactions can be filtered by status tag (e.g. "Aguardando Reembolso"). |
| 5 | **US04 Interactive charts** — pie and bar charts by category and person | Filter by period (weekly, monthly, yearly). Clicking a category expands the items behind its value. An empty period shows "Nenhum dado encontrado". |

## Success Criteria

- Every acceptance criterion above passes through the real API, backed by automated tests.
- Money is always exact. No float rounding drift, and split shares always sum to the total.
- The MVP is delivered within the 1-month deadline.
- The frontend is built with React and TypeScript, deployed on Vercel. The API is on Render; the public Swagger UI (`/docs`) opens.
- **The design is strictly mobile-first, closely resembling a native mobile banking app. It will be configured as a PWA (Progressive Web App) so users can install it on their phones.**
- Each technical decision can be explained in one or two sentences during the presentation.
- The final UI is polished, responsive, and does not look like a generic template.

## Phases

1. **Backend**: SQLite schema and seed, FastAPI endpoints, validation, tests, security, and mock-data consistency.
2. **Frontend**: React + TypeScript API integration, state handling, fake login, and UX/UI polish.
3. **Deploy and presentation**: Vercel + Render setup, final verification, and presentation notes.

## Out of Scope

Real authentication (passwords, JWT, OAuth), multi-person/group splits (deferred to future roadmap), ORM, migrations framework, Docker, real banking/Pix/payments, notifications, cloud infrastructure beyond free tiers, microservices.
