# Figma sources

Read this when you need the exact original values or the reasoning behind a mapping. All values were read from the files with the Figma MCP (read-only). The files are community templates, so everything here is inspiration, not brand.

## Contents

1. Landing page file
2. Case-study file
3. Inconsistencies and template residue
4. How to re-read the files

## 1. Landing page: "Fintech Website Landing Page Design (Community)"

File key `gP127qBxOJ4vqhQwt3OcMA`. Page "Final UI" (`179:6278`). Main frame `285:2071` "Upgrade - Website Revamp", 1440 x 7032 px, desktop only. A second frame `350:3494` is the author credit card (ignore).

Fonts used: Poppins (Regular, Medium, SemiBold, Bold), Integral CF (display), Helvetica Neue Medium Extended (card titles), Clash Grotesk and DM Sans (chart card only).

Named variables in the file: Neutral/50 `#F9FAFB`, Neutral/200 `#EAECF0`, Neutral/700 `#344054`, Primary/700 `#031B1D`, Main/Dark `#011821` (also `#161919` in testimonials), Shades/Dark-80% `#454747`, Pure Black `#0D0D0D`, Black `#131313`, effect `s1` drop shadow `#4A556826` offset (0, 3) blur 13, text style "Button Text" Clash Grotesk Medium 18 / tracking 2.

### Sections (top to bottom)

| Node | Section | Key specs |
| --- | --- | --- |
| `285:2076` | Header | padding 20 / 150, logo 122 x 33, links Poppins 16 `#dcdcdc` gap 24, ghost "Sign In" 130 x 48, 1 px `#dcdcdc` border, radius 12 |
| `285:2406` | Hero | Gradient dark navy to teal with a 96 px grid, lines `rgba(208,213,221,.32)`, a few cells `rgba(242,244,247,.1)`. Two columns gap 157, content width 1140. Eyebrow pill `bg rgba(255,255,255,.18)`, text 14 Medium `#f9fafb`. Title 64 px, line-height 1.2, tracking 2.56 px, uppercase, white with the last word `#e2ff54`. Lead 18 Medium `#dcdcdc`. CTA 179 x 52 `#00b512` radius 44 plus 52 px cream `#fbf9f1` circle with arrow rotated -30 deg, overlapping -20 px. Floating tilted cards (`#29ad8d`, `#e2ff54`, radius 16, shadow `4 4 16 rgba(0,0,0,.16)`), phone mockup |
| `285:2448` | Partner strip | full-width `#04684c`, padding 20 / 44, six logos at 90% opacity, gap 92 |
| `285:2506` | About | Padding 120 / 100 / 150. Left: card `#f5f5f5` radius 20 holding a `#004852` radius-20 chart card. Right: pill, title 48, then a vertical step list |
| `285:2571` | Featured | Two columns gap 83. Pill, title 48 `#090909`, bullet list Poppins 16 `#676666`, secondary button, phone mockups inside `#f6f9f8` radius-20 card 559 x 456 |
| `285:2611` | Services (bento) | Padding 120 / 150, gap 60, pill + title 48 centered. Row 1: full-width card `#f6f9f8` 352 high. Row 2: two 558 x 673 cards, light `#f6f9f8` and dark `#001027`. Row 3: three 364 x 298 cards: `#e2ff54`, `#f6f9f8`, `#2d907a`. Grid gap 24, card radius 20, border `rgba(0,0,0,.06)`. Icon chip 42 px circle `#03a300` radius 32, 24 px glyph |
| `285:2689` | Testimonials | Section bg `#f6f9f8`, three 361 px cards, gap 26, padding 47 / 36, radius 20: white, `#004852` (inverted, white text), white. Quote 16, avatar 52, name 16 Medium, role 14 to 16 |
| `285:2745` | CTA banner | 1140 x 460 radius 20, `#001229`, two soft ellipse glows, phones on the right, title 48, text 16, CTA button |
| `285:2762` | Footer | White. Social circles 32 px `#006022` with 16 px icons, link row gap 48 `#646161`, legal row `#646060`, copyright 16 |

### Chart card "Saving Month" (`285:2507`)

Card `#004852`, radius 20, 390 x 377. Title Clash Grotesk Medium 18 `#f9f9f9`; value Semibold 24 white; trend line 16 with the percent in Semibold. Y ticks 0, 10k, 20k, 50k in 14 px `#c1c1c1`, 1 px grid lines, X labels April to July in 14 px `#b6b6b6` with the active month brighter (`#fffafa`). Floating value chip (`$20,000`, 12 px, dark text `#131313`) over the highlighted bar. This is the template for SplitPay's US04 chart cards.

### Step list (`285:2554`)

Vertical track 11 px wide `#d9d9d9` radius 20 with a filled segment `#04684c`. Three cards 530 wide, radius 20, padding 24 / 20: the active one filled `#f1ffd2` (title Poppins Bold 20, body 16 at 80% opacity), inactive ones `border #e5e5e5`, title `#011821`, body `#6b6969`.

