# 013 Landing Page — Spec

Stories: none directly; presents US01 to US05 | Status: approved

## Problem

`/` redirects to `/inicio`, so the first thing a professor or classmate sees is the login. The presentation needs a public page that says in a few seconds what SplitPay does, shows the five stories as features, and leads into the demo. `docs/context.md` also chose GSAP for the landing motion, and `.claude/skills/splitpay-design-language` already defines the landing blocks and the motion recipes. No landing prototype exists, so this page follows those blocks with the approved identity: the dark hero of `/entrar` (#0b0b0c, amber glow, faint grid, logo roundel) over light sections.

## Acceptance Criteria

1. **Route:** `/` shows the landing page for everyone, with no tab bar or top nav. `/entrar` and every app route are unchanged.
2. **Header:** the logo roundel with "SplitPay" ("Pay" in amber) on the left, and a button on the right: "Entrar" (to `/entrar`) when no name is saved, "Abrir o app" (to `/inicio`) when one is. It stays at the top of the page (not sticky).
3. **Hero** (dark, full width):
   - a pill eyebrow "Projeto acadêmico FIAP";
   - the title "Divida um gasto com um amigo e saiba quanto volta para você";
   - the lead "Registre a despesa, escolha como dividir e acompanhe o reembolso até ele cair no seu saldo.";
   - the primary CTA "Experimentar a demonstração" (same target as the header button) and a secondary link "Como funciona" that scrolls to that section;
   - a preview card built from the real app components with fixed sample values (not API data): "Saldo disponível" R$ 7.063,97, a split row "Janta no japonês, Com Ana Lima" −R$ 187,90 with the "Aguardando reembolso" pill, and "A receber de amigos" R$ 93,95; the card carries the caption "Valores de exemplo";
   - from `lg` the text and the preview sit side by side; below `lg` the preview follows the text.
4. **"O que dá para fazer"** (bento grid, one card per story, each with an icon, a title and one sentence):
   - "Divisão 1 para 1" (US01): "Igual, por porcentagem ou valor fixo. A parte do amigo vira um valor a receber.";
   - "Categoria automática" (US02): "Escreva Janta e a categoria Alimentação aparece sozinha. Crie as suas regras.";
   - "Reembolso com status" (US03): "Aguardando, pago ou acertado. Cada lançamento guarda local, parcela e observações.";
   - "Gráficos por período" (US04): "Gastos por categoria e por amigo na semana, no mês ou no ano.";
   - "Saldo sempre explicado" (US05): "Saldo inicial, entradas e saídas, e ajustes com justificativa no histórico.".
   One column on mobile, two from `md`, a bento of three columns from `lg` with US01 spanning two.
5. **"Como funciona"** (`id="como-funciona"`), a vertical list of three numbered steps joined by a rail:
   1. "Registre o gasto": "Valor, descrição e data. O resto é opcional.";
   2. "Divida com um amigo": "Veja na hora quanto é a sua parte e quanto é a dele.";
   3. "Marque quando receber": "Recebi devolve o valor ao saldo. Já acertamos encerra sem mexer no saldo.".
6. **Closing CTA band:** "Pronto para testar?" with the same CTA as the hero and the note "Os dados são de demonstração e voltam ao estado inicial quando o servidor reinicia."
7. **Footer:** "SplitPay, projeto acadêmico da FIAP." and links "Código no GitHub" (`https://github.com/vininoronha21/splitpay-fintech`) and "Documentação da API" (`{API base}/docs`), both opening in a new tab with `rel="noopener noreferrer"`.
8. **Motion (GSAP):**
   - hero entrance as one timeline: pill, title, lead, CTAs, then the preview card (`y: 24, opacity: 0, 0.6 s, stagger 0.08, power2.out`);
   - the preview's balance counts up from R$ 0,00 to R$ 7.063,97 over 0.8 s, tweening integer cents and formatting each frame with `formatBRL`;
   - feature cards and steps reveal once when they scroll into view (`start: "top 85%"`, stagger 0.1);
   - the steps rail fills with scroll (`scaleY`, scrub), rail only;
   - only `transform` and `opacity` are animated; nothing loops; nothing blocks input.
9. **Reduced motion and no JS:** with `prefers-reduced-motion: reduce` no animation runs and every element shows its final state at once; the markup never hides content with CSS (the "from" state is set in JS only).
10. **Performance:** the landing and GSAP load as their own chunk; app routes do not download GSAP. The app bundle size does not grow by more than 2 kB gzip.
11. **Layout and themes:**
    - the hero is dark in both themes; the sections below follow the light or dark theme;
    - content max width 1140 px; section padding 64 px on mobile and 120 px from `lg`;
    - the 008 layout scan rules apply at 360, 390, 768 and 1280 in both themes, after the animations finish and with reduced motion.
12. **Accessibility and copy:** one `h1` (the hero title), section `h2`s, the preview card `aria-hidden` with a visually hidden sentence describing it, landmarks (`header`, `main`, `footer`), 44 px targets, visible focus, contrast AA in both themes; pt-BR copy with no em or en dash, "·", arrows or "…". No invented testimonials, numbers or user counts.
13. `npm run build` passes with strict TypeScript.

## Data Rules

- The landing calls no API. The sample values are integer cents formatted by `formatBRL`, and the card says they are examples.
- The CTA target reads the saved name with `readUserName()`, as `/entrar` already does.

## API Contract

No backend change. The footer link uses the existing `/docs` (Swagger) of the API base URL.

## Out of Scope

- The PWA install prompt and offline support (014).
- Testimonials, pricing, sign-up and any real account.
- Page transitions between routes and motion inside the app screens.

## Decisions

| Decision | Why | Rejected |
| --- | --- | --- |
| GSAP 3.15.0 with `@gsap/react` 2.1.2 (`useGSAP`), ScrollTrigger plugin | One timeline sequences the hero, ScrollTrigger handles reveal-once and the scrubbed rail, and `useGSAP` cleans up on unmount. Chosen in `context.md`, free under the GSAP standard license. | CSS transitions plus IntersectionObserver: no shared timeline, and a scrubbed rail and a cents counter need hand-written scroll and rAF code. |
| Landing as a lazy route chunk | The app screens never pay for GSAP (roughly 40 to 50 kB gzip with ScrollTrigger). | Bundling it with the app: every visit to Início downloads animation code it never runs. |
| Preview built from real components with sample values | Shows the real look without depending on a cold API on Render, and stays honest with the "Valores de exemplo" caption. | A screenshot image: goes stale with every UI change and has no dark-theme variant. Live API data: slow first load and shared demo data can look odd. |
| No testimonials or metrics | Anything invented would be false in an academic presentation. | The Figma landing's testimonial trio. |
