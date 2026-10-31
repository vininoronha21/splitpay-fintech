# 015 Quality Pass — Spec

Stories: none; maintenance after `commit v4.0` | Status: done (approved by Vinicius, 2026-10-31: "faça o ajuste do 2 e uma auditoria geral"; closing audits PASS)

## Problem

The 014 audit noted (n1) that buttons using `aria-disabled` while a form saves fade to 50% opacity, which also fades the keyboard focus ring to about 2.1:1 in light mode. Vinicius asked for that fix and for a general audit of the whole app, split between frontend and backend, to catch remaining errors before the presentation.

## Acceptance Criteria

1. While saving, a keyboard-focused `aria-disabled` button stays fully opaque, so its focus ring keeps at least 3:1 in both themes. This covers `ui/Button` and the two hand-rolled buttons in `CategoryRulesCard.tsx` and `FriendsScreen.tsx`. Unfocused saving buttons keep the 50% look.
2. A frontend audit and a backend audit run in parallel over the whole codebase (not only the last diff). Each writes its findings, ranked by severity with evidence, to `docs/specs/015-quality-pass/audit-frontend.md` and `audit-backend.md`.
3. Every blocker, major and minor finding is fixed in this feature, or recorded with a reason in `docs/context.md` Open Questions. Informational notes are listed and left as they are.
4. After the fixes, `npm run build` passes, `pytest` passes, and the closing checks of both audits say PASS with nothing open.

## Out of Scope

- New features, deploy, and anything listed as out of scope in `goal.md`.
- Business Rule 21: the visual-only PWA stays as it is.
