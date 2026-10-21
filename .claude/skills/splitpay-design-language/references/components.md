# Component recipes

Tailwind 4 classes built only from tokens in `frontend/src/styles/theme.css` (`bg`, `surface`, `border`, `text`, `muted`, `accent`, `on-accent`, `success`, `danger`). Add `warning` and `info` tokens before using them. Recipes are starting points: check `frontend/src/app/components/` first and match the existing code style.

## Contents

1. Cards and stats
2. Buttons
3. Badges, pills and chips
4. Forms
5. Lists and timeline
6. Charts
7. Navigation
8. Landing page blocks
9. State checklist

## 1. Cards and stats

```tsx
// Base card
<section className="rounded-[20px] border border-border bg-surface p-5 md:p-6">

// Balance hero (amber fill, dark text)
<section className="rounded-[20px] bg-accent p-5 text-on-accent md:p-6">
  <p className="text-xs font-medium uppercase tracking-widest opacity-70">Saldo atual</p>
  <p className="mt-1 text-4xl font-extrabold tabular-nums md:text-5xl">R$ 4.850,00</p>
  <div className="mt-4 h-2 rounded-full bg-on-accent/15">
    <div className="h-full rounded-full bg-on-accent/60" style={{ width: `${pct}%` }} />
  </div>
</section>

// Stat card: label, icon chip, value, delta
<article className="rounded-2xl border border-border bg-surface p-4">
  <header className="flex items-center justify-between text-sm text-muted">
    <span>Gasto total</span>
    <span className="grid size-8 place-items-center rounded-lg bg-danger/15 text-danger" aria-hidden>{icon}</span>
  </header>
  <p className="mt-2 text-2xl font-bold tabular-nums text-accent">R$ 3.700,00</p>
  <p className="mt-1 text-xs text-muted">12% vs. mês anterior</p>
</article>
```

Budget bars always carry the numbers as text (`62% do orçamento`, `R$ 2.300,00 restantes`) so the bar is never the only signal.

## 2. Buttons

```tsx
// Primary (matches the existing "Novo Gasto")
"inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-on-accent shadow-[0_3px_13px_rgba(251,191,36,.18)] transition active:scale-[.98] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"

// Secondary
"inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 text-sm font-medium text-text"

// Ghost (small action inside rows, e.g. Marcar como pago)
"inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted hover:text-text"
```

Landing hero CTA (Figma pattern, landing only): primary button `rounded-[44px]` followed by a 52 px circular button (`rounded-full bg-text text-bg`) holding an arrow rotated -30 deg, overlapping the first by 20 px (`-ml-5`). Disabled buttons keep their label readable and use `aria-disabled` plus a reason nearby when the cause is not obvious (for example the adjustment needing a 10 character justification).

## 3. Badges, pills and chips

```tsx
// Eyebrow pill (landing section label)
"inline-flex items-center gap-1 rounded-full border border-border bg-surface py-1.5 pl-3 pr-4 text-xs font-medium uppercase tracking-wide text-text"

// Status pill: tinted fill, colored text, icon, label
// Aguardando reembolso -> accent-soft, Pago -> success-soft, Acertado -> neutral-soft (spec 008)
"inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-soft-text"

// Category chip (single select; selected state uses accent)
"h-10 rounded-xl border border-border bg-surface px-4 text-sm font-medium text-muted aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent-soft-text"

// Count badge inside tabs
"ml-1.5 rounded-full bg-border px-1.5 text-[11px] tabular-nums"
```

## 4. Forms

```tsx
<label className="block text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="desc">Descrição do gasto</label>
<input id="desc" className="mt-2 h-12 w-full rounded-xl border border-border bg-bg px-4 text-base text-text placeholder:text-muted/70 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40" />
```

- Money field: large number in `accent` (`text-3xl font-bold tabular-nums`), `inputMode="decimal"`, `R$` prefix as a separate non-editable element. The component parses to integer cents before leaving the form.
- Errors: message under the field in `danger` with an icon, linked through `aria-describedby`, field border `danger`. Inputs are 16 px minimum to avoid iOS zoom.
- Textarea with a minimum length (adjustment reason): show a live counter (`0 / 10 mín.`) and turn it `success` when met.
- Friend picker rows: avatar with initials, name, checkbox; the whole row is the target (min 56 px). Avatar colors are decorative, but the initials carry the identity.

## 5. Lists and timeline

