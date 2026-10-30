# SplitPay — Project Context

Read with `goal.md`. This file records the current state, the stack, the decisions already made, and the open questions for the 1-month MVP.

## Language Policy

- All `.md` files, code, identifiers and commit messages: **en-US**.
- User-facing UI text and seed data (names, categories, descriptions): **pt-BR**.

## Current State of the Repository

- Phase 1 (API) complete: 001 restructure, 002 database, 003 balance, 004 split, 005 categories, 006 reimbursements, 007 dashboard. Phase 2 (frontend) in progress.
- Phase 2 started: 008 app shell delivered the fake login at `/entrar`, the tab bar and top nav, light and dark themes, hide values, the typed API client and shared UI primitives. 009 delivered Início and Gastos do mês (balance, budget, a receber, category donut with expandable items, friend shares, period filters). 010 delivered Novo gasto and Receita (category suggestion, 1-to-1 split with live preview, inline new friend, details). 011 delivered Extrato (all transactions, status chips, a receber and já recebido, Recebi and Já acertamos with inline confirmation) and the transaction detail view (US03). 012 delivered Configurações (balance adjustment with reason and history, read-only budget, category rules) and Amigos (add friend, a receber per friend). 013 delivered the public landing page at `/` (dark hero with a sample preview, the five stories as features, Como funciona, GSAP motion with a reduced-motion path). 014 delivered the visual-only PWA for the prototype (Business Rule 21): web app manifest, home screen icons, iOS meta, an offline banner and a disabled "Instalar" card in Configurações; no service worker.
- Agents are in `.claude/agents/`; reference material (`tela_*.png`, `USER-STORIES.pdf`) is in `docs/assets/`. The visual identity is light by default with an amber accent and an optional dark theme, approved in the prototype (`docs/assets/prototype-*.png`).
- The reference screens are **visual inspiration only**. They show group splits, an "Em Atraso" status and "Lembrar" buttons, all of which are out of scope (see Business Rules 1 and 6).
- No linting and no CI.

## Architecture

```text
Browser ── Vercel (React + Vite + TypeScript SPA)
              │  HTTPS / JSON, base URL from VITE_API_URL
              ▼
           Render (FastAPI + Uvicorn)
              │  sqlite3 (stdlib), parameterized SQL
              ▼
           SQLite file, created from schema.sql + seed.sql at startup
```

## Stack and Decisions

| Area | Choice | Why |
| --- | --- | --- |
| API | Python 3.12+, FastAPI, Pydantic, Uvicorn | Real REST API with automatic validation and Swagger. Easy to explain. |
| Database | SQLite through stdlib `sqlite3`, raw SQL, no ORM | Shows real relational modeling, constraints and queries with zero infrastructure. |
| Schema | `schema.sql` (tables, PK/FK, `CHECK`, `NOT NULL`) + `seed.sql` | The model is readable and auditable as plain SQL. |
| Money | Integer **cents** (`INTEGER`), formatted to BRL only in the UI | No float error. Split shares sum exactly to the total. |
| Split rounding | Remainder cents go to the payer (the user) | Deterministic, and shares always sum to the total. |
| Persistence | DB rebuilt from seed on every start | Render's free disk is ephemeral. This is an accepted, explainable trade-off for a free-tier MVP. |
| Tests | Pytest + FastAPI `TestClient`, fresh DB per test | Acceptance criteria become executable. |
| Frontend | React/Vite with **TypeScript**, service layer `src/services/api.ts` | TS catches API contract errors early. One place handles API calls. |
| **Mobile Strategy** | **Mobile-first Web (Tailwind) + PWA** | **Avoids the overhead of Swift/React Native for a 1-month MVP. Provides a native-like banking app experience on mobile via browser installation.** |
| Fake login | Display name only, stored in `localStorage`; every visitor sees the same shared demo data | Personalization without the scope of real auth. The app is a public demo, not a per-user product. |
| Animation | GSAP on Landing Page and Phase 2 UI | Polished, dynamic, and interactive feel for the academic presentation. |
| Deploy | Vercel (web), Render Web Service (API, `/health` healthcheck) | Free tiers with git-based deploys. |
| Config | `VITE_API_URL` (web), `FRONTEND_ORIGIN` (API CORS allow-list) | No secrets exist in this MVP. CORS is restricted to the known origin. |

