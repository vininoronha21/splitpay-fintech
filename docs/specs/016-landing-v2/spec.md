# 016 Landing v2 and User Menu — Spec

Stories: none; product polish after `commit v4.4` | Status: draft (requested by Vinicius, 2026-10-31)

## Problem

Vinicius asked for four changes after using the app:

1. The arrow in the landing CTA looks crooked (it is drawn rotated −30°).
2. Clicking the user (avatar or greeting) inside the app does nothing.
3. Every "projeto acadêmico" mention should go.
4. The landing page should be longer: present the features, why SplitPay is innovative and SplitPay as a startup proposal, with rich GSAP scroll and hover motion and animated screens.

## Acceptance Criteria

1. **Arrow.** The CTA arrow points straight right in every CTA instance.
2. **User menu.** Clicking the avatar in the desktop top nav, or the initials and greeting in the Início header on mobile, opens a small menu with two items:
   - "Trocar usuário": forgets the saved name and opens `/entrar` (same effect as "Sair" in Configurações; shared demo data is unchanged, Business Rule 17).
   - "Voltar para a página inicial": opens the landing page `/`.
   The menu is a disclosure button (`aria-expanded`, `aria-controls`), opens with Enter/Space, closes with Escape (focus returns to the trigger), on an outside click and after choosing an item. Items are keyboard reachable with a visible focus ring, at least 44 px tall, in both themes.
3. **No academic copy.** No UI text says "projeto acadêmico", "FIAP" or shows the graduation-cap pill (landing hero, landing footer, login screen). `rg -i "acad[eê]mic|FIAP" frontend/src frontend/index.html frontend/public` returns nothing. Docs and README keep their context.
4. **Longer landing.** The page keeps the hero and the way into the demo, and adds, in this order:
   1. **Funcionalidades**: one section per feature (split 1:1 in three modes, automatic categories, a receber and reimbursement status, saldo with adjustment history, charts by period), each with an animated product screen drawn in markup (no screenshots), built from the app's real components or faithful replicas.
   2. **Por que é diferente**: exact cents end to end, categories that learn from the user's own rules, the balance that only moves when money really comes back.
   3. **A startup**: mission, who it is for, business model proposal and roadmap (groups, Pix, open finance), clearly labeled as a proposal and next steps. No invented metrics, users, revenue, partners or testimonials.
   4. **Como funciona** (kept).
   No "problem" section and no final CTA section (Vinicius, 2026-10-31); the hero CTA and the top nav stay the way into the demo.
5. **Motion ("GSAP full").** Scroll-driven: pinned sections with scrubbed progress, staggered reveals, parallax layers, a horizontal or stepped feature tour, counters and chart bars that animate when they enter. Hover/pointer: tilt or lift on feature screens and cards (pointer devices only). All motion uses `transform`/`opacity`, cleans up on unmount and on route change, and stays at 60 fps on a mid-range laptop (no layout thrash).
6. **Reduced motion.** With `prefers-reduced-motion: reduce`, nothing pins, scrubs or moves; every section shows its final state. Content is never hidden by CSS before JavaScript runs.
7. **Responsive and accessible.** 360, 390, 768 and 1280 px, light and dark: no overlap, no horizontal scroll, headings in order, contrast AA, decorative screens `aria-hidden` with their meaning in text.
8. **Performance.** GSAP stays only in the lazy landing chunk; the app bundle does not grow. The landing chunk stays under 200 kB gzip.
9. **Copy rules.** pt-BR, professional, no emojis, no em/en dashes, "·", arrows or "…" (`rg "[—–·→…]" frontend/src` returns nothing).
10. `npm run build` passes, pytest unchanged, closing audit PASS with nothing open.

## Data Rules
- No API or data change. Sample numbers in landing screens are illustrative, in integer cents formatted as BRL, and are not claims about real usage.

## API Contract
None.

## Out of Scope
- Real authentication, accounts or per-user data (goal.md).
- Group splits, Pix, open finance: shown only as roadmap copy.
- Publishing, deploy, SEO and analytics (Business Rule 21).
- Video, Lottie or new animation libraries beyond GSAP and its ScrollTrigger plugin.

## Decisions
| Decision | Why | Rejected |
| --- | --- | --- |
| Straight `ArrowRight` in the CTA | It reads as "go"; the tilted one looked like a mistake. | `ArrowUpRight`: suggests an external link. |
| User menu as a disclosure with two links | Two navigation actions need no ARIA menu role and its arrow-key contract. | A full `role="menu"`: more keyboard rules for two items. |
| "Trocar usuário" reuses `clearUserName` | Same proven path as "Sair"; one way to log out. | Keeping the old balance input per user: needs real accounts. |
| Animated screens built in markup | Sharp at any size, themeable, animatable piece by piece. | Screenshots or video: blurry, heavy, cannot animate parts. |
| Startup section as a labeled proposal without numbers | Pitches the idea honestly for the presentation. | Invented market or user numbers: cannot be defended in a Q&A. |
| ScrollTrigger pin and scrub with `gsap.matchMedia` | One API covers desktop, mobile and reduced motion. | CSS scroll-driven animations: uneven Safari support. |