```tsx
// Transaction row
<li className="flex items-center gap-3 px-4 py-3">
  <span className="grid size-10 place-items-center rounded-full bg-accent/15 text-xs font-bold text-accent">AL</span>
  <div className="min-w-0 flex-1">
    <p className="truncate text-sm font-medium">Jantar no restaurante</p>
    <p className="text-xs text-muted">24 Abr · 3 pessoas</p>
  </div>
  <p className="text-sm font-semibold tabular-nums">−R$ 210,00</p>
</li>
```

Rows are separated by `divide-y divide-border`. Reimbursement rows add the status pill under the amount on mobile.

Timeline (adjustment history): a 2 px `border` rail on the left, a 32 px circular node (`accent` fill for the latest, outlined for older), cards `rounded-2xl border border-border bg-surface p-4`, latest card `border-accent/40 bg-accent/5` with a "Mais recente" pill. Show `R$ old → R$ new` with the old value struck through.

## 6. Charts

Derived from the Figma "Saving Month" card. SplitPay charts always sit in a card with a title, a period segmented control and the numbers as text.

- Segmented control: container `rounded-xl bg-bg p-1`, buttons `h-8 rounded-lg px-3 text-xs`, selected `bg-accent text-on-accent` with `aria-pressed`.
- Bars: inactive `bg-border` (or `bg-muted/30`), active `bg-accent`, radius 6 at the top, gap 12 px. Ticks `text-xs text-muted`, 1 px `border` grid lines, three Y ticks at most on mobile.
- Value chip over the active bar: `rounded-lg bg-accent px-2 py-1 text-xs font-semibold text-on-accent`, with a small pointer.
- Donut by category: inner label shows the total (`tabular-nums`). Use `accent` plus lighter and darker amber steps, and separate slices with a 2 px `surface` gap. Because adjacent amber steps are hard to tell apart, the legend lists name, share and amount next to a swatch and each row is a button that expands the items (US04).
- Empty period: a centered message `Nenhum dado encontrado` with a muted icon, same card height to avoid layout shift.
- Provide the data as text rows (the legend doubles as a table). Charts are never the only source of a number.

## 7. Navigation

```tsx
// Bottom tab bar (mobile). 4 destinations: Início, Extrato, Amigos, Configurações
<nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
  <ul className="mx-auto grid max-w-md grid-cols-4">
    <li><a aria-current={active ? "page" : undefined}
           className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] text-muted aria-[current=page]:text-accent">
      {icon}<span>Início</span></a></li>
  </ul>
</nav>
```

From `md` up, swap to the top nav seen in the reference screens (logo, four links, primary "Novo Gasto"). The active item uses `accent` text plus a `surface` pill. Add `pb-24` to page content so the bar never covers it. The primary action ("Novo Gasto") is a floating or header button on mobile, not a fifth tab.

## 8. Landing page blocks

Dark only, to match the app. Replace Figma's teal and lime with `bg`, `surface` and `accent`.

- **Hero background**: `bg` with a faint grid and an amber glow. Grid with CSS only: `background-image: linear-gradient(to right, rgb(255 255 255 / .06) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / .06) 1px, transparent 1px); background-size: 96px 96px;` masked with `mask-image: radial-gradient(ellipse at 70% 30%, #000, transparent 70%)`. Glow: absolutely positioned blurred circle `bg-accent/10 blur-3xl`.
- **Hero copy**: pill eyebrow, title Display scale on `lg` (36 to 40 px on mobile) with the last word in `text-accent`, lead 16 to 18 px `text-muted`, CTA pair. App preview on the right (stacked below on mobile) using real screenshots of the running app, never the Figma mockups.
- **Trust strip** (Figma partner band): only with real, truthful content. Do not invent partners. A simple strip of the stack or "Projeto FIAP" is acceptable.
- **Bento features**: grid `gap-3 md:gap-6`, cards `rounded-[20px]`, a mix of `surface` and one `accent` card (dark text) for the highlight. Icon chip 42 px `rounded-full bg-accent text-on-accent` over each title.
- **Step list**: vertical 11 px rail, filled segment `bg-accent`, active card `bg-accent/10 border-accent/40`, inactive `border-border`. Good for "como funciona" (registrar gasto, dividir, acompanhar reembolso).
- **Testimonials**: only if real or clearly labeled as demo. Trio of cards with the middle one inverted (`bg-accent text-on-accent`).
- **CTA banner**: `rounded-[20px] bg-surface` with an amber glow, title, one button.
- **Footer**: `border-t border-border`, links in `muted`, legal row, no social icons unless real.

## 9. State checklist

Every data-driven component defines: loading (skeleton that keeps the final height, `bg-border animate-pulse`), empty (text plus next action), error (message in pt-BR plus retry), populated, and disabled. Check each at 360 px. Skeletons are not shown for less than a short beat to avoid flicker; if the API is fast, skip them.