## Domain Model (initial, refined in the spec)

- `user_profile`: display name, initial balance, monthly budget (single user).
- `person`: friends the user can split with.
- `category` and `category_rule`: keyword → category.
- `transaction`: description, total, category, date, type (expense/income), place, installment number and total (display only), payment method, notes, split mode.
- `split_share`: transaction × person (strictly 1-to-1 for now), share amount, reimbursement status (`em_aberto` / `pago` / `acertado`) and `settled_at`, the Brasília timestamp of the settlement (null while open).
- `balance_adjustment`: signed delta in cents, reason, timestamp. Previous and new balance are computed when listing the history, never stored.

## Security Baseline (audited in phase 1)

- Parameterized SQL only; no string-built queries.
- Every input passes through Pydantic: positive amounts, bounded string lengths, enums for status and split mode, percentages that sum to 100, fixed shares that sum to the total.
- CORS allow-list from env; no wildcard in production.
- No stack traces or SQL in error responses. Errors use a consistent JSON shape.
- No secrets in the repo. `.env` is git-ignored and `.env.example` is committed.

## Data Consistency Checks (audited in phase 1)

- For every transaction, the sum of its split shares equals its total.
- Every foreign key resolves (`PRAGMA foreign_keys = ON`).
- Displayed balance equals initial balance + inflows − outflows + adjustments, recomputed from rows, never stored as a free-standing number.
- Budget usage counts only the user's own share.
- Seed dates cover the weekly, monthly and yearly filters, plus at least one empty period.

## Business Rules (approved 2026-10)

Each rule lists what was chosen, why, and the rejected alternative.

