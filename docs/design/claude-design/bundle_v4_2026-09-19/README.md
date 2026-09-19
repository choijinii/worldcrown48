# WorldCrown48 — Design System

> **"모든 화면은 디지털 악기처럼 느껴져야 한다."**
> *Every screen should feel like a digital instrument.*

WorldCrown48 (월크48) is a global fan-voting platform built on the **이상형 월드컵 (ideal-type bracket)** format. The product launches alongside the 2026 North American World Cup season. **48 Contestants enter a Tournament. One leaves crowned.**

This design system is the v2.4 **Twilight Stadium · AI-Report Footer-Only Lock** edition (extends v2.3 100%) — the contract Claude Design and Claude Code work against when producing UI for the product.

* **Brand · service** WorldCrown48 (월크48) · [worldcrown48.com](https://worldcrown48.com)
* **Origin doc** `WC48_DESIGN_SYSTEM_v2.4.md` (Twilight Stadium Cinematic Edition · footer-only AI-Report)
* **Source of truth** `colors_and_type.css` (all tokens) + this README (rules)

---

## Sources & input

| Source | Provenance |
| --- | --- |
| Brand SVGs (Crown ×4, Wordmark ×2, Lockup ×4) | uploaded by user · stored in `assets/` |
| `wc48-colors.svg` palette sheet | uploaded · 9-stop master · decoded into tokens |
| Pretendard + Playfair Display font families | uploaded · stored in `fonts/` |
| WC48_DESIGN_SYSTEM_v2.4.md spec | analyzed from companion project `f5ef02d4-13a6-4b29-a9f8-4b4d19f26d61` |
| DESIGN_BRIEF.md · LANGUAGE.md · CLAUDE.md | analyzed from companion project — defines the immutable terminology |
| `ds/tokens.css` + `ds/showcase.css` | analyzed and mirrored into this project's `colors_and_type.css` + preview cards |

> The companion project contains an authoritative implementation (`Design System.html` + `ds/*.jsx`). This project is the **portable design-system distribution** — the same contract surfaced as registered Design System cards plus a slim React UI kit.

---

## Components

Exported on `window.WorldCrown48DesignSystem_ea92b8` — each lives in `components/<Name>/` with a `.jsx`, a `.d.ts`, and a preview card.

| Component | Purpose |
| --- | --- |
| **Button** | Primary action. `gold` · `ghost` · `quiet`; ≥44px hit target. |
| **StatusPill** | The five Tournament states. Never `In Progress`, never `LIVE`. |
| **TournamentCard** | The Pitch card — category · title · {N} Contestants · Deadline · status. |
| **VSBattle** | The Arena Match surface. No Round HUD, no timer, no Vote Rate. |
| **AIReportFooter** | `✦ AI-Report` — news-article footer only, never on a card. |

---

## Index

```
WorldCrown48 Design System/
├── README.md                ← this file · the v2.4 contract
├── SKILL.md                 ← agent-skill manifest
├── WorldCrown48 Design System.html  ← the integrated single-page system (foundation · brand · components · cinematic · rules)
├── styles.css               ← root entry stylesheet (@imports the token + kit sheets)
├── colors_and_type.css      ← all tokens (color · type · spacing · radius · shadow)
├── thumbnail.html           ← homepage tile
├── components/              ← exported components (Button · StatusPill · TournamentCard · VSBattle · AIReportFooter)
├── assets/                  ← brand SVGs (4 crowns · 2 wordmarks · 4 lockups · palette sheet)
├── fonts/                   ← Pretendard (Korean fallback) + Playfair Display (local statics)
├── preview/                 ← Design System tab cards (registered, rendered automatically)
│   ├── _card.css            ← shared card chrome
│   ├── 00-thesis.html       ← North Star
│   ├── 01-color-*.html      ← Color · Twilight Stadium (5 cards)
│   ├── 10-type-*.html       ← Typography · 3 families (4 cards)
│   ├── 20-spacing-*.html    ← Spacing · Radii · Shadow · Noise (4 cards)
│   ├── 30-brand-*.html      ← Brand · Logo · Wordmark · Lockup (4 cards)
│   ├── 40-comp-*.html       ← Components — Buttons · Pills · Cards · VS Battle ·
│   │                            GNB · Form · Crown Card · Light theme (8 cards)
│   └── 50-rule-*.html       ← Principles — Round Scope · Banned patterns (2 cards)
├── ds/                      ← integrated showcase app (showcase.css + section JSX modules)
└── ui_kits/
    └── web/                 ← clickable WC48 web product (Launch Pad · Pitch · Arena · Crown)
        ├── index.html
        ├── kit.css
        ├── data.jsx
        ├── components.jsx
        ├── LaunchPad.jsx
        ├── Pitch.jsx
        ├── Arena.jsx
        ├── CrownReveal.jsx
        └── App.jsx
```

---

## ⛔ The contract — 12 inviolable rules

> Violating any rule below is a build break. The rules trace to `WC48_DESIGN_SYSTEM_v2.4.md §⛔` + `DESIGN_BRIEF.md §Recurring Errors` + `LANGUAGE.md §7`.

1. **Crown Gold `#FCD006` is the only point color.** Aura `#EEDA7D` permitted for soft emphasis. Fluorescent yellows · neon greens · pinks banned.
2. **No pure black `#000000`.** Dark surfaces are navy-indigo Twilight (`#00003A` floor). Pitch black breaks the cabinet.
3. **"AI GENERATED" badges are permanently retired.** Use `✦ AI-Report` (12px gold mono) **only as the footer of a news article**. Never on cards, banners, boxes, or any other surface.
4. **No Round on TournamentCard, no Round counters, no Round Cards.** Round is a Voter-private value with no DB document. The single allowed surface for any Round label is the Arena VS Battle header: `"ROUND OF N · MATCH X/Y"`.
5. **The only Round names are** `ROUND OF 48` / `ROUND OF 24` / `ROUND OF 12` / `ROUND OF 6` / `THE FINAL`. FIFA terminology (`QUARTERFINAL`, `SEMIFINAL`, `ROUND OF 16` etc.) is banned.
6. **No Match / Round deadline. No "ENDS IN" timer.** Only **Tournament Deadline** exists.
7. **No `LIVE` badge anywhere.** WC48 does not live-stream. A `LIVE` pill implies simultaneous multi-participant viewing, which the product never delivers. Permanently retired from TournamentCard, Arena, GNB, and every other surface.
8. **No Vote Rate (%) on the Match VS screen.** Displaying live rates during voting creates bandwagon bias. Vote Rate appears on the **Ranking screen only**, after the Voter has completed the Match.
9. **No Vote Count absolute integers in UI.** Stored internally only; surfaced as Vote Rate (%) on ranking.
10. **No predictions · no odds · no betting language.** WC48 is fan-choice; "Crown odds", "projected winner", "favorite to win" are off-brand.
11. **Crown logo never recolored.** Use only the four registered SVGs. No gradient, no glow, no bevel. Crown Gold fill or Twilight outline only.
12. **No `FIFA` / no `Official` text** anywhere. Trademark territory. Use `Football`, `International` etc. as neutral alternatives.

---

## 🎨 Visual foundations

### Color · Twilight Stadium

All tokens live in `colors_and_type.css`. The product runs **dark by default** for Domain 0–3 (the heartbeat) and **light** for Domain 4–6 (utility).

**Dark backgrounds**

| Token | Hex | Use |
| --- | --- | --- |
| `--color-bg-deep` | `#00003A` | Deep Osidian — Arena hero, deepest layer |
| `--color-bg-default` | `#0E0944` | Deep Twilight — default dark background |
| `--color-bg-soft` | `#241754` | Twilight Soft — cards, panels |
| `--color-bg-elevated` | `#362261` | Twilight Indigo — modals, dropdowns |
| `--color-bg-charcoal` | `#1E1E24` | GNB Charcoal — Floating Island GNB only |

**Gold (theme-shared · point color)**

| Token | Hex | Use |
| --- | --- | --- |
| `--color-gold` | `#FCD006` | Crown Gold — primary point color |
| `--color-gold-bright` | `#FBB03B` | Sunburst accent |
| `--color-gold-hover` | `#E3BB05` | CTA hover state |
| `--color-aura` | `#EEDA7D` | Aura Yellow — soft emphasis only |

**Accent (state-reserved · never decorative)**

| Token | Hex | Use |
| --- | --- | --- |
| `--color-crimson` | `#D7063A` | Royal Crimson — VS right, live, error |
| `--color-turquoise` | `#00A3B7` | Turquoise — VS left, success |
| `--color-powder` | `#B1B5C4` | Powder Blue — secondary text |

**Banned colors** — `#000000` · `#05070A` · `#0A0D12` · `#F8FAFC` · `#30363D` (v1 legacy grays).

### Typography · three families

* **Inter** — the workhorse. UI, body, headings, section titles, tournament/contestant names. Weights 400/500/600/700/800/900.
* **Playfair Display** — *reserved accent, not a default.* Use **only on genuine focal moments**: the Launch Pad hero, the thesis/manifesto line, **Champion names** on the Crown reveal, the **"vs" battle glyph**, and the "The Arena" brand eyebrow. Never on section heads, UI titles, stat numbers, or contestant names. Italic 400/700/900 carries the most charge — spend it sparingly.
* **JetBrains Mono** — all numerals (stat counts, vote rate, scores), metadata tags, the `✦ AI-Report` article footer.
* **Pretendard** — Korean fallback. Resolves automatically via the `--font-sans` stack on Hangul characters.

**Three families on a single screen — never four.** Korean text inside an Inter run will auto-fall through to Pretendard with matching metrics.

Type scale (rounded, kept small):

| Token | Size / line | Family | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Display *(focal only)* | clamp(56–120px) | Playfair | italic 400 / 900 | −0.035em |
| H1 | 48 / 1.10 | Inter | 700 | −0.020em |
| H2 | 32 / 1.20 | Inter | 700 | −0.015em |
| H3 | 24 / 1.30 | Inter | 600 | −0.010em |
| Body L | 17 / 1.55 | Inter | 500 | 0 |
| Body | 15 / 1.55 | Inter | 500 | 0 |
| Caption | 13 / 1.45 | Inter | 500 | 0 |
| Mono tag | 11 / 1.50 | JetBrains | 600 | 0.18em |

### Spacing · radii · shadow

* **8-pixel base unit** governs every gap, padding, stack. Named tokens `--space-1..--space-32`.
* **Radii — only three exist.** `--radius-rect` (0), `--radius-border` (5px · default for every surface), `--radius-chip` (999px · pills only). Anything between 5px and 999px is banned.
* **Colored shadows.** `--shadow-card` (general lift) · `--shadow-gold` (CTA, winner) · `--shadow-crimson` (error · live pulse) · `--shadow-turquoise` (success) · `--shadow-gnb` (Floating Island GNB).
* **Noise texture** — `.wc-noise` overlay at 5% opacity in `mix-blend-mode: overlay`. Mandatory on every dark surface; it kills the AI-flat look.

### Motion

* **Magnetic translation** for primary CTAs (pointer-tracking, ~0.05× strength).
* **GSAP stagger fade-up** for hero · VS Battle · Crown Card entry. All GSAP work wrapped in `gsap.context()` + `ctx.revert()` cleanup.
* **GSAP ScrollTrigger** for Philosophy parallax + Sticky Stacking Archive (3 cards).
* `prefers-reduced-motion` always disables stagger and parallax — pins stay.

### Backgrounds & imagery

* **No photographic backgrounds in product chrome.** Photographic content lives inside contestant cards in the Arena, never behind UI.
* **No hand-drawn illustrations · no emoji · no stock geometry.**
* **Allowed gradients** — radial halos around the Crown mark (gold → transparent), vertical royal-to-midnight on full-bleed hero stages. No diagonal gradients. No multi-stop rainbow gradients.
* **Full-bleed photography** is allowed only on user-uploaded tournament cover images.

### Floating Island GNB

The Global Navigation Bar is a **charcoal pill** (`--color-bg-charcoal`) floating below the viewport top. Never flush against the edge. Brand left · Voter CTA right. Pill morphs to a compact form on scroll.

### State patterns

| State | Treatment |
| --- | --- |
| Card hover | translateY(−4px) + `--shadow-gold` + border flips to `--color-border-gold` |
| Button hover (primary) | magnetic offset + `--shadow-gold` |
| Button hover (crimson) | magnetic offset + `--shadow-crimson` |
| Press | shadow tightens; no scale change |
| Focus visible | 1px gold inner ring (`--color-gold`), never browser default |
| Disabled | background `--bg-3`, color `--text-mut`, cursor not-allowed |
| Loading | spinner using `--color-gold` on Twilight, text → "Submitting…" |

### Tournament status — five values only

`draft` · `published` · `active` · `closed` · `completed`. **"In Progress" is not a valid value** — use `active`.

---

## ✍️ Content fundamentals

### Voice

Bilingual by default. Korean and English share the same screen, same weight. **Never casual.** Never corporate. The voice is a ring announcer reading a love letter — theatrical, but precise.

### Tone matrix

| Dimension | Choice |
| --- | --- |
| Person | Second person — "your Crown", "당신의 선택" |
| Casing | Sentence case in body. `ALL CAPS · MONO` for tags and headers ("ROUND OF 48", "VOTE LEFT", "✦ AI-Report") |
| Numerals | Always Arabic. Match numbers, Round counters and Vote Rate live in JetBrains Mono. Champion names live in Playfair Italic. |
| Emoji | **None.** The Crown does the work. |
| Hashtags / slang | Avoid. The product produces shareable typography; we don't need internet voice. |
| Korean | Pretendard auto-resolves through `--font-sans`. Never set Korean in Playfair. |
| Bilingual | Korean text appears before English when both languages co-exist (`결승 · THE FINAL`). |

### Verbs — terminology contract

The terminology contract is **immutable** (`LANGUAGE.md §⛔`). Synonyms are banned.

| ✅ Use | ❌ Don't |
| --- | --- |
| Tournament | event, contest, game |
| Contestant | candidate, participant, entry |
| Match | battle, round, game, fight |
| Vote / Cast Vote | pick, choose, select (CTA: `Vote Now`, `Cast Vote`) |
| Voter | user, participant, fan (in role context) |
| Champion | winner, victor |
| Crown / Crown Card | trophy, prize, result image |
| Tournament Deadline | Round Deadline (does not exist) |
| Vote Rate (%) | Vote Count (forbidden in UI) |
| `active` | `In Progress` |
| Tournament Host | admin, creator |
| `✦ AI-Report` (article footer only) | `AI`, `AI GENERATED`, `AI-Powered`, `● AI-Report` (card byline retired) |

### Voice examples

| ❌ Don't | ✅ Do |
| --- | --- |
| Vote for your favorite striker! 👑 | **48 Contestants. One Crown.** |
| Round 3 of 6 · ends in 02:14:11 | **ROUND OF 12 · MATCH 3/6** |
| Click here to vote | **Vote Now** / **Cast Vote** / **VOTE LEFT · VOTE RIGHT** |
| AI Generated · 2 hours ago | **✦ AI-Report · 2 hours ago** (footer of news article only) |
| Crown odds: Mbappé 64% / Son 36% | (no odds, no predictions — fan-choice only) |
| Will Mbappé win? | **Fans are making their voice heard.** |
| Tournament is in progress | (use status pill: `active`) |

---

## 🌐 The seven domains

| # | Name | Theme | URL | MVP | Purpose |
| --- | --- | --- | --- | --- | --- |
| 0 | **Launch Pad** | 🌑 Dark | `/` (pre-launch) | 1 | Pre-launch landing · email waitlist |
| 1 | **The Pitch** | 🌑 Dark | `/` | 1 | Trending Tournaments · home grid |
| 2 | **The Lab** | 🌑 Dark | `/admin/lab` | 1 | Tournament creation (Host only) |
| 3 | **The Arena** | 🌑 Dark | `/arena/[id]` | 1 | VS Battle · Crown Card · Newsroom |
| 4 | **The Locker Room** | ☀️ Light | `/profile` | 2 | User profile · vote history |
| 5 | **Policy Hub** | ☀️ Light | `/policies` | 1 | Terms · privacy · cookies |
| 6 | **Admin Dashboard** | ☀️ Light | `/admin` | 1 | System Admin control center |

---

## 🔻 Iconography

| Asset | Use |
| --- | --- |
| `assets/wc48-crown-filled.svg` | Hero, winners, large surfaces (Gold) |
| `assets/wc48-crown-outline.svg` | UI affordance, list items, stroke = currentColor |
| `assets/wc48-crown-circle-filled.svg` | App icon, favicon, watermark |
| `assets/wc48-crown-circle-outline.svg` | Empty contestant slot |
| `assets/wc48-wordmark-{light,dark}.svg` | Standalone wordmark |
| `assets/wc48-branding-{horizontal,vertical}-{light,dark}.svg` | Crown + wordmark lockup |

**Brand-mark rules**

* The three-spike crown with the floating orb is **never recomposed.** Spikes do not change. Orb does not detach.
* Crown fills only `--color-gold` or `--color-royal` (`#241754`). Never white, never crimson, never turquoise.
* Clearspace **= 1× the crown's height** on every side.
* Minimum legible size: 24px (filled) / 32px (outline).
* No drop-shadow / bevel / outer glow on the mark itself. The Twilight bg + noise does the lifting.

**Functional UI icons**

* **No emoji. No unicode glyphs. No PNG icons.**
* Use **Lucide** at stroke-width 1.75, 24px default, loaded via CDN. *Substitution flagged: no internal icon set was provided — if one exists, drop it into `assets/icons/` and update this section.*

---

## ⚠️ Caveats / substitutions

1. **Functional icon set** — Lucide is a placeholder. Replace with the internal icon library when one is provided.
2. **Production code not bundled** — this distribution is design-system + UI-kit only. The Next.js / Tailwind production app lives in the companion repo.
3. **Korean voice tuning** — bilingual microcopy in the kit follows v2.4 phrasing rules but should be reviewed by a native speaker before launch.
4. **No tournament imagery shipped** — contestant photo placeholders are synthetic gradient blocks with monogram. Real photos are user-supplied at Tournament creation time.

---

## See also

* `SKILL.md` — agent skill entry point
* `colors_and_type.css` — single import for any new HTML / component
* `ui_kits/web/index.html` — clickable WC48 product
* `preview/*.html` — Design System tab cards (rendered automatically)
