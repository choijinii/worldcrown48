---
name: worldcrown48-design
description: Use this skill to generate well-branded interfaces and assets for WorldCrown48 (월드크라운 48 · AI-powered global-fandom tournament + news platform) — either for production or throwaway prototypes/mocks. Contains the Twilight Stadium v2.3 design tokens (colors, type, motion, noise overlay, magnetic buttons, Floating Island GNB, Cinematic Landing Page patterns), Pretendard font binaries, official logo + wordmark assets, and a clickable UI kit covering Domains 0–3 (Launch Pad → The Pitch → The Arena → Crown Card).
user-invocable: true
---

## ⛔ IMMUTABLE TERMINOLOGY RULE — 절대 불변 용어 규칙

> **RULE 1: NEVER change or overwrite an established term definition.**
> **RULE 2: When a new concept arises, CREATE A NEW TERM. Do NOT redefine existing terms.**
>
> 이 규칙은 모든 에이전트, 모든 세션, 모든 기여자에게 예외 없이 적용된다.
> 기존 용어를 임의로 변경하면 전체 모듈과 AI 뉴스 생성 전반에 연쇄 오류가 발생한다.
> 용어 정의의 단일 진실 공급원: `LANGUAGE.md`

---

## 필수 — 디자인 시작 전 읽기 순서

```
1. DESIGN_BRIEF.md (루트)         ← 금지 패턴 목록 + 최신 컬러 토큰
2. CLAUDE.md (루트)               ← 불변 원칙 8가지
3. docs/design/WC48_DESIGN_SYSTEM_v2.3.md  ← 디자인 토큰 단일 진실 공급원
4. (Domain 0 작업 시) docs/design/Cinematic Landing Page Builder.md ← 시네마틱 패턴
```

> ⚠️ `_archive/`, `uploads/`, `reference/` 폴더의 구버전 파일 읽기 금지.
> `WC48_DESIGN_SYSTEM_v2.3.md` 하나만 사용하세요.

---

Read `README.md` in this skill folder first — it carries the brand voice, palette ratios,
visual foundations, motion rules, and a file index.

Other top-level files to know about:
- `colors_and_type.css` — single source of truth for tokens. Import this into every artifact.
- `fonts/` — self-hosted Pretendard (9 weights, .otf). Brand-mandatory; do not substitute.
- `assets/` — Crown logo SVGs, wordmark, branding lockups, crown PNG variants. Never redraw.
- `WC48_DESIGN_SYSTEM_v2.3.md` — full Korean spec, v2.3 source of truth (Round Scope Lock Release).
- `Cinematic Landing Page Builder.md` — Domain 0 (Launch Pad) cinematic UI patterns.
- `preview/` — one HTML card per token group; useful for visual reference.
- `ui_kits/worldcrown48/` — production-shaped React components (Babel-in-browser); copy
  individual `.jsx` files when you need a battle-tested implementation.

When the user invokes this skill:
1. If creating a **visual artifact** (slides, mocks, marketing pages, throwaway prototypes),
   copy the assets you need out of this folder, link `colors_and_type.css`, and write a
   static HTML file the user can view.
2. If working on **production code**, treat this skill as a tokens-and-vocabulary reference.
   Lift values verbatim — hex codes, radii, easings, copy patterns.
3. If the request is for **Domain 0 (Launch Pad)** — read `Cinematic Landing Page Builder.md`
   and apply the 7 cinematic patterns (see below).
4. If invoked with **no other guidance**, ask the user what they want to build, run a couple
   of clarifying questions (which Domain? dark or light theme? marketing or in-product?),
   then act as an expert designer.

---

## Hard Rules — never relax without the owner's say-so

- AI-Report disclosure is **Footer-Only Lock** (v2.5, 2026-07-22) — NOT "AI GENERATED", NOT a card badge.
  One place only: the very bottom of the article body block —
  `✦ AI-Report · 발행인이 검토·승인했습니다 · DATA {timestamp}` (8px, 50% opacity, `--color-gold`, mono).
  ⛔ Retired: the `● AI-Report` 11px card badge / `.ai-report-badge` and the 12px inline article block.
  No AI badge on cards, lists, Crown Card, Lab, Policy, or Locker Room.