| # | Topic | Decision | Why | Rejected |
| --- | --- | --- | --- | --- |
| 1 | Reimbursement status | `em_aberto` (UI label "Aguardando Reembolso"), `pago`, `acertado`. `pago` enters the balance as an inflow; `acertado` closes the debt without changing the balance. | Matches the user stories, and the two closed states differ in a concrete way. | *pendente / atrasado / pago*: "atrasado" needs due dates. |
| 2 | Installment (US03) | Display-only `installment_number` / `installment_total` (e.g. "3/10"), with 1 ≤ number ≤ total. | The criterion only asks the detail view to show it. | Generating future transactions: cascading dates and edits. |
| 3 | Balance formula | `balance = initial + inflows − outflows + Σ adjustment deltas`. Adjustments store a signed delta and a required short reason. | One source of truth; the history still shows previous/new balance by computing it. | Storing the new balance: two values that can diverge. |
| 4 | Initial balance | The seed ships a ready profile, so the demo opens with data. The fake-login screen asks for a name and shows the initial balance prefilled; the visitor may change it there (validated: rejects non-numeric and negative values, zero allowed). After that, changes go only through manual adjustments. | Demonstrates the US05 validation without an empty first screen. | Empty onboarding: the demo would open with no data. Free editing in settings: rewrites history without a trace. |
| 5 | Balance vs. budget | The full amount the user paid leaves the balance; a share marked `pago` enters it; only the user's own share counts against the monthly budget. | Balance mirrors real money; budget mirrors real consumption. | Counting only the user's share in the balance: hides money actually spent. |
| 6 | Split participants | 1-to-1 only. The user always pays and splits with exactly ONE friend. Remainder cents go to the user. The MVP therefore shows only what friends owe the user ("a receber"), never what the user owes. `split_share` keeps one row per person, so group splits later relax a constraint instead of changing the model. | Greatly simplifies the MVP backend logic. | Multi-person groups: planned right after the MVP (backend, infra and design done). |
| 7 | Split input | Equal: friend share = floor(total / 2), user keeps the remainder. Percentage: the user types the **friend's** whole-number percentage (0–100); friend share = floor(total × pct / 100). Fixed: the user types the **friend's** amount in cents (0 < amount ≤ total). The user's share is always total − friend share. | One input in every mode, and shares sum to the total by construction. | Typing both shares and validating the sum: two inputs that can disagree. Decimal percentages (33.33%). |
| 8 | Category rules (US02) | Create and delete only (edit = delete + create); default rules cannot be deleted. Matching ignores case and accents and compares whole words ("bar" does not match "Barbearia"). User rules win over default ones; on a tie the longest keyword wins, then the oldest rule. | Covers the criterion with one form and a deterministic match. | Full CRUD: extra screen and endpoint with no demo value. |
| 9 | Chart periods (US04) | Calendar periods (current week, month, year) with previous/next navigation. Weeks run Monday to Sunday, so a weekend stays in one week. | Makes the empty-period state ("Nenhum dado encontrado") demonstrable. | Rolling windows ("last 7 days"): rarely empty with the seed. |
| 10 | Demo persistence | Keep rebuilding the DB from seed on every start. Before presenting, open `/health` to wake the API and run the demo in one sequence. | Predictable demo with zero infrastructure. Accepted free-tier ephemeral constraint. | Persistent database: outside the free tiers and the scope. |
| 11 | Friends | Seeded list plus "add friend" (name only). No edit or delete. The new-expense form selects exactly one friend. | Tagging a friend is the core of US01, and visitors may want their own names. | Full friend CRUD: no demo value. Checkbox multi-select from the reference screen: breaks 1-to-1. |
| 12 | Balance adjustment input | The user types the desired new balance and a reason (at least 10 characters). The API computes and stores the signed delta. | Matches the reference screen and keeps one source of truth (rule 3). | Typing the delta: easy to get the sign wrong. |
| 13 | Monthly budget | Fixed by the seed, shown on the dashboard. | No story asks to edit it. | Budget settings screen. |
| 14 | Income | A transaction can be an expense or an income (no split for income). Inflows = incomes + reimbursements marked `pago`. | US05 needs inflows to exist; one form with a type toggle covers it. | A separate income module. |
| 15 | Installments and amounts | A transaction's amount is what was paid now (the installment value); `3/10` is display-only (rule 2). | Budget and charts reflect this month's real money. | Storing the full purchase price and dividing it. |
| 16 | Charts (US04) | "Spending" is the user's own share (same as the budget). "By person" is the sum of each friend's shares in the period. | Charts and budget tell the same story. | Charting the full amount paid: double-counts what friends will repay. |
| 17 | Shared demo data | Every visitor reads and writes the same data; restarting the API restores the seed. | The project is a public demonstration. | Per-visitor data: needs real accounts, out of scope. |
| 18 | Time | Every date and timestamp is Brasília time, a fixed UTC−3 offset (`'now', '-3 hours'` in SQL). `created_at` uses `YYYY-MM-DD HH:MM:SS`; the API never sends it and relies on the column default (only the seed writes it explicitly). | Brazil has had no daylight saving time since 2019, and Render runs in UTC, so evening entries would otherwise land on the next day. | `'localtime'` (server is UTC); a timezone library for a fixed offset. |
| 19 | Adjustment history ordering | An income or expense dated on an adjustment's day counts toward it only if it was created no later than the adjustment; back-dated entries shift history, which shows the balance as of that date. | A same-day entry made after the adjustment must not change the balance the user typed. | Ordering by date only: the typed value changed after any same-day expense. |
| 20 | Settling a reimbursement | Marking a share `pago` or `acertado` records the moment of the request (`settled_at`); no date input, and closed states are final. A `pago` share counts toward an adjustment when settled no later than it. | The balance history stays explainable and a settlement can never be in the future or before its expense. | A settlement date field and reopening: each edit silently rewrites past balances. |
| 21 | Prototype scope (Vinicius, 2026-10-30) | SplitPay stays an unpublished prototype for now. PWA features that only work once published (service worker, real install, updates) are visual only: the install button shows but is disabled with a note. | The app is not going public yet, so working install and cache behavior would be untested surface. | Building the full PWA now: a dependency and caching rules for an app with no deploy. |

## Open Questions

Carried from audits; each is resolved in the named feature's spec:

- None open. Phase 2 specs add new ones here.
