# Repository Structure

This is the target layout for the 1-month MVP. Any path not listed here needs justification (see "Change Rules").

## Tree

```text
.
├── CLAUDE.md                     # Agent entry point: reading order, scope restrictions, and rules
├── README.md                     # Human entry point: what it is, how to run, live URLs
├── .gitignore
├── .claude/
│   ├── agents/                   # One file per agent role, with name/description frontmatter (see CLAUDE.md)
│   └── skills/                   # One folder per skill: SKILL.md plus optional references/ (e.g. splitpay-design-language)
├── docs/
│   ├── goal.md                   # Purpose, user stories (1-to-1 splits), success criteria, out-of-scope items
│   ├── context.md                # Current state, stack (TS, GSAP, SQLite ephemeral), decisions
│   ├── development/
│   │   ├── repository-structure.md
│   │   ├── sdd-guide.md          # Workflow to prevent scope creep
│   │   └── git-workflow.md       # Branch flow: feature/mvp-plan → dev → main
│   ├── specs/
│   │   ├── TEMPLATE/             # Standard templates for SDD (spec.md, plan.md, tasks.md, audit.md)
│   │   └── NNN-<feature>/        # One folder per feature, numbered in order
│   │       ├── spec.md           # What and why (approved by the user)
│   │       ├── plan.md           # How: files, decisions, risks
│   │       ├── tasks.md          # Ordered, verifiable tasks with owners
│   │       └── audit.md          # Auditor report(s) and final verdict
│   ├── presentation/             # Phase 3: talking points, diagrams, demo script
│   └── assets/                   # Reference material (Figma screenshots, UI ideas, approved prototype-*.png captures)
├── backend/
│   ├── app/
│   │   ├── main.py               # App factory: CORS, routers, error handlers, startup DB init
│   │   ├── config.py             # Settings read from environment variables
│   │   ├── db.py                 # sqlite3 connection, PRAGMA foreign_keys, schema + seed load (ephemeral)
│   │   ├── text.py               # Invisible-character trim, normalize_text, words (shared by schemas and services)
│   │   ├── schemas/              # Pydantic request/response models (the API contract), one module per domain
│   │   │   ├── common.py         # Money and id types, ErrorResponse, visible-text types
│   │   │   ├── balance.py
│   │   │   ├── friends.py
│   │   │   ├── transactions.py
│   │   │   ├── categories.py
│   │   │   ├── reimbursements.py
│   │   │   └── dashboard.py
│   │   ├── services/             # Business rules and SQL, one module per domain
│   │   │   ├── __init__.py       # DomainError (mapped to 4xx by main.py) and brasilia_today()
│   │   │   ├── balance.py        # Balance, adjustments, budget usage and the profile (initial balance)
│   │   │   ├── friends.py        # Friends list and add (accent/case-insensitive duplicates)
│   │   │   ├── transactions.py   # Includes strictly 1-to-1 split calculation
│   │   │   ├── reimbursements.py # Settle a share (pago/acertado), list and "a receber" summary
│   │   │   ├── categories.py     # Category list, keyword suggestion, user rules
│   │   │   └── dashboard.py      # Chart periods (Monday weeks) and totals by category and person
│   │   └── routers/              # HTTP only: parse, call service, return schema
│   │       ├── health.py
│   │       ├── profile.py
│   │       ├── friends.py
│   │       ├── dashboard.py      # /dashboard/charts
│   │       ├── transactions.py
│   │       ├── reimbursements.py
│   │       ├── categories.py
│   │       └── balance.py        # /balance, /balance/adjustments and /budget
│   ├── sql/
│   │   ├── schema.sql            # Tables, PK/FK, CHECK and NOT NULL constraints
│   │   ├── seed.sql              # pt-BR mock data, internally consistent
│   │   └── checks.sql            # Consistency queries; returns zero rows when data is valid
│   ├── tests/
│   │   ├── __init__.py           # Lets `pytest` put backend/ on sys.path
│   │   ├── conftest.py           # Fresh database and TestClient per test, parallel-request helper
│   │   └── test_<domain>.py
│   ├── requirements.txt          # Pinned versions
│   └── .env.example
└── frontend/                     # React + Vite + TypeScript SPA
    ├── index.html
    ├── package.json
    ├── package-lock.json         # Exact dependency tree (pinned versions)
    ├── tsconfig.json             # TypeScript configuration
    ├── tsconfig.node.json
    ├── vite.config.ts            # React + Tailwind 4 (@tailwindcss/vite plugin, no PostCSS config)
    ├── .env.example              # VITE_API_URL
    ├── public/
    │   └── favicon.svg           # The logo (Vite serves public/ as-is at the site root)
    └── src/
        ├── main.tsx
        ├── vite-env.d.ts         # Types for import.meta.env (VITE_API_URL)
        ├── app/
        │   ├── App.tsx
        │   ├── routes.tsx
        │   ├── landing/          # Public landing page at /, lazy-loaded as its own chunk; the only folder that imports GSAP
        │   └── components/       # Screens, the app shell and shared pieces (BrandMark, Money, HeroBackdrop, ...)
        │       └── ui/           # Reusable primitives: Button, TextField, TextArea, MoneyField, Card, states
        ├── services/
        │   └── api.ts            # The only module that calls fetch()
        ├── types/                # Shared TypeScript interfaces (API contracts)
        ├── lib/                  # Small shared helpers: money.ts (formatBRL, parseBRL), storage.ts, preferences.ts (theme, hide values), userName.ts (fake-login name), text.ts (invisible-character trim, graphemes), dates.ts (Brasília day and period labels), charts.ts (percentages, category colors), useResource.ts (one API call with loading, error and retry), transactionForm.ts (new transaction validation, split preview, payload), statement.ts (statement join, status filter, totals, settle update, detail labels), settings.ts (balance adjustment, category rule and friend name validation)
        └── styles/               # Theme tokens (light default, dark override) and Tailwind config
```

## Layer Rules

- **Backend has exactly two layers:** `routers/` (HTTP) and `services/` (rules + SQL). No repositories, DAOs, ORMs, dependency-injection containers or base classes. Why: two layers already separate HTTP from business logic, and anything more is ceremony at this MVP size.
- Routers never contain SQL or business rules. Services never import FastAPI's `Request` or `Response`.
- Split math is written as pure functions, testable without a database, and strictly respects the 1-to-1 logic.
- **Frontend:** screens never call `fetch` directly; they go through `services/api.ts`.
- **TypeScript:** Frontend must define and use strict interfaces (in `src/types/`) that mirror the backend's Pydantic schemas. No `any` types for API payloads.
- No global state library. Local state plus a small fetch hook is enough; app-wide preferences (theme, hide values) live in `lib/preferences.ts` on `useSyncExternalStore`.
- **Motion:** `gsap` 3.15.0 and `@gsap/react` 2.1.2 (spec 013) are imported only from `app/landing/`, so app screens never download them. App screens use CSS transitions.
- `docs/specs/` is the only home for specs, plans, tasks and audits.

## Change Rules

1. A new file goes into an existing directory with the same purpose. If none fits, propose the new path in the feature's `plan.md` with a one-line reason.
2. A new directory, layer, or top-level config needs user approval plus an update to this document in the same commit.
3. A new dependency needs: the problem it solves, why stdlib or an existing dependency is not enough, and a pinned version.
4. When a file grows past about 300 lines or takes on a second responsibility, split it by responsibility, not by technical type.
5. Never create speculative structure (empty folders, "future" modules, interfaces with a single implementation).