- Show **vote rate %** only — never raw vote counts. Vote rate is visible on **Ranking screens only**. NEVER on VS Battle / voting screens.
- No "FIFA" / no "Official".
- No `#000000` in dark surfaces; use `#00003A` (--color-bg-deep).
- **NEVER use v1 color codes**: `#05070A`, `#0A0D12`, `#F8FAFC`, `#30363D`, `#8B949E`.
  Use the current tokens: `#00003A`, `#0E0944`, `#F2F2F5`, `#2D1C5A`, `#484B67` instead.
- Crown logo is **only** the registered SVGs (`assets/wc48-*.svg`, `assets/crown-gold-*.png`).
  Do not draw your own crown.
- Functional icons (search, settings, share, arrows, etc.) are **Lucide** (official) — drop in
  via `<script src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js"></script>` +
  `<i data-lucide="name"></i>` + `lucide.createIcons()`. Stroke width 1.75, tint via `color`.
  Never substitute another icon family.
- Every primary CTA is a magnetic button (scale 1.03 + sliding bg). Forbidden: bare
  `:hover { opacity: 0.7 }`.
- Honour `prefers-reduced-motion: reduce` on every animation.
- No `Round n/total` progress bar in Tournament cards (Round = Voter-personal, not global).
- No `ENDS IN hh:mm:ss` countdown in Arena (Match/Round have no deadline).
- No `"Crown odds"` or `"projected winner"` language (violates service identity).
- **NEVER use FIFA-style round names**: `ROUND OF 16`, `ROUND OF 32`, `QUARTERFINAL`, `SEMIFINAL`.
  WC48 has 48 contestants. Correct round names (English):
  `ROUND OF 48` (24 matches) → `ROUND OF 24` (12) → `ROUND OF 12` (6) → `ROUND OF 6` (3) → `THE FINAL` (1)
- **Round Card UI is FORBIDDEN** — Round is a Voter-personal value with no DB document. Never create `<RoundCard />`, Round lists, or Round grids. **Round info appears ONLY in `<RoundTransition>` events (1–2s full-screen animation between rounds)** — never as a HUD on the VS Battle screen. The Voter is a *player inside the match*, not a spectator watching from outside.
- **LIVE badge is FORBIDDEN in TournamentCard** — Tournament is solo (one Voter at a time). LIVE implies simultaneous multi-user participation, which misrepresents the service.

---

## ⛔ ARENA VS BATTLE — ABSOLUTE ZERO LIST (2026-05-27 반복 오류 확정)

> These exact patterns were generated in a real session on 2026-05-27. They are permanently banned.

**NEVER generate any of the following on the Arena VS Battle screen:**

```
❌ "2026-05-26 · 14:32 KST"     ← timestamp / date / time of any kind
❌ "VOTE 3/5 TODAY"              ← daily vote counter
❌ "54% VOTE RATE"               ← vote rate on voting screen
❌ "MATCH 7/24 · VOTE 3/5 TODAY" ← combined forbidden pattern
❌ "RANKING ONLY" label          ← implies vote rate is shown (it must not be)
❌ "ENDS IN 03:14:22"            ← countdown timer
❌ "LIVE" badge                  ← no simultaneous participation
❌ Round progress % or bar       ← Round = Voter-personal value
❌ "{라운드명} · MATCH {n}/{total}" ← HUD itself is forbidden (Voter = player, not spectator)
❌ Any text HUD showing round name or match number
```

**The Arena VS Battle screen has NO text HUD for round/match progress.**
Round info appears ONLY in `<RoundTransition>` event screens (between rounds, 1–2s auto-transition).
Example: `"🎉 ROUND OF 24 BEGINS"` shown only at the transition moment, never persistently.

**Rule summary — Arena VS Battle has NO:**
- Time (no timestamps, no dates, no "today", no "this week", no KST)
- Vote rate or vote count of any kind
- Daily/weekly limits displayed
- Timers or countdowns
- LIVE badges