## 2. Case study: "UIUX Case study for Fintech mobile app (Community)"

File key `y9OcLFvfgUrTCnKEo8sci3`. Only one page, "Notes." (`89:107`). No app screens: it holds a style guide, an information architecture chart and short notes. The app is called "Fundifyy" in the IA.

### Typography (Roboto)

Weights shown: Bold, SemiBold, Medium, Regular (plus Black, ExtraBold in the table).

| Role | px | rem | Weight |
| --- | --- | --- | --- |
| Display 1 | 64 | 4 | Black |
| Display 2 | 56 | 3.5 | ExtraBold |
| Heading 1 | 48 | 3 | Bold |
| Heading 2 | 40 | 2.5 | Bold |
| Heading 3 | 32 | 2 | Bold |
| Heading 4 | 28 | 1.75 | Bold |
| Heading 5 | 24 | 1.5 | Bold |
| Heading 6 | 20 | 1.25 | Bold |
| Subtitle 1 | 18 | 1.125 | Medium |
| Subtitle 2 | 16 | 1 | Regular |
| Body 1 | 16 | 1 | Regular |
| Body 2 | 14 | 0.875 | Regular |
| Button 1 | 16 | 1 | Medium |
| Button 2 | 14 | 0.875 | Regular |
| Caption | 12 | 0.75 | Regular |

### Colors

- State: success `#33B469`, warning `#EBBC2E`, info `#2F80ED`, error `#ED3A3A`.
- Text: `#262424`, `#231C1C`, `#1B1111`, `#0F0A0A`. Background: `#F6F6F6`, `#F3F3F3`, `#EEEEEE`. Gray: `#A7A7A7`, `#BEBEBE`, `#CFCFCF`, `#E3E3E3`. Title text `#131212`.
- Gradients: Nelson `#FF5858` to `#FFC8C8`, Friday `#00D2FF` to `#3A7BD5`, Sun on the horizon `#FF930F` to `#FFF95B`, Frost `#000428` to `#004E92`.
- Brand (actual fills): primary `#006cec`, shades `#005ece #0051b1 #004393 #003676 #002858 #001b3b #000d1d`, tints `#0f7dff #318fff #54a2ff #76b5ff #98c7ff #badaff #ddecff`. Secondary `#ec8000`, shades `#cf7000 #b16000 #945000 #764000 #593000 #3b2000 #1e1000`, tints `#ff910f #ffa132 #ffb154 #ffc076 #ffd098 #ffe0bb #ffefdd`. Swatch shadow `0 8 16 rgba(brand, .2)`, radius 10. The Sun-on-the-horizon gradient and the orange scale sit closest to SplitPay's amber if a warm tint scale is ever needed.

### Information architecture

Home, Cards, Transactions, Settings at the top level. Under Cards: card details, freeze, top up, settings. Under Transactions: graph, categories. Under Home: card details, payment, send, convert, top up, latest transactions. Under Settings: profile, security, support, notifications. Notes: menus Payment, Transactions, Cards, Top up, Transfer, Settings, Profile, Notification, ATM centres, Support, Referral. Only the idea of four top-level destinations and a transactions section with graph and categories is reusable. The rest is out of scope.

## 3. Inconsistencies and template residue

| Item | Detail | Handling |
| --- | --- | --- |
| Brand swatch labels | Labeled `#9412ED` / `#6BED12`, filled `#006cec` / `#ec8000` | Ignore both; brand not adopted |
| `6456px` | Typo in the type table for 56 px | Use 56 |
| Main/Dark | `#011821` in about/features, `#161919` in testimonials | Irrelevant; SplitPay uses `text` / `bg` |
| White text on `#00b512` | 2.64:1 | Fails AA |
| `#a5a5a5` label on white card | 2.46:1 | Fails AA |
| Placeholder copy | Medical text under "Expenses Tracker", "Crypto Connection", "Glose", "Design Monks", reversed e-mail `moc.edargpu@tcatnoc`, typo "One appp for all" | Never reuse |
| Font licensing | Integral CF, Helvetica Neue Extended, Clash Grotesk are not Google Fonts | Not used |
| Asset URLs | Temporary (7 days) and the mockup PNGs are template images | Do not ship |

## 4. How to re-read the files

Both are community files, readable with the Figma MCP. Call `create_session` first, then:

- Landing: `get_design_context` with `fileKey gP127qBxOJ4vqhQwt3OcMA` and a section node from the table above. The hero node `285:2075` returns a very large grid, so prefer `get_screenshot` for it.
- Case study: `get_metadata` with `fileKey y9OcLFvfgUrTCnKEo8sci3` and node `89:107`.
- Node ids in shared links can point to pages or connectors. Check with `get_metadata` first.
