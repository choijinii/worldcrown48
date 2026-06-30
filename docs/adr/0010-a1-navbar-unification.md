# ADR-0010 — A-1 Navbar unification (dark global head + site map)

- **Status**: Accepted (대표 결정 2026-06-29)
- **Context module**: A-1 The Pitch (Domain 1) — Phase F
- **Relates**: `docs/handoffs/A1-the-pitch-handoff.md` (§6 wireframe), CLAUDE.md 불변 원칙 #1 (듀얼 테마)

## Context

Two navs rendered on `/` at once: the global light `<Navbar>` (from the root
layout) and the A-1 wireframe's dark floating "Pitch GNB" (`GnbIsland`). They
visually collided, and both legitimately wanted to own primary navigation.

Separately, CLAUDE.md 불변 원칙 #1 scopes the dual theme as **Domain 0~3 dark /
Domain 4~6 light**. Read literally that implies the global Navbar would flip
light on Domain 4~6 — but the Navbar is one shared brand element across all
domains; flipping it per-route is both ugly and ill-defined (which theme on a
cross-domain overlay?).

## Decision

**1. One unified Navbar; the floating Pitch GNB is absorbed.**
`GnbIsland` is deleted. Its menu (The Pitch · The Lab · Locker Room · Vote Now)
and wireframe SVG icons move into the global `<Navbar>`. `/` shows exactly one
nav.

**2. The Navbar head is ALWAYS dark (brand global constant) — Option C.**
The dual-theme rule (#1) governs page **bodies** only. The Navbar is styled with
the dark `:root` tokens (`--color-bg-elevated`, `--color-border-gold`,
`--shadow-gnb`) and carries no `data-theme`. Because light theme is *scoped* to
`[data-theme="light"]/.domain-policy/.domain-locker` (globals.css) and the Navbar
sits above that subtree, it stays dark on Domain 4~6 (Locker Room · Policy Hub ·
Admin) while their bodies remain light. This refines #1: **theme is per-body;
the Navbar is a global brand constant.**

**3. Navbar moves to `components/layout/`.**
It is a layout component, not auth. `components/auth/Navbar.tsx` →
`components/layout/Navbar.tsx`; the only import (`app/layout.tsx`) is updated.

**4. ☰ hamburger → SiteMapSheet (Voter site map), always available.**
A left drawer (focus-trap-react, matching the repo modal convention — shadcn is
not scaffolded) lists all 7 domains from `lib/layout/domains.ts`: Domains
0·1·2·3·5 link out; 4 (Locker Room) and 6 (Admin Dashboard) are disabled
"Coming soon". This is the mobile nav fallback (the inline menu hides < 860px).

**5. The Dev Nav (Cmd/Ctrl+Shift+D) is unchanged and separate.**
☰ = Voter-facing site map (always visible); Dev Nav = developer tool (gated).

**6. Logo wordmark → v3.0 brand SVG.**
The "WORLD CROWN 48" text wordmark is replaced by
`public/brand/wc48-branding-horizontal-dark.svg` (copied from
`docs/design/wc48-logo v3.0/`, the #FCD006 anchor per CLAUDE.md #2).

## Consequences

- `pitch.css` `.pitch .gnb` rules removed (dead after GnbIsland deletion).
- `aria-label="Primary navigation"` now lives on the Navbar (global), so A-1
  E2E AC-1 still resolves it; the inline menu is hidden < 860px (☰ takes over).
- No hex literals in `navbar.css` — v2.4 tokens only (decision ③).
- Future domains (4·5·6) get the dark Navbar for free; only their bodies theme.
