# 011 Statement — Tasks

- [x] T1 — Statement logic and long date | owner: frontend-engineer | files: `src/lib/statement.ts`, `src/lib/dates.ts` | verify: `npm run build`; self-checks for join, filters, totals, settle and labels pass
- [x] T2 — Extrato and detail screens | owner: frontend-engineer | files: `StatementScreen.tsx`, `StatementSummary.tsx`, `StatusFilter.tsx`, `SettleActions.tsx`, `TransactionDetailScreen.tsx`, `TransactionRow.tsx`, `RecentTransactionsCard.tsx`, `MoreDetails.tsx`, `routes.tsx` | verify: build; settle changes the API balance as expected; layout scan clean
- [x] T3 — Visual review | owner: ui-ux-designer | files: components from T2 (polish only) | verify: matches prototype-statement in both themes; contrast and focus
- [x] T4 — Docs sync | owner: main session | files: `docs/development/repository-structure.md`, `docs/context.md` | verify: new lib file and 011 state recorded
- [ ] T5 — Audit | owner: auditor | files: `docs/specs/011-statement/audit.md` | verify: verdict PASS