---

## Cinematic Landing Page Builder — Domain 0 통합 가이드

> Domain 0 (Launch Pad) 작업 시 반드시 이 섹션을 적용하세요.
> 상세 코드: `docs/design/Cinematic Landing Page Builder.md`
> 컴포넌트 규격: `WC48_DESIGN_SYSTEM_v2.3.md` → §4-C, §10-A, §10-B

### 7가지 필수 Cinematic 요소

```
1. Noise Overlay
   역할: 전면 grain texture (premium 질감)
   구현: position:fixed, z-index:9999, opacity:0.035, pointer-events:none
   배경: repeating-conic-gradient(transparent, rgba(255,255,255,0.02) 1px)

2. GNB Island (Floating Island)
   역할: 스크롤 후 축소되는 플로팅 네비게이션 바
   구현: backdrop-blur(20px) + border-radius(999px) + 스크롤 감지 transition
   상태: 확장(scrolled=false) ↔ 축소(scrolled=true)

3. Magnetic Button
   역할: 마우스 위치 추적 hover 효과
   구현: mousemove 이벤트 → transform: translate(dx, dy) + GSAP 4ms 지연
   적용: 모든 primary CTA (Join, Vote, Share 등)

4. Hero GSAP Entrance
   역할: 페이지 진입 시 staggered 페이드업 애니메이션
   구현: gsap.from(".fade-up", { opacity:0, y:40, stagger:0.1, duration:0.7 })
   의존: GSAP 3.12 (`<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.7/gsap.min.js">`)

5. Interactive Feature Cards (§4-C)
   3종: TournamentShuffler · VoteFeedTypewriter · MatchScheduler
   TournamentShuffler: 3초마다 카드 자동 교체 (FIFA → K-POP → OTHER)
   VoteFeedTypewriter: 실시간 투표 피드 타이핑 효과
   MatchScheduler: 라운드 진행 막대 애니메이션

6. Philosophy Section (§10-A)
   역할: 브랜드 철학 + 6-item 그리드 (GSAP ScrollTrigger parallax)
   구현: ScrollTrigger.create → heading 0.3배 시차 스크롤
   의존: GSAP ScrollTrigger 플러그인

7. Sticky Stacking Archive (§10-B)
   역할: 3카드 pin-on-scroll 스토리텔링 (Launch → Vote → Crown)
   구현: ScrollTrigger pin:true + scrub:1 → 카드 순차 appear
   카드 순서: "Join the Arena" → "Cast Your Vote" → "Claim the Crown"
```

### 의존성 CDN 링크

```html
<!-- GSAP 3.12 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.7/gsap.min.js"></script>
<!-- GSAP ScrollTrigger (§10-A, §10-B 필수) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.7/ScrollTrigger.min.js"></script>
<!-- Lucide Icons -->
<script src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js"></script>
```

### 체크리스트 — Domain 0 완료 기준

- [ ] Noise Overlay 적용 (opacity 0.035)
- [ ] GNB Island 스크롤 전환 동작
- [ ] Magnetic Button 마우스 추적 동작
- [ ] Hero GSAP stagger 진입 애니메이션
- [ ] 3종 Feature Card 인터랙션 동작
- [ ] Philosophy Section ScrollTrigger 동작
- [ ] Sticky Stacking 3카드 pin-on-scroll 동작
- [ ] AI-Report 표기 = v2.5 Footer-Only Lock (`✦ AI-Report` 기사 푸터 1곳·8px·50%). 카드 배지 0개, "AI GENERATED" 0건
- [ ] v2.3 컬러 토큰 사용 (v1 코드 없음)
- [ ] `prefers-reduced-motion` 대응

---

## 컬러 토큰 빠른 참조

> 디자인 토큰 색·폰트 값의 단일 진실은 `docs/design/colors_and_type.css`입니다 (2026-05-25 로고 v3.0 정합). 값을 여기에 중복 기재하지 않습니다.

---

*© 2026 WorldCrown48 | docs/design/SKILL.md v2.3 | CONFIDENTIAL*
