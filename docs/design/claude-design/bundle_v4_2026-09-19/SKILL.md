---
name: worldcrown48-design
description: Use this skill to generate well-branded interfaces and assets for WorldCrown48 (월크48) — global fan-voting platform launching with the 2026 North American World Cup. Contains the v2.3 Twilight Stadium contract (color · type · spacing · components), brand SVGs, fonts, and a clickable web UI kit. Strict ruleset — Round Scope Lock, no LIVE on TournamentCard, no Vote Rate on Match VS, "● AI-Report" only.
user-invocable: true
---

# WorldCrown48 design skill

## Read first

1. **`README.md`** — the v2.4 contract. Twelve inviolable rules, the seven-domain map, color · type · spacing foundations, the terminology contract.
2. **`colors_and_type.css`** — single source of truth. Import this in every HTML you produce. Use `--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--font-*` tokens — never reinvent.
3. **`assets/`** — copy what you need into your output's folder. The four Crown SVGs are the only allowed brand marks.
4. **`ui_kits/web/`** — clickable reference for the production web product across four screens (Launch Pad · The Pitch · The Arena · Crown Reveal).

## Hard contract (read every session)

* **Crown Gold `#FCD006` is the only point color.** Crimson `#D7063A` and Turquoise `#00A3B7` are state-only. Pure black banned.
* **Dark theme is default** for Domain 0–3. Light theme for Domain 4–6. Never mix on a single screen.
* **Radii are angular** — `0`, `5px`, `999px`. Nothing between.
* **Three font families** — Inter (UI), Playfair Display (display · italic accent), JetBrains Mono (numerals · tags). Pretendard auto-resolves Korean.
* **`✦ AI-Report`** appears **only as the footer of a news article** (12px gold mono). Never on cards, banners, or boxes. The strings `AI GENERATED` and the `● AI-Report` card byline are permanently retired.
* **Round labels live only inside Arena VS Battle** — `"ROUND OF N · MATCH X/Y"`. Never on TournamentCard, Launch Pad, GNB, footers, or anywhere else.
* **Round names** — `ROUND OF 48 / 24 / 12 / 6` + `THE FINAL`. FIFA terminology (`QUARTERFINAL`, `SEMIFINAL`, `ROUND OF 16`) is banned.
* **No LIVE badge anywhere.** WC48 does not live-stream. The `LIVE` pill is permanently retired from TournamentCard, Arena, GNB, and every other surface.
* **No Vote Rate (%) on the Match VS screen.** Showing live rates during voting biases the next Voter — Vote Rate appears on the Ranking screen only.
* **No Match · Round deadlines.** Only **Tournament Deadline** exists. No "ENDS IN".
* **No emoji. No predictions / odds / betting language. No "FIFA" / "Official" text.**

## Terminology

The terminology contract is immutable. Use the official term exactly:

* **Tournament** (not event / contest), **Contestant** (not candidate / participant), **Match** (not battle / round), **Voter** (not user / fan), **Champion** (not winner), **Crown Card** (not result image), **Tournament Deadline** (Round Deadline does not exist), **Vote Rate** (not Vote Count in UI), **Tournament Host** (not admin / creator).

## Output guidance

* **Visual artifact** (deck, share card, mock, hero, throwaway prototype) → emit one self-contained HTML file. Inline `colors_and_type.css` (or `@import` it). Copy brand SVGs and fonts you need into the output's folder. Use only `--wc-*` and `--color-*` tokens; never invent new color values.
* **Production code** (Next.js / Tailwind app) → read the rules and apply them. Do not hand-roll new colors. Do not invent emoji icons. Do not use red anywhere except `--color-crimson` for VS-right · live · error.
* **When invoked with no guidance** → ask what to build (deck? hero? component? full screen?), confirm the target domain (which of the seven), confirm Korean / English presence, then act as an expert designer.

## When in doubt

The thesis is **"Every screen should feel like a digital instrument."**

Twilight velvet. Gold detail. Measured percussive motion. Theatrical, never cute. Korean and English at equal weight. Magnetic buttons. Floating Island GNB. Crown Card as the final share artifact.
