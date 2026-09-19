# Claude Design Request — Per-Domain Interactive UI Mockups
# Claude Design 요청서 — 도메인별 인터랙티브 UI 목업 (v4 · 2026-05-30)

> **v4 fully replaces v3 / v3.1.**
> v3/v3.1 asked Claude Design for **module architecture specifications** — it
> returned "here is how to organize the code" documents instead of actual UI.
> v4 asks Claude Design to **design the actual screens** of every domain as
> **clickable HTML prototypes** with hover, focus, loading, and success/error
> states, at mobile + tablet + desktop breakpoints, using the approved Twilight
> Stadium tokens and self-hosted Pretendard.

> **v4는 v3 / v3.1을 완전히 대체합니다.**
> v3/v3.1은 Claude Design에게 **모듈 아키텍처 명세서**를 요청해서 "코드 정리
> 방법" 문서만 나왔습니다. 실제 UI 디자인이 아니었습니다.
> v4는 Claude Design에게 각 도메인의 **실제 화면**을 **클릭 가능한 HTML
> 프로토타입**으로 직접 디자인하게 합니다. Hover·Focus·Loading·Success·
> Error 상태, 모바일·태블릿·데스크탑 3개 브레이크포인트, 승인된 Twilight
> Stadium 토큰 + 자체 호스팅 Pretendard 사용.

---

## 📋 Prompt index · 프롬프트 인덱스

| # | Prompt | Agent IDs | Theme | MVP | Reference |
|---|--------|-----------|-------|-----|-----------|
| 0 | Brand Visual Guide (one-pager) | — | both | — | Twilight Stadium v2.1 |
| 1 | Domain 0 — Launch Pad | `A0` | dark | 1 | skill kit · refine |
| 2 | Domain 1 — The Pitch | `A1` | dark | 1 | skill kit · refine |
| 3 | Domain 2 — The Lab (admin) | `B1` | dark | 1 | extend kit pattern |
| 4 | Domain 3 — The Arena cluster | `C1`–`C5` | dark | 1 / 1.5 / 2 | skill kit · refine + extend |
| 5 | Domain 4 — The Locker Room | `D1` | light | 2 | NEW (no kit yet) |
| 6 | Domain 5 — Policy Hub | `E1` | light | 1 | NEW (no kit yet) |
| 7 | Domain 6 — Admin Dashboard | `G1` | light | 1 | NEW (no kit yet) |

---

## 🧭 How to use · 사용 가이드

**EN.**
1. Start with Prompt 0 — Brand Visual Guide. It produces the single one-pager that proves the brand primitives (color, type, motion, magnetic buttons, Floating Island GNB, theme toggle) work. Every subsequent domain mock must look and feel like this page.
2. Domain prompts (1–7) are independent of each other. Run them in any order — pick whichever you want to see first. Domain 0–3 (dark) and Domain 4–6 (light) can run in parallel.
3. Each English block is the canonical message to paste into a fresh Claude Design session. Korean translation below is your reference.
4. The `worldcrown48-design` skill must be available to Claude Design. It already contains: Twilight Stadium v2.1 tokens, Pretendard fonts (9 weights, .otf), logo + wordmark assets, magnetic-button + Floating-Island-GNB patterns, the clickable UI kit covering Domains 0–3. **Domain 0–3 prompts ask Claude Design to refine the existing kit. Domain 4–6 prompts start fresh (no kit yet) using the same tokens in light theme.**
5. When Claude Design returns, share back to Cowork. We verify against the per-prompt self-verification checklist and draft a follow-up if anything fails.

**KO.**
1. Prompt 0 (Brand Visual Guide)부터 시작합니다. 브랜드 기본 요소(색·타입·모션·매그네틱 버튼·Floating Island GNB·테마 토글)가 모두 살아 있는 단일 원페이지를 만듭니다. 이후 모든 도메인 목업은 이 페이지의 룩앤필을 따라야 합니다.
2. 도메인 프롬프트(1~7)는 서로 독립입니다. 보고 싶은 순서대로 실행하세요. 다크군(Domain 0~3)과 라이트군(Domain 4~6)은 병렬 실행 가능.
3. 각 영문 블록이 새 Claude Design 세션에 붙여 넣을 정본입니다. 한국어 번역은 대표님 참조용.
4. `worldcrown48-design` 스킬이 Claude Design에서 사용 가능해야 합니다. 스킬에는 이미: Twilight Stadium v2.1 토큰, Pretendard 폰트(9 weights, .otf), 로고+워드마크 자산, 매그네틱 버튼+Floating Island GNB 패턴, Domain 0~3 클릭형 UI 킷이 포함되어 있습니다. **Domain 0~3 프롬프트는 기존 킷을 다듬어 달라고 요청합니다. Domain 4~6 프롬프트는 킷이 아직 없으므로 같은 토큰의 라이트 테마 변형으로 새로 디자인합니다.**
5. Claude Design이 결과를 보내오면 Cowork에 공유해 주세요. 각 프롬프트의 자기 검증 체크리스트로 검수하고 미달 시 후속 프롬프트를 작성하겠습니다.

---

## ⚠️ Cross-prompt visual brand rules · 모든 프롬프트 공통 브랜드 규칙

These rules apply to **every** UI deliverable below. Each prompt repeats them for safety.

아래 규칙은 **모든** UI 산출물에 공통 적용됩니다. 각 프롬프트가 안전을 위해 반복 명시합니다.

- **Theme.** Dark surfaces use the deep-twilight gradient anchored on the Logo SVG palette — **never pure black**. Light surfaces use the off-white / cream / `--color-surface-light` tokens defined by the design system's `colors_and_type.css`. The design system's currently-authorized light surface tokens (which may include `#FFFFFF` for `--color-surface-light`) are permitted — what is prohibited is hand-rolling a raw `#FFFFFF` outside the token system.
- **Accent.** Crown Gold (the hue from the registered logo SVG) is the **only** accent yellow. No neon yellow, no fluorescent green, no other gold variants.
- **Type.** Four families exist in the contract:
  - **Pretendard** = Korean body fallback. **Self-hosted only** from the `worldcrown48-design` skill's `fonts/` directory (9 weights, .otf). Brand-mandatory; must not be substituted. CDN load is prohibited.
  - **Inter** (UI workhorse), **Playfair Display** (display + italic accent), **JetBrains Mono** (numerals + tags) = loaded via Google Fonts CDN per the design system's `colors_and_type.css` (single `@import`). Playfair Display also has a self-hosted local fallback in `fonts/`.
  - Pretendard auto-resolves Korean characters via the `--font-sans` stack. Never set Korean in Playfair.
- **Motion.** Magnetic buttons (subtle cursor-follow translation on hover). Stagger keyframes for list entry. Reduced-motion preference is always honored — every animation disables when `prefers-reduced-motion: reduce`.
- **Texture.** Film grain overlay on dark surfaces.
- **Navigation.** Floating Island GNB (where the lite-spec requires navigation).
- **Token-only rule.** All visual values in CSS, inline `style`, and SVG `fill`/`stroke` reference design tokens via `var(--token-*)`, `currentColor`, or CSS-driven fill. **No hex literal appears in the deliverable source — except inside the registered logo SVG assets themselves (which ARE the color anchor).**
- **Universal prohibitions** (from CLAUDE.md + README.md). No "FIFA", no "Official", no Korean-only motif, no Vote Count (absolute numbers), no legacy "AI GENERATED" label, no legacy "● AI-Report" card byline (both retired). The current AI form is "✦ AI-Report" (12px JetBrains Mono gold) appearing ONLY as the footer of a news article — never on cards, banners, boxes, or any other surface. No betting/prediction language, no real-match-result linking.

---

# 0️⃣ Prompt 0 — Brand Visual Guide one-pager
# 0️⃣ 프롬프트 0 — 브랜드 비주얼 가이드 원페이지

> Output: a single self-contained HTML file proving every brand primitive works.
> Every subsequent domain mock must look like this page.
>
> 산출물: 모든 브랜드 기본 요소가 작동하는 단일 HTML 파일. 이후 모든 도메인 목업이 이 페이지의 룩앤필을 따라야 합니다.

### [EN] Send this to Claude Design

```
Role: You are the brand visual designer for WorldCrown48.
Scope: Produce ONE interactive HTML one-pager that demonstrates every brand
primitive in working order. This page is the visual contract every subsequent
domain mock must obey.

[0] Required reading
1) /CLAUDE.md  (8 immutable invariants — Crown Gold #FCD006 ONLY, dark/light split, etc.)
2) /LANGUAGE.md  (official terminology)
3) /docs/design/WC48_DESIGN_SYSTEM_v2.4.md  (token single source of truth)
4) /docs/design/README.md  (14 prohibitions)
5) /docs/design/CHANGELOG.md
6) worldcrown48-design skill — Twilight Stadium v2.1 tokens, self-hosted
   Pretendard (fonts/ 9 weights .otf), logo + wordmark + lockup assets,
   magnetic-button pattern, Floating Island GNB pattern, noise overlay
   primitive, the existing Domain 0–3 clickable UI kit
7) Logo SVG assets (color anchor)

[1] Deliverable — single self-contained HTML file (.html)
A scrollable brand reference page with these sections, all live:

  Section A · Color tokens
    Every color token as a labelled swatch. Dark group on the upper half;
    light group on the lower half. Each swatch shows: the token name (e.g.
    --color-bg-deep), the swatch fill, and a small caption noting the hue
    comes from the registered logo SVG. The page itself uses var(--token-*)
    for everything except the swatch fills (which by definition display the
    resolved color).

  Section B · Type
    Pretendard in every weight in use, plus the secondary display family
    for headlines, plus the monospace family for counters. Each shown as a
    sample sentence in BOTH Korean and English. Include H1/H2/H3, body,
    caption, monospace numeric sample.

  Section C · Space + Radius
    The spacing scale rendered as labelled rectangles. The radius scale
    rendered as rounded rectangles. Each labelled with its token name.

  Section D · Motion
    Live demos:
      - Magnetic button: cursor-follow translate + glow on hover, with
        gold primary CTA visual
      - Stagger keyframe: a row of cards entering with staggered fade-up
      - Floating Island GNB: a horizontal pill nav with hover and active states
      - Noise overlay: toggle on/off control

  Section E · Shadow
    Shadow set rendered on both a twilight card and a cream card.

  Section F · Brand assets
    Crown mark (filled + outline variants), wordmark, lockup — each at the
    sizes the design system authorizes. Loaded from the brand registry.

  Section G · Theme + reduced-motion controls
    Two toggles at the top of the page:
      - Theme: switches the document's [data-theme] attribute between
        "dark" and "light". The entire page re-skins live via tokens.
        Every visual surface in every section above must respond.
      - Reduced-motion: when on, every animation in section D freezes.

[2] Interactions to demonstrate
- Hover on the magnetic button: visible cursor-follow translate + halo glow
- Focus ring on the gold CTA: keyboard-accessible focus outline
- Theme toggle re-skins the entire page in under 150ms
- Reduced-motion toggle disables every animation in section D

[3] Strict rules
- Pretendard is self-hosted via the worldcrown48-design skill's fonts/
  directory. Pretendard must NOT load from a CDN. Inter, Playfair Display,
  and JetBrains Mono follow the design system's colors_and_type.css single
  @import from Google Fonts CDN (Pretendard is the only family the design
  system requires self-hosted).
- Every CSS value, inline style attribute, and SVG fill/stroke references
  a token (var(--token-*), currentColor, or CSS-driven fill). No hex
  literal appears in source — EXCEPT inside the registered logo SVG
  assets themselves (color anchor), AND inside the swatch fill demos in
  Section A (which intentionally display the resolved hex as a brand
  reference — these are clearly labelled as reference swatches).
- No "FIFA", no "Official", no Korean-only motif.
- Dark surfaces never use pure black. Light surfaces use the design system's `--color-surface-light` and related tokens — raw `#FFFFFF` outside the token system is prohibited.
- Crown Gold (#FCD006 — from the logo SVG) is the ONLY accent yellow.

[4] Output
A single .html file that opens standalone in a browser. All assets bundled
(Pretendard .otf files inlined as @font-face with data: URIs from the
worldcrown48-design skill's fonts/ directory; logo SVGs inlined; no external
No runtime network request for Pretendard at runtime; Inter / Playfair / JetBrains via Google Fonts CDN per the design system is permitted).

[5] Self-verification (include in final report)
- Pretendard is self-hosted from the worldcrown48-design skill's fonts/. Inter / Playfair Display / JetBrains Mono via Google CDN is OK per the design system.
- All non-swatch values reference tokens via var(--token-*) / currentColor
- No hex literal appears in source outside logo SVGs and Section A swatches
- Magnetic button hover demonstrably translates toward cursor
- Theme toggle re-skins all surfaces via [data-theme]
- Reduced-motion preference disables all section-D animations
- Both dark and light theme groups render correctly through the toggle
- README 14 prohibitions: 0 violations
- No "FIFA", no "Official", no pure black surfaces, no hand-rolled raw `#FFFFFF` outside the design system tokens, no Korean-only motif
- Page opens standalone in a browser. Pretendard is fully bundled (no Pretendard CDN request). Inter / Playfair / JetBrains may load from Google Fonts CDN per the design system — this is permitted.

Deliver the single .html file.
```

### [KO] 한국어 참조 번역

```
역할: 당신은 WorldCrown48 브랜드 비주얼 디자이너입니다.
범위: 모든 브랜드 기본 요소가 실제로 작동하는 인터랙티브 HTML 원페이지 1장을
만듭니다. 이 페이지가 이후 모든 도메인 목업이 따라야 할 비주얼 계약서입니다.

[0] 작업 전 필독
1) /CLAUDE.md  (8개 불변 원칙 — Crown Gold #FCD006만, 다크/라이트 분리 등)
2) /LANGUAGE.md  (공식 용어)
3) /docs/design/WC48_DESIGN_SYSTEM_v2.4.md  (토큰 단일 진실)
4) /docs/design/README.md  (14개 금지 항목)
5) /docs/design/CHANGELOG.md
6) worldcrown48-design 스킬 — Twilight Stadium v2.1 토큰, 자체 호스팅
   Pretendard(fonts/ 9 weights .otf), 로고+워드마크+락업 자산, 매그네틱 버튼
   패턴, Floating Island GNB 패턴, 노이즈 오버레이 프리미티브, Domain 0~3
   기존 클릭형 UI 킷
7) 로고 SVG 자산 (색상 앵커)

[1] 산출물 — 단일 HTML 파일 (.html)
모든 섹션이 살아 있는 스크롤형 브랜드 레퍼런스 페이지:

  섹션 A · 색상 토큰
    모든 색상 토큰을 라벨이 붙은 스와치로. 상단 절반 = 다크군, 하단 절반 =
    라이트군. 각 스와치는 토큰명(예: --color-bg-deep), 스와치 컬러, 그리고
    "이 색상은 등록된 로고 SVG에서 가져옴" 캡션 표시. 페이지 자체는
    var(--token-*) 사용 (스와치 컬러는 정의상 해석된 색상을 표시).

  섹션 B · 타이포
    Pretendard의 사용 중인 모든 weight + 헤드라인용 보조 디스플레이 패밀리 +
    카운터용 모노스페이스 패밀리. 각각 한글·영문 샘플 문장. H1/H2/H3, 본문,
    캡션, 모노스페이스 숫자 샘플 포함.

  섹션 C · 스페이스 + 라디우스
    스페이싱 스케일을 라벨이 붙은 사각형으로. 라디우스 스케일을 둥근 사각형으로.
    각각 토큰명 라벨.

  섹션 D · 모션
    라이브 데모:
      - 매그네틱 버튼: 호버 시 커서 추적 이동 + 글로우 (골드 프라이머리 CTA)
      - 스태거 키프레임: 카드 행이 순차 페이드업 입장
      - Floating Island GNB: 가로 알약 네비, hover/active 상태
      - 노이즈 오버레이: on/off 토글 컨트롤

  섹션 E · 그림자
    Shadow set을 트와일라이트 카드와 크림 카드 양쪽에 렌더링.

  섹션 F · 브랜드 자산
    크라운 마크(filled + outline), 워드마크, 락업 — 디자인 시스템이 허가한
    사이즈로. 브랜드 레지스트리에서 로드.

  섹션 G · 테마 + reduced-motion 컨트롤
    페이지 상단에 토글 2개:
      - 테마: [data-theme]를 "dark" ↔ "light" 전환. 전체 페이지가 토큰을
        통해 라이브 재스킨. 위 모든 섹션의 모든 비주얼이 반응해야 함.
      - reduced-motion: on이면 섹션 D의 모든 애니메이션 정지.

[2] 시연 인터랙션
- 매그네틱 버튼 호버: 커서 추적 이동 + 후광 글로우 가시화
- 골드 CTA 포커스 링: 키보드 접근성 포커스 아웃라인
- 테마 토글: 150ms 이내 전체 페이지 재스킨
- reduced-motion 토글: 섹션 D 모든 애니메이션 비활성화

[3] 엄격 규칙
- Pretendard는 worldcrown48-design 스킬의 fonts/ 디렉터리에서 자체 호스팅.
  Pretendard는 CDN 로드 금지. Inter·Playfair Display·JetBrains Mono는
  디자인 시스템 colors_and_type.css의 단일 @import에 따라 Google Fonts CDN
  사용 (디자인 시스템이 자체 호스팅을 요구하는 패밀리는 Pretendard 하나뿐).
- 모든 CSS 값, 인라인 style 속성, SVG fill/stroke는 토큰 참조
  (var(--token-*), currentColor, CSS 기반 fill). 등록된 로고 SVG 자산 내부 +
  섹션 A 스와치 데모(의도적으로 해석된 hex를 브랜드 레퍼런스로 표시 —
  레퍼런스 스와치임을 명시)를 제외하고는 소스 어디에도 hex 리터럴 없음.
- "FIFA"·"Official" 금지, 한국적 모티프 금지.
- 다크 표면에 순수 검정 금지. 라이트 표면은 디자인 시스템 `--color-surface-light` 등 토큰 사용 — 토큰 시스템 밖에서 hand-roll한 raw `#FFFFFF` 금지.
- Crown Gold (로고 SVG의 #FCD006)만 유일한 옐로 액센트.

[4] 산출물
브라우저에서 단독 실행되는 단일 .html 파일. 모든 에셋 번들링
(Pretendard .otf 파일을 worldcrown48-design 스킬의 fonts/에서 가져와
@font-face data: URI로 인라인; 로고 SVG 인라인; 런타임 외부 네트워크 요청 0건).

[5] 자기 검증 (결과 보고에 포함)
- Pretendard가 worldcrown48-design 스킬 fonts/에서 자체 호스팅인가. Inter·Playfair·JetBrains는 디자인 시스템 기준 Google CDN 허용
- 스와치 외 모든 값이 var(--token-*) / currentColor 토큰 참조인가
- 로고 SVG와 섹션 A 스와치 외에 소스에 hex 리터럴이 0건인가
- 매그네틱 버튼 호버가 커서 방향으로 이동하는가
- 테마 토글이 [data-theme]를 통해 모든 표면을 재스킨하는가
- reduced-motion이 섹션 D 모든 애니메이션을 비활성화하는가
- 다크·라이트 두 테마군이 토글로 정상 렌더링되는가
- README 14개 금지 항목 위반 0건인가
- "FIFA"·"Official"·순수 검정·hand-rolled raw `#FFFFFF`·한국적 모티프 0건인가 (디자인 시스템 토큰 `--color-surface-light` 사용은 허용)
- 페이지가 브라우저에서 단독 실행되는가 (Pretendard는 완전 번들링되어 CDN 요청 0건). Inter / Playfair / JetBrains는 디자인 시스템 기준 Google Fonts CDN 허용

단일 .html 파일을 제출하시오.
```

---

# 1️⃣ Prompt 1 — Domain 0 · Launch Pad (`A0`)
# 1️⃣ 프롬프트 1 — Domain 0 · Launch Pad (`A0`)

> Theme: **dark** · MVP **1** · 4 surfaces.
> 테마: **다크** · MVP **1** · 표면 4개.

### [EN] Send this to Claude Design

```
Role: You are the UI designer for WorldCrown48 Domain 0 — Launch Pad.
Scope: Produce ONE interactive HTML file that renders every A0 surface with
every required state, at mobile + tablet + desktop breakpoints.

[0] Required reading
1) /CLAUDE.md
2) /LANGUAGE.md
3) /docs/lite-specs/A0-launch-pad.md  (the ONLY source of truth for surfaces,
   copy, layout, behavior — read carefully, do not invent)
4) /docs/design/WC48_DESIGN_SYSTEM_v2.4.md  (tokens)
5) /docs/design/README.md  (14 prohibitions)
6) worldcrown48-design skill — Twilight Stadium tokens, self-hosted
   Pretendard, magnetic buttons, the existing Domain 0 entry in the
   clickable UI kit (your starting reference — refine and complete it)
7) Logo SVG assets

[1] Surfaces to render — all four, from the lite-spec
- LaunchHero: full-bleed twilight stage with crown mark + two-line serif
  manifesto ("WHO RULES THE WORLD?" / "FIND OUT SOON.") over a single
  gold radial halo. NO photographic background.
- CountdownTimer: monospace counter to the FIFA 2026 season-open transition
  the lite-spec authorizes (target: 2026-06-11 00:00 -05:00). Renders
  DAYS / HOURS / MINUTES / SECONDS units. (This is the ONLY counter A0
  displays. It is NOT a round timer, NOT a daily counter, NOT a match counter.)
- WaitlistForm: single email input with underline affordance and a gold
  primary submit. Submits to Firestore `waitlist` collection (visual only —
  do not implement Firebase; simulate states via UI controls).
- SNSLinks: centered row of stroke icons opening external destinations.

[2] States to demonstrate
- LaunchHero: static (no state changes).
- CountdownTimer: live ticking display.
- WaitlistForm: Default · Focused · Loading · Success · Duplicate · Invalid-email.
  Provide a small state-switcher control so all five non-default states are
  reviewable without actually submitting.
- SNSLinks: Default (muted stroke) · Hover (gold fill or stroke transition).
- For all interactive elements: visible focus ring (keyboard accessibility).
- Reduced-motion preference: when on, every transition disables.

[3] Responsive — show all three breakpoints
- Mobile 375px: LaunchHero stacked tight; CountdownTimer 2×2 grid;
  WaitlistForm full-width; SNSLinks centered row, smaller icons
- Tablet 768px: LaunchHero centered with side margins; CountdownTimer 4×1 row;
  WaitlistForm capped width; SNSLinks centered row, medium icons
- Desktop 1440px: LaunchHero full-bleed with generous margins; CountdownTimer
  large 4×1 row; WaitlistForm capped width centered; SNSLinks centered row,
  full-size icons
Provide a breakpoint switcher control (Mobile / Tablet / Desktop chips) at
the top of the page that resizes the preview frame OR snaps the document to
each width — whichever lets the reviewer see all three side-by-side or one-at-a-time.

[4] Brand application
- Background: deep twilight gradient anchored on the logo SVG palette (never pure black)
- Accent: Crown Gold from the logo SVG (gold halo behind hero, gold CTA on
  WaitlistForm, gold hover state on SNS icons)
- Type: Pretendard self-hosted via worldcrown48-design skill's fonts/.
  Serif italic from the design system for the two-line manifesto.
  Monospace for CountdownTimer digits.
- WaitlistForm primary CTA = magnetic button (cursor-follow translate on hover)
- Film grain overlay on the LaunchHero stage
- Floating Island GNB is NOT present in A0 (this is a single-page pre-launch
  landing — no navigation between sections)

[5] Strict rules — prohibitions still apply
- No "FIFA" text on any surface (use neutral language like "global tournament
  season opens" — the lite-spec's exact copy is the source of truth)
- No "Official" text anywhere
- No Vote Count, no Vote Rate (%) — A0 has no voting yet
- No round name, no round badge, no match counter
- CountdownTimer counts ONLY to the single season-open transition; no other
  counter exists in A0
- No legacy "AI GENERATED" label and no legacy "● AI-Report" card byline. The current form is "✦ AI-Report" (12px JetBrains Mono gold) news-article-footer-only
- No pure black surface
- All CSS, inline style, SVG fills reference tokens via var(--token-*) or
  currentColor. No hex literal in source outside the logo SVG asset.
- Pretendard self-hosted only. Inter / Playfair Display / JetBrains Mono load via Google Fonts CDN per the design system's colors_and_type.css single @import.

[6] Output
A single .html file that opens standalone in a browser. Pretendard inlined
via @font-face data: URIs from the worldcrown48-design skill's fonts/
directory. Logo SVG inlined. All four surfaces visible in one document with
state-switcher controls for WaitlistForm and a breakpoint switcher at the
top. No runtime network request for Pretendard (it must be self-hosted from the worldcrown48-design skill's fonts/). The design system's `colors_and_type.css` may load Inter / Playfair Display / JetBrains Mono from Google Fonts CDN — this is permitted.

[7] Self-verification (include in final report)
- All four surfaces from A0-launch-pad.md present (LaunchHero, CountdownTimer, WaitlistForm, SNSLinks)
- All six WaitlistForm states demonstrated (Default, Focused, Loading, Success, Duplicate, Invalid-email)
- SNSLinks Default + Hover demonstrated
- Mobile + Tablet + Desktop breakpoints all render correctly
- Pretendard self-hosted from worldcrown48-design skill fonts/. Inter / Playfair / JetBrains via Google CDN per the design system.
- No hex literal in source outside the logo SVG asset
- No "FIFA", no "Official", no Vote Count, no Vote Rate, no round badge, no
  round name, no match counter, no "AI generated" label, no pure black
- Magnetic button on WaitlistForm CTA demonstrably follows cursor on hover
- Film grain overlay visible on LaunchHero stage
- Reduced-motion preference disables all transitions
- README 14 prohibitions: 0 violations
- A0-launch-pad.md cited as scope's single source of truth

Deliver the single .html file.
```

### [KO] 한국어 참조 번역

```
역할: 당신은 WorldCrown48 Domain 0 — Launch Pad UI 디자이너입니다.
범위: A0의 모든 표면을 모든 필수 상태로, 모바일·태블릿·데스크탑 3개
브레이크포인트에서 렌더링하는 인터랙티브 HTML 파일 1개를 만듭니다.

[0] 작업 전 필독
1) /CLAUDE.md
2) /LANGUAGE.md
3) /docs/lite-specs/A0-launch-pad.md  (표면·카피·레이아웃·동작의 유일한 단일
   진실 — 꼼꼼히 읽고 임의 추가 금지)
4) /docs/design/WC48_DESIGN_SYSTEM_v2.4.md  (토큰)
5) /docs/design/README.md  (14개 금지 항목)
6) worldcrown48-design 스킬 — Twilight Stadium 토큰, 자체 호스팅 Pretendard,
   매그네틱 버튼, 기존 클릭형 UI 킷의 Domain 0 항목(시작점 레퍼런스 —
   다듬고 완성할 것)
7) 로고 SVG 자산

[1] 렌더링할 표면 — 4개 전부, lite-spec 기준
- LaunchHero: 풀블리드 트와일라이트 스테이지 + 크라운 마크 + 두 줄 세리프
  매니페스토("WHO RULES THE WORLD?" / "FIND OUT SOON.") + 골드 라디얼 후광 1개.
  사진 배경 금지.
- CountdownTimer: lite-spec이 허가한 FIFA 2026 시즌 오픈 전환 시점
  (2026-06-11 00:00 -05:00)을 향한 모노스페이스 카운터. DAYS / HOURS /
  MINUTES / SECONDS 유닛 렌더링. (A0가 노출하는 유일한 카운터. 라운드 타이머
  아님, 일일 카운터 아님, 매치 카운터 아님.)
- WaitlistForm: 밑줄 어포던스가 있는 단일 이메일 입력 + 골드 프라이머리
  서밋. Firestore `waitlist` 컬렉션으로 제출 (시각만 — Firebase 실제 구현
  금지; 상태는 UI 컨트롤로 시뮬레이션).
- SNSLinks: 외부 목적지를 새 컨텍스트에서 여는 스트로크 아이콘 가운데 정렬 행.

[2] 시연할 상태
- LaunchHero: 정적 (상태 변화 없음).
- CountdownTimer: 라이브 틱 디스플레이.
- WaitlistForm: Default · Focused · Loading · Success · Duplicate · Invalid-email.
  실제 제출 없이 5개 비기본 상태를 검토할 수 있도록 작은 상태 스위처 컨트롤 제공.
- SNSLinks: Default (muted stroke) · Hover (gold fill 또는 stroke 트랜지션).
- 모든 인터랙티브 요소에 가시 포커스 링 (키보드 접근성).
- reduced-motion: on일 때 모든 트랜지션 비활성화.

[3] 반응형 — 3개 브레이크포인트 전부 표시
- Mobile 375px: LaunchHero 타이트 스택; CountdownTimer 2×2 그리드;
  WaitlistForm 풀폭; SNSLinks 가운데 정렬 행, 작은 아이콘
- Tablet 768px: LaunchHero 가운데 정렬 + 사이드 마진; CountdownTimer 4×1 행;
  WaitlistForm 폭 제한; SNSLinks 가운데 정렬 행, 중간 아이콘
- Desktop 1440px: LaunchHero 풀블리드 + 넉넉한 마진; CountdownTimer 큰 4×1 행;
  WaitlistForm 폭 제한 가운데 정렬; SNSLinks 가운데 정렬 행, 풀 사이즈 아이콘
페이지 상단에 브레이크포인트 스위처 컨트롤(Mobile / Tablet / Desktop chips)을
배치해 프리뷰 프레임을 리사이즈하거나 문서를 각 폭으로 스냅 — 검수자가 3개를
나란히 또는 하나씩 볼 수 있게.

[4] 브랜드 적용
- 배경: 로고 SVG 팔레트에 앵커된 딥 트와일라이트 그라디언트 (순수 검정 금지)
- 액센트: 로고 SVG의 Crown Gold (히어로 뒤 골드 후광, WaitlistForm 골드 CTA,
  SNS 아이콘 골드 호버)
- 타입: worldcrown48-design 스킬의 fonts/에서 자체 호스팅 Pretendard.
  두 줄 매니페스토는 디자인 시스템의 세리프 이탤릭.
  CountdownTimer 숫자는 모노스페이스.
- WaitlistForm 프라이머리 CTA = 매그네틱 버튼 (호버 시 커서 추적 이동)
- LaunchHero 스테이지에 필름 그레인 오버레이
- A0에는 Floating Island GNB 없음 (단일 페이지 사전 공개 랜딩 — 섹션 간
  네비게이션 없음)

[5] 엄격 규칙 — 금지 사항
- 모든 표면에 "FIFA" 텍스트 금지 ("global tournament season opens" 같은
  중립 표현 사용 — lite-spec의 정확한 카피가 단일 진실)
- 어디에도 "Official" 텍스트 금지
- Vote Count, Vote Rate(%) 금지 — A0는 아직 투표 없음
- 라운드명, 라운드 배지, 매치 카운터 금지
- CountdownTimer는 시즌 오픈 단일 전환 시점만 카운트; A0에 다른 카운터 없음
- 구버전 "AI 생성됨" 라벨 금지
- 순수 검정 표면 금지
- 모든 CSS·인라인 style·SVG fill은 var(--token-*) 또는 currentColor 토큰 참조.
  로고 SVG 자산 외 소스에 hex 리터럴 0건.
- Pretendard만 자체 호스팅 강제. Inter·Playfair·JetBrains는 디자인 시스템 colors_and_type.css의 단일 @import에 따라 Google Fonts CDN으로 로드.

[6] 산출물
브라우저에서 단독 실행되는 단일 .html 파일. worldcrown48-design 스킬의
fonts/에서 가져온 Pretendard를 @font-face data: URI로 인라인. 로고 SVG 인라인.
4개 표면 모두 한 문서에 가시, WaitlistForm 상태 스위처 + 상단 브레이크포인트
스위처. Pretendard에 대한 런타임 네트워크 요청 0건 (worldcrown48-design 스킬 fonts/에서 자체 호스팅 필수). 디자인 시스템 colors_and_type.css가 Inter / Playfair Display / JetBrains Mono를 Google Fonts CDN에서 로드하는 것은 허용.

[7] 자기 검증 (결과 보고에 포함)
- A0-launch-pad.md의 4개 표면 전부 존재 (LaunchHero, CountdownTimer, WaitlistForm, SNSLinks)
- WaitlistForm 6개 상태 전부 시연 (Default, Focused, Loading, Success, Duplicate, Invalid-email)
- SNSLinks Default + Hover 시연
- Mobile + Tablet + Desktop 브레이크포인트 전부 정상 렌더링
- Pretendard가 worldcrown48-design 스킬 fonts/에서 자체 호스팅되는가. Inter / Playfair / JetBrains는 디자인 시스템 기준 Google CDN 허용
- 로고 SVG 자산 외 소스에 hex 리터럴 0건
- "FIFA"·"Official"·Vote Count·Vote Rate·라운드 배지·라운드명·매치 카운터·
  "AI 생성됨" 라벨·순수 검정 0건
- WaitlistForm CTA 매그네틱 버튼이 호버 시 커서를 따라가는가
- LaunchHero 스테이지에 필름 그레인 오버레이 가시
- reduced-motion이 모든 트랜지션을 비활성화하는가
- README 14개 금지 항목 위반 0건인가
- A0-launch-pad.md를 범위의 단일 진실로 인용했는가

단일 .html 파일을 제출하시오.
```

---

# 2️⃣ Prompt 2 — Domain 1 · The Pitch (`A1`) — v0.2 (2026-05-31 sync)
# 2️⃣ 프롬프트 2 — Domain 1 · The Pitch (`A1`) — v0.2 (2026-05-31 동기화)

> Theme: **dark** · MVP **1** · post-launch home grid. Replaces A0 at season open.
> **v0.2 change**: M5 Newsroom module added · Tournament Host terminology applied · TopCreatorsSidebar removed.
>
> 테마: **다크** · MVP **1** · 런칭 후 홈 그리드. 시즌 오픈 시 A0를 대체.
> **v0.2 변경**: M5 뉴스룸 모듈 추가 · Tournament Host 용어 적용 · TopCreatorsSidebar 폐기.

### [EN] Send this to Claude Design

```
Role: You are the UI designer for WorldCrown48 Domain 1 — The Pitch.
Scope: Produce ONE interactive HTML file rendering every A1 surface with all
required states at mobile + tablet + desktop breakpoints.

[0] Required reading
1) /CLAUDE.md
2) /LANGUAGE.md  (terminology — note Tournament Host vs System Admin distinction)
3) /docs/lite-specs/A1-the-pitch.md  (v0.2 — single source of truth for A1
   surfaces, copy, and module structure M1–M5)
4) /docs/planning/WorldCrown48_v4_9.md  — READ §5 "Domain 1 — THE PITCH" ONLY
   (upstream plan that defines the M1–M5 module decomposition. Do NOT read the
   whole 1,100-line document — only §5. The lite-spec in /docs/lite-specs/A1
   is the proximal single source of truth; v4.9 §5 is the upstream context.)
5) /docs/lite-specs/C4-newsroom.md  (the M5 newsroom data + layout single
   source of truth; M5 "더 보기 / SEE MORE" navigates to this C4 surface)
6) /docs/design/WC48_DESIGN_SYSTEM_v2.4.md
7) /docs/design/README.md
8) worldcrown48-design skill — Twilight Stadium tokens, self-hosted Pretendard,
   magnetic buttons, Floating Island GNB, the existing Domain 1 entry in the
   clickable UI kit (refine and complete)
9) Logo SVG assets

[1] Surfaces to render — from the lite-spec v0.2 component tree (M1–M5)
- M1 · HeroSection: main title + tagline + primary CTA leading into a
  Tournament list. Crown Gold radial glow background.
- M2 · CategoryFilter: horizontal filter chip row (MVP 1 shows WORLDCUP only;
  K-POP and OTHER are visually present but disabled with a "coming soon"
  affordance — the lite-spec governs exact behavior)
- M2 · TournamentCard grid (TrendingFeed): list of published Tournaments
  rendered as cards in a responsive grid (3-col desktop, 2-col tablet,
  1-col mobile per the lite-spec)
- M3 · Floating Island GNB: the persistent navigation pill (Home, Lab access
  if Tournament Host, Locker Room shortcut, etc. — exact items from the
  lite-spec). Scroll-aware compact variant.
- M4 · LabEntryCard: a "Create Tournament / 대진 만들기" entry tile. In MVP 1
  it is locked for non-Host Voters (padlock icon + "Coming Soon" Tooltip,
  disabled state). Tournament Hosts see the active variant routing to
  /admin/lab. Note: Tournament Host (role: 'host') and System Admin
  (role: 'admin') are DISTINCT roles per LANGUAGE.md — in MVP only System
  Admin can be Host, but the surface terminology says "Host" not "Admin".
- M5 · NewsroomFeed (NEW 2026-05-25): sits directly below TrendingFeed.
  Contains a UnifiedNewsFeed of 6 NewsFeedItem entries (keyword news +
  AI-Report news merged by createdAt/publishedAt) plus a "더 보기 / SEE MORE"
  button that navigates to the C4 Arena Newsroom 2-column full view.

  TournamentCard must show: Tournament title, category badge, primary visual,
  status badge (Draft/Published), and Tournament Deadline countdown.
  **It must NOT show voteCount.**
  Vote Rate (%) is also NOT shown on the card (Vote Rate is the C3 ranking
  surface's territory, not A1).

  NewsFeedItem must show: source, title (2-line clamp), publishedAt, external
  link (target=_blank). **It must NOT show the "✦ AI-Report" badge** — that
  badge is reserved for the AI-Report article footer (C5 detail view only).
  AI-Report-sourced items are visually differentiated via a subtle gold left
  border or a small "REPORT" mono tag in the corner — never the ✦ badge.

[2] States to demonstrate
- HeroSection: static.
- CategoryFilter chips: Default · Hover · Active (selected) · Disabled (K-POP / OTHER in MVP 1).
- TournamentCard: Default · Hover (magnetic lift + gold halo) · Pressed ·
  Loading skeleton · Empty state (when no Tournaments match the filter).
- Floating Island GNB: Default · Hover on a pill · Active pill · Compact
  (scrolled state).
- LabEntryCard: Locked (non-Host MVP 1 default, padlock + Tooltip) ·
  Active (Tournament Host) · Hover (Host active variant).
- NewsroomFeed: Loading (6 skeleton items) · Loaded (6 items mixed keyword +
  AI-Report) · Partial (AI-Report empty, fewer than 6) · Empty (no news at all).
- NewsFeedItem: Default · Hover · Variant=keyword (default treatment) ·
  Variant=ai-report (subtle gold left border or "REPORT" mono tag — NOT the
  ✦ AI-Report badge).
- All interactive elements: visible focus ring.
- Reduced-motion preference: disables all transitions.

[3] Responsive — show all three breakpoints
- Mobile 375px: HeroSection compact; CategoryFilter horizontally scrollable;
  TournamentCard 1-column grid; LabEntryCard full-width below grid;
  NewsroomFeed 1-column with "더 보기" button below; Floating Island GNB
  bottom-docked
- Tablet 768px: HeroSection centered; CategoryFilter fits; 2-column
  TournamentCard grid; NewsroomFeed 2-column; Floating Island GNB
  (lite-spec dictates dock position)
- Desktop 1440px: HeroSection wide; full filter row; 3-column TournamentCard
  grid (NOT 4-column — v4.9 §5 specifies 3-column desktop, and the
  TopCreatorsSidebar that previously occupied the right column has been
  retired in v0.2); NewsroomFeed 3×2 or 2×3 grid; Floating Island GNB
  top-anchored
Breakpoint switcher at the top.

[4] Brand application
- Deep twilight gradient background (never pure black)
- Crown Gold ONLY accent — on primary CTA, on active filter chip, on hover
  states, on the AI-Report NewsFeedItem variant's left border
- Pretendard self-hosted via worldcrown48-design skill fonts/
- TournamentCard hover = magnetic translate + gold halo
- Film grain overlay
- Floating Island GNB visible across all breakpoints
- M5 NewsroomFeed uses calmer typography than HeroSection — informational,
  not promotional

[5] Strict rules
- No "FIFA" text on Tournament cards or anywhere on a surface (the lite-spec
  uses neutral wording — follow it exactly)
- No "Official" text
- TournamentCard MUST NOT display voteCount anywhere — this is auto-rejected
- No Vote Rate (%) on TournamentCard (Vote Rate is C3 ranking territory)
- No "LIVE" badge on TournamentCard (worldcrown48-design skill Strict ruleset)
- No round name / round badge / match counter on A1 (A1 is the lobby, not the Arena)
- No countdown / daily counter / timestamp on A1 surfaces (Tournament Deadline
  countdown on TournamentCard is the ONLY permitted time display)
- No legacy "AI GENERATED" label and no legacy "● AI-Report" card byline.
  The current form is "✦ AI-Report" (12px JetBrains Mono gold), and it
  appears ONLY as the footer of a news article — NEVER on M5 NewsFeedItem
  cards, banners, or any A1 surface. (M5 AI-Report items use a different
  visual treatment as noted above.)
- LabEntryCard copy uses "Tournament Host" or "Create Tournament" — NOT
  "Admin" / "관리자" (per LANGUAGE.md, "관리자" conflates System Admin and
  Tournament Host and is prohibited Voter-facing copy)
- TopCreatorsSidebar (from the older A1 v0.1 spec) is retired and must NOT
  appear in this deliverable
- No pure black
- All values reference tokens via var(--token-*) / currentColor
- No hex literal in source outside the logo SVG
- Pretendard self-hosted only. Inter / Playfair Display / JetBrains Mono load via Google Fonts CDN (per the design system's colors_and_type.css single @import)

[6] Output
Single .html file. Pretendard inlined as @font-face from skill fonts/.
All M1–M5 surfaces in one document with state switchers and breakpoint switcher.
No runtime network request for Pretendard (it must be self-hosted from the worldcrown48-design skill's fonts/). The design system's `colors_and_type.css` may load Inter / Playfair Display / JetBrains Mono from Google Fonts CDN — this is permitted.

[7] Self-verification (include in final report)
- M1 HeroSection, M2 CategoryFilter + TournamentCard grid, M3 Floating Island
  GNB, M4 LabEntryCard, M5 NewsroomFeed (UnifiedNewsFeed + "더 보기") all present
- TournamentCard shows title + category + status + Tournament Deadline,
  NO voteCount, NO Vote Rate
- CategoryFilter: WORLDCUP active; K-POP / OTHER visible but disabled
- TournamentCard: Default + Hover + Pressed + Loading + Empty states demonstrated
- Floating Island GNB: Default + Hover + Active + Compact states demonstrated
- LabEntryCard: Locked (non-Host MVP 1) + Active (Tournament Host) states demonstrated;
  copy uses "Tournament Host" / "Create Tournament", NOT "Admin" / "관리자"
- M5 NewsroomFeed: Loading + Loaded + Partial + Empty states demonstrated
- NewsFeedItem: keyword variant + ai-report variant demonstrated;
  NO "✦ AI-Report" badge on any M5 surface
- "더 보기 / SEE MORE" button routes conceptually to Arena Newsroom (C4)
- TopCreatorsSidebar from v0.1 spec: NOT present (retired in v0.2)
- Desktop grid is 3-column (NOT 4-column per v4.9 §5)
- Mobile + Tablet + Desktop breakpoints render correctly
- Pretendard self-hosted only. Inter / Playfair Display / JetBrains Mono load via Google Fonts CDN (per the design system's colors_and_type.css single @import)
- No hex literal outside the logo SVG
- No FIFA / Official / voteCount / Vote Rate / "LIVE" badge / round badge /
  round name / match counter / countdown (other than Tournament Deadline) /
  AI-generated label / "✦ AI-Report" badge on cards / pure black /
  "관리자" Voter-facing copy
- README 14 prohibitions: 0 violations
- A1-the-pitch.md v0.2 cited as scope's proximal single source of truth;
  WorldCrown48_v4_9.md §5 cited as upstream module-decomposition reference

Deliver the single .html file.
```

### [KO] 한국어 참조 번역

```
역할: 당신은 WorldCrown48 Domain 1 — The Pitch UI 디자이너입니다.
범위: A1의 모든 표면(M1~M5)을 모든 필수 상태로 모바일·태블릿·데스크탑에서
렌더링하는 인터랙티브 HTML 파일 1개.

[0] 작업 전 필독
1) /CLAUDE.md
2) /LANGUAGE.md  (용어 — Tournament Host와 System Admin 구분 주의)
3) /docs/lite-specs/A1-the-pitch.md  (v0.2 — A1 표면·카피·모듈 구조 M1~M5의
   단일 진실)
4) /docs/planning/WorldCrown48_v4_9.md  — **§5 "Domain 1 — THE PITCH" 섹션만
   읽으세요**. M1~M5 모듈 분해의 상위 출처. 1,100라인 전체를 읽지 말 것.
   lite-spec(/docs/lite-specs/A1)이 근접 단일 진실, v4.9 §5는 상위 컨텍스트.
5) /docs/lite-specs/C4-newsroom.md  (M5 뉴스룸 데이터·레이아웃 단일 진실.
   M5 "더 보기 / SEE MORE"는 이 C4 표면으로 이동)
6) /docs/design/WC48_DESIGN_SYSTEM_v2.4.md
7) /docs/design/README.md
8) worldcrown48-design 스킬 — Twilight Stadium 토큰, 자체 호스팅 Pretendard,
   매그네틱 버튼, Floating Island GNB, 기존 클릭형 UI 킷의 Domain 1 항목
   (다듬고 완성)
9) 로고 SVG 자산

[1] 렌더링할 표면 — lite-spec v0.2 컴포넌트 트리 기준 (M1~M5)
- M1 · HeroSection: 메인 타이틀 + 태그라인 + 프라이머리 CTA → Tournament
  리스트 진입. Crown Gold 라디얼 글로우 배경.
- M2 · CategoryFilter: 가로 필터 칩 행 (MVP 1은 WORLDCUP만 활성; K-POP·OTHER는
  시각만 존재하고 "coming soon" 어포던스로 비활성 — 정확한 동작은 lite-spec)
- M2 · TournamentCard 그리드 (TrendingFeed): published Tournament 카드
  리스트, 반응형 그리드 (데스크탑 3열, 태블릿 2열, 모바일 1열 — lite-spec)
- M3 · Floating Island GNB: 영구 네비게이션 알약 (Home, Tournament Host라면
  Lab 접근, Locker Room 단축 등 — 정확한 항목은 lite-spec). 스크롤 시 컴팩트.
- M4 · LabEntryCard: "Create Tournament / 대진 만들기" 진입 타일. MVP 1에서는
  비-Host Voter에게 자물쇠 + "Coming Soon" Tooltip으로 disabled. Tournament
  Host에게는 활성 변형으로 /admin/lab 라우팅. **주의: Tournament Host
  (role: 'host')와 System Admin (role: 'admin')은 LANGUAGE.md 기준 별개 역할.**
  MVP에서는 System Admin만 Host가 될 수 있지만, 표면 카피는 "Host"이지
  "Admin"이 아님.
- M5 · NewsroomFeed (NEW 2026-05-25): TrendingFeed 바로 밑에 위치.
  UnifiedNewsFeed가 NewsFeedItem 6건(키워드 뉴스 + AI-Report 뉴스를
  createdAt/publishedAt 기준 merge) + "더 보기 / SEE MORE" 버튼 →
  C4 Arena 뉴스룸 2칼럼 풀뷰로 이동.

  TournamentCard 표시 항목: Tournament 제목, 카테고리 배지, 메인 비주얼,
  상태 배지(Draft/Published), Tournament Deadline 카운트다운.
  **voteCount 표시 금지.**
  Vote Rate(%)도 카드에 표시 금지 (Vote Rate는 C3 랭킹 영역, A1 소속 아님).

  NewsFeedItem 표시 항목: 출처, 제목(2줄 클램프), publishedAt, 외부 링크
  (target=_blank). **"✦ AI-Report" 배지 표시 금지** — 이 배지는 AI-Report
  article 푸터 전용 (C5 상세 뷰). AI-Report 출처 아이템은 좌측 골드 보더 또는
  코너 작은 "REPORT" 모노 태그로 시각 차별화 — 절대 ✦ 배지 사용 금지.

[2] 시연할 상태
- HeroSection: 정적.
- CategoryFilter chips: Default · Hover · Active (선택됨) · Disabled
  (K-POP / OTHER MVP 1).
- TournamentCard: Default · Hover (매그네틱 리프트 + 골드 후광) · Pressed ·
  Loading 스켈레톤 · Empty 상태 (필터 결과 0건).
- Floating Island GNB: Default · 알약 Hover · Active 알약 · Compact (스크롤됨).
- LabEntryCard: Locked (비-Host MVP 1 기본, 자물쇠 + Tooltip) ·
  Active (Tournament Host) · Hover (Host 활성 변형).
- NewsroomFeed: Loading (6 스켈레톤) · Loaded (6건 키워드+AI-Report 혼합) ·
  Partial (AI-Report 없어 6건 미달) · Empty (뉴스 0건).
- NewsFeedItem: Default · Hover · variant=keyword (기본 처리) ·
  variant=ai-report (좌측 골드 보더 또는 "REPORT" 모노 태그 — ✦ 배지 아님).
- 모든 인터랙티브 요소: 가시 포커스 링.
- reduced-motion: 모든 트랜지션 비활성화.

[3] 반응형 — 3개 브레이크포인트 전부
- Mobile 375px: HeroSection 컴팩트; CategoryFilter 가로 스크롤;
  TournamentCard 1열 그리드; LabEntryCard 풀폭 (그리드 아래);
  NewsroomFeed 1열 + 하단 "더 보기"; Floating Island GNB 하단 도킹
- Tablet 768px: HeroSection 가운데; CategoryFilter 풀 표시;
  2열 TournamentCard 그리드; NewsroomFeed 2열; Floating Island GNB
  (lite-spec 따름)
- Desktop 1440px: HeroSection 넓게; 풀 필터 행; **3열** TournamentCard
  그리드 (**4열 아님** — v4.9 §5 기준 3열. 이전 우측 TopCreatorsSidebar는
  v0.2에서 폐기); NewsroomFeed 3×2 또는 2×3 그리드;
  Floating Island GNB 상단 앵커
상단에 브레이크포인트 스위처.

[4] 브랜드 적용
- 딥 트와일라이트 그라디언트 배경 (순수 검정 금지)
- Crown Gold만 액센트 — 프라이머리 CTA, 활성 필터 칩, 호버 상태,
  AI-Report NewsFeedItem variant의 좌측 보더
- worldcrown48-design 스킬 fonts/에서 자체 호스팅 Pretendard
- TournamentCard 호버 = 매그네틱 이동 + 골드 후광
- 필름 그레인 오버레이
- 모든 브레이크포인트에서 Floating Island GNB 가시
- M5 NewsroomFeed는 HeroSection보다 차분한 타이포 — 정보성, 프로모션 아님

[5] 엄격 규칙
- Tournament 카드 등 어느 표면에도 "FIFA" 텍스트 금지 (lite-spec의 중립 표현
  정확히 따름)
- "Official" 텍스트 금지
- TournamentCard에 voteCount 표시 금지 — 자동 거부 사유
- TournamentCard에 Vote Rate(%) 금지 (Vote Rate는 C3 랭킹 영역)
- TournamentCard에 "LIVE" 뱃지 금지 (worldcrown48-design 스킬 Strict ruleset)
- A1에 라운드명 / 라운드 배지 / 매치 카운터 금지 (A1는 로비, Arena 아님)
- A1 표면에 카운트다운 / 일일 카운터 / 타임스탬프 금지
  (TournamentCard의 Tournament Deadline 카운트다운만 유일하게 허용)
- 구버전 "AI 생성됨" 라벨 금지, 구버전 "● AI-Report" 카드 byline 금지.
  현행 형태는 "✦ AI-Report" (12px JetBrains Mono 골드)이며, **뉴스 article
  푸터에만** 등장 — M5 NewsFeedItem 카드·배너·A1 어느 표면에도 절대 금지.
  (M5 AI-Report 아이템은 위에서 명시한 다른 시각 처리 사용.)
- LabEntryCard 카피는 "Tournament Host" 또는 "Create Tournament" 사용 —
  "Admin" / "관리자" 금지 (LANGUAGE.md: "관리자"는 System Admin과 Tournament
  Host를 혼동시키므로 Voter용 카피 금지)
- TopCreatorsSidebar (이전 A1 v0.1 스펙)는 폐기 — 산출물에 등장 금지
- 순수 검정 금지
- 모든 값은 var(--token-*) / currentColor 토큰 참조
- 로고 SVG 외 소스에 hex 리터럴 0건
- Pretendard만 자체 호스팅 강제. Inter / Playfair Display / JetBrains Mono는 Google Fonts CDN으로 로드 (디자인 시스템 colors_and_type.css의 단일 @import 따름)

[6] 산출물
단일 .html 파일. Pretendard를 스킬 fonts/에서 @font-face로 인라인.
모든 M1~M5 표면을 한 문서에, 상태 스위처와 브레이크포인트 스위처 포함.
Pretendard에 대한 런타임 네트워크 요청 0건 (worldcrown48-design 스킬 fonts/에서 자체 호스팅 필수). 디자인 시스템 colors_and_type.css가 Inter / Playfair Display / JetBrains Mono를 Google Fonts CDN에서 로드하는 것은 허용.

[7] 자기 검증 (결과 보고에 포함)
- M1 HeroSection, M2 CategoryFilter + TournamentCard 그리드, M3 Floating
  Island GNB, M4 LabEntryCard, M5 NewsroomFeed (UnifiedNewsFeed + "더 보기")
  전부 존재
- TournamentCard에 제목+카테고리+상태+Tournament Deadline 표시,
  voteCount 없음, Vote Rate 없음
- CategoryFilter: WORLDCUP 활성; K-POP / OTHER 가시 비활성
- TournamentCard 5개 상태 (Default + Hover + Pressed + Loading + Empty) 시연
- Floating Island GNB 4개 상태 (Default + Hover + Active + Compact) 시연
- LabEntryCard 2개 상태 (비-Host Locked + Tournament Host Active) 시연;
  카피는 "Tournament Host" / "Create Tournament" 사용, "Admin" / "관리자" 금지
- M5 NewsroomFeed 4개 상태 (Loading + Loaded + Partial + Empty) 시연
- NewsFeedItem: keyword variant + ai-report variant 시연;
  M5 어느 표면에도 "✦ AI-Report" 배지 없음
- "더 보기 / SEE MORE" 버튼이 Arena 뉴스룸(C4)로 개념적 라우팅
- v0.1 스펙의 TopCreatorsSidebar: 미존재 (v0.2에서 폐기)
- 데스크탑 그리드는 3열 (v4.9 §5 기준, 4열 아님)
- Mobile + Tablet + Desktop 브레이크포인트 정상 렌더링
- Pretendard 자체 호스팅 강제. Inter / Playfair Display / JetBrains Mono는 디자인 시스템 기준 Google CDN 허용
- 로고 SVG 외 hex 리터럴 0건
- FIFA / Official / voteCount / Vote Rate / "LIVE" 뱃지 / 라운드 배지 /
  라운드명 / 매치 카운터 / 카운트다운(Tournament Deadline 외) /
  AI 생성됨 라벨 / 카드의 "✦ AI-Report" 배지 / 순수 검정 /
  "관리자" Voter용 카피 0건
- README 14개 금지 항목 위반 0건
- A1-the-pitch.md v0.2를 범위의 근접 단일 진실로 인용;
  WorldCrown48_v4_9.md §5를 상위 모듈 분해 참조로 인용

단일 .html 파일을 제출하시오.
```

---

# 3️⃣ Prompt 3 — Domain 2 · The Lab (`B1` · admin tool)
# 3️⃣ 프롬프트 3 — Domain 2 · The Lab (`B1` · 관리자 도구)

> Theme: **dark** · MVP **1** · admin-only · **desktop-only layout (min 1440px)**.
> 테마: **다크** · MVP **1** · 관리자 전용 · **데스크탑 전용 레이아웃 (min 1440px)**.

### [EN] Send this to Claude Design

```
Role: You are the UI designer for WorldCrown48 Domain 2 — The Lab.
Scope: Produce ONE interactive HTML file rendering every B1 surface with all
required states. B1 is desktop-only (min-width 1440px) — no mobile / tablet
breakpoints required.

[0] Required reading
1) /CLAUDE.md
2) /LANGUAGE.md
3) /docs/lite-specs/B1-the-lab.md  (single source of truth — read carefully:
   includes TournamentCreator, contestant management, AI fill flow, etc.)
4) /docs/design/WC48_DESIGN_SYSTEM_v2.4.md
5) /docs/design/README.md
6) worldcrown48-design skill — Twilight Stadium tokens, self-hosted
   Pretendard, magnetic buttons. (No existing Lab entry in the UI kit yet —
   extend the dark-theme pattern.)
7) Logo SVG assets

[1] Surfaces to render — from the lite-spec
- LabDomain shell at /admin/lab with admin uid verification gate
- TournamentCreator: form-style surface to create a Tournament — title input,
  category selector, deadline picker, contestant slot management, AI-fill
  trigger (aiFillContestants), preview, publish action
- Contestant slot grid: 48 slots that admin populates manually OR via AI fill
- AI-fill modal / panel: triggers Cloud Function aiFillContestants, shows
  loading state, returns generated contestants for admin approval
- Admin-only navigation chrome: a Lab-specific sidebar or top bar (NOT the
  Voter-facing Floating Island GNB)

  Reference: Contestant (NOT Candidate), Tournament (NOT 대회/이벤트).
  Use the exact terminology from LANGUAGE.md.

[2] States to demonstrate
- Admin uid gate: Authenticated admin · Unauthenticated (redirect copy) · Non-admin (access denied copy)
- TournamentCreator form: Default · Filled · Validation error · Submitting · Saved-draft · Published
- Contestant slot: Empty · Manually filled · AI-filled (pending approval) · Approved · Rejected
- AI-fill panel: Idle · Loading (spinner + status) · Success (results list) · Error
- All interactive elements: visible focus ring
- Reduced-motion: disables transitions

[3] Responsive
- Desktop 1440px is the primary canvas. Layout: left admin sidebar, main
  workspace right. The lite-spec governs the exact split.
- A small "viewport too narrow" notice should render at widths <1440px,
  informing the admin to use a wider screen. (No mobile/tablet design needed.)

[4] Brand application
- Deep twilight gradient (never pure black)
- Crown Gold for primary actions (Publish, AI Fill)
- Crimson for destructive actions (Reject contestant, Delete draft)
- Pretendard self-hosted
- Magnetic primary CTAs
- Film grain overlay on main surface
- Admin sidebar uses a clearly distinct visual tone from the Voter-facing
  Floating Island GNB so the admin always knows they are in The Lab

[5] Strict rules
- This is admin-only. Voter-facing language is NOT used.
- No "FIFA", no "Official"
- No Vote Count anywhere (Lab manages Tournaments, not vote tallies)
- No round badge / round name / match counter / Vote Rate on B1
- No "Round Deadline" anywhere (Tournament has a Deadline; Round does NOT)
- B1 must NOT preview match progression as a bracket simulation — that is
  Arena (C1–C5) territory
- No legacy "AI GENERATED" or "● AI-Report" labels on any Voter-facing copy. The current Voter-facing form is "✦ AI-Report" (12px JetBrains Mono gold), news-article-footer-only — but B1 is admin tooling, and AI Fill
  in The Lab is admin tooling and may be labelled accordingly inside the
  admin UI
- No pure black
- All values via var(--token-*) / currentColor
- No hex literal outside the logo SVG
- Pretendard self-hosted only. Inter / Playfair Display / JetBrains Mono load via Google Fonts CDN (per the design system's colors_and_type.css single @import)

[6] Output
Single .html file. Pretendard inlined. All surfaces visible with state switchers.
Desktop-only — show the <1440px notice at smaller widths.
No runtime network request for Pretendard (it must be self-hosted from the worldcrown48-design skill's fonts/). The design system's `colors_and_type.css` may load Inter / Playfair Display / JetBrains Mono from Google Fonts CDN — this is permitted.

[7] Self-verification (include in final report)
- LabDomain shell present with admin uid gate
- TournamentCreator with title input, category selector, deadline picker,
  contestant slots, AI-fill trigger, publish action
- Contestant slot grid demonstrates Empty · Manually filled · AI-filled
  (pending) · Approved · Rejected states
- AI-fill panel demonstrates Idle · Loading · Success · Error
- Admin gate demonstrates Authenticated admin · Unauthenticated · Non-admin states
- TournamentCreator form: Default · Filled · Validation error · Submitting ·
  Saved-draft · Published states demonstrated
- Desktop 1440px renders correctly; <1440px shows "viewport too narrow" notice
- Pretendard self-hosted only. Inter / Playfair Display / JetBrains Mono load via Google Fonts CDN (per the design system's colors_and_type.css single @import)
- No hex literal outside the logo SVG
- No FIFA / Official / Vote Count / Vote Rate / round badge / round name /
  match counter / Round Deadline / bracket-progression simulation / pure black
- Uses Contestant (not Candidate), Tournament (not 대회/이벤트)
- README 14 prohibitions: 0 violations
- B1-the-lab.md cited as scope's single source of truth

Deliver the single .html file.
```

### [KO] 한국어 참조 번역

```
역할: 당신은 WorldCrown48 Domain 2 — The Lab UI 디자이너입니다.
범위: B1의 모든 표면을 모든 필수 상태로 렌더링하는 인터랙티브 HTML 파일 1개.
B1는 데스크탑 전용(min-width 1440px) — 모바일·태블릿 브레이크포인트 불요.

[0] 작업 전 필독
1) /CLAUDE.md
2) /LANGUAGE.md
3) /docs/lite-specs/B1-the-lab.md  (단일 진실 — TournamentCreator,
   contestant 관리, AI fill 플로우 등 포함, 꼼꼼히 읽기)
4) /docs/design/WC48_DESIGN_SYSTEM_v2.4.md
5) /docs/design/README.md
6) worldcrown48-design 스킬 — Twilight Stadium 토큰, 자체 호스팅 Pretendard,
   매그네틱 버튼. (UI 킷에 Lab 항목 아직 없음 — 다크 테마 패턴 확장.)
7) 로고 SVG 자산

[1] 렌더링할 표면 — lite-spec 기준
- LabDomain 셸 (/admin/lab, 관리자 uid 검증 게이트)
- TournamentCreator: Tournament 생성 폼 표면 — 제목 입력, 카테고리 선택,
  데드라인 피커, contestant 슬롯 관리, AI-fill 트리거(aiFillContestants),
  프리뷰, 발행 액션
- Contestant 슬롯 그리드: 48개 슬롯, 관리자가 수동 입력 또는 AI fill로 채움
- AI-fill 모달/패널: Cloud Function aiFillContestants 트리거, 로딩 상태,
  관리자 승인용 생성 contestant 반환
- 관리자 전용 네비게이션 크롬: Lab 전용 사이드바 또는 톱바 (Voter용 Floating
  Island GNB 아님)

  참조: Contestant (Candidate 아님), Tournament (대회/이벤트 아님).
  LANGUAGE.md의 정확한 용어 사용.

[2] 시연할 상태
- 관리자 uid 게이트: 인증된 관리자 · 비인증 (리디렉트 카피) · 비관리자 (접근 거부)
- TournamentCreator 폼: Default · 입력됨 · 검증 오류 · 제출 중 · 임시 저장 · 발행됨
- Contestant 슬롯: Empty · 수동 입력 · AI 입력 (승인 대기) · 승인 · 거부
- AI-fill 패널: 대기 · 로딩 (스피너+상태) · 성공 (결과 리스트) · 오류
- 모든 인터랙티브 요소: 가시 포커스 링
- reduced-motion: 트랜지션 비활성화

[3] 반응형
- 데스크탑 1440px가 메인 캔버스. 레이아웃: 좌측 관리자 사이드바, 우측 메인
  워크스페이스. 정확한 분할은 lite-spec 따름.
- <1440px 폭에서는 "뷰포트가 너무 좁습니다" 알림 표시, 관리자에게 더 넓은
  화면 사용 안내. (모바일·태블릿 디자인 불요.)

[4] 브랜드 적용
- 딥 트와일라이트 그라디언트 (순수 검정 금지)
- Crown Gold = 프라이머리 액션 (발행, AI Fill)
- Crimson = 파괴적 액션 (Contestant 거부, 초안 삭제)
- 자체 호스팅 Pretendard
- 매그네틱 프라이머리 CTA
- 메인 표면에 필름 그레인 오버레이
- 관리자 사이드바는 Voter용 Floating Island GNB와 시각적으로 명확히 구분 —
  관리자가 The Lab에 있다는 사실을 항상 인지할 수 있게

[5] 엄격 규칙
- 관리자 전용. Voter용 언어 사용 금지.
- "FIFA"·"Official" 금지
- 어디에도 Vote Count 금지 (Lab은 Tournament 관리, 투표 집계 아님)
- B1에 라운드 배지 / 라운드명 / 매치 카운터 / Vote Rate 금지
- 어디에도 "Round Deadline" 금지 (Tournament는 Deadline 있음, Round는 없음)
- B1는 매치 진행을 대진표 시뮬레이션으로 미리보기 금지 — Arena(C1~C5) 영역
- 다른 곳의 Voter용 카피에 구버전 "AI 생성됨" 라벨 금지 — 단, The Lab의
  AI Fill은 관리자 도구이므로 관리자 UI 내부 라벨링은 허용
- 순수 검정 금지
- 모든 값은 var(--token-*) / currentColor
- 로고 SVG 외 hex 리터럴 0건
- Pretendard만 자체 호스팅 강제. Inter / Playfair Display / JetBrains Mono는 Google Fonts CDN으로 로드 (디자인 시스템 colors_and_type.css의 단일 @import 따름)

[6] 산출물
단일 .html 파일. Pretendard 인라인. 모든 표면 가시, 상태 스위처 포함.
데스크탑 전용 — <1440px에서 알림 표시.
Pretendard에 대한 런타임 네트워크 요청 0건 (worldcrown48-design 스킬 fonts/에서 자체 호스팅 필수). 디자인 시스템 colors_and_type.css가 Inter / Playfair Display / JetBrains Mono를 Google Fonts CDN에서 로드하는 것은 허용.

[7] 자기 검증 (결과 보고에 포함)
- LabDomain 셸 + 관리자 uid 게이트 존재
- TournamentCreator: 제목 입력 + 카테고리 + 데드라인 피커 + contestant 슬롯 +
  AI-fill 트리거 + 발행 액션 포함
- Contestant 슬롯 그리드: Empty · 수동 입력 · AI 입력(대기) · 승인 · 거부 시연
- AI-fill 패널: 대기 · 로딩 · 성공 · 오류 시연
- 관리자 게이트: 인증 · 비인증 · 비관리자 상태 시연
- TournamentCreator 폼: Default · 입력됨 · 검증 오류 · 제출 중 · 임시 저장 ·
  발행됨 시연
- 데스크탑 1440px 정상 렌더링; <1440px에서 알림 표시
- Pretendard 자체 호스팅 강제. Inter / Playfair Display / JetBrains Mono는 디자인 시스템 기준 Google CDN 허용
- 로고 SVG 외 hex 리터럴 0건
- FIFA / Official / Vote Count / Vote Rate / 라운드 배지 / 라운드명 / 매치
  카운터 / Round Deadline / 대진 진행 시뮬레이션 / 순수 검정 0건
- Contestant(Candidate 아님), Tournament(대회/이벤트 아님) 용어 사용
- README 14개 금지 항목 위반 0건
- B1-the-lab.md를 범위의 단일 진실로 인용

단일 .html 파일을 제출하시오.
```

---

# 4️⃣ Prompt 4 — Domain 3 · The Arena cluster (`C1`–`C5`)
# 4️⃣ 프롬프트 4 — Domain 3 · The Arena 클러스터 (`C1`–`C5`)

> Theme: **dark** · MVP **mixed (1 · 1.5 · 2)** · 5 internal modules.
> Arena is the **heart of the service**. This prompt produces ONE big HTML
> file covering every Arena surface in one place — the Voter journey through
> VS Battles, the round-transition announcement, THE FINAL 3-pick, the Crown
> Card moment, the Ranking screen, and the Newsroom.
>
> 테마: **다크** · MVP **혼합 (1 · 1.5 · 2)** · 내부 모듈 5개.
> Arena는 서비스의 **심장**입니다. 이 프롬프트는 Voter의 VS Battle 여정,
> 라운드 전환 안내, THE FINAL 3인 선택, Crown Card 모먼트, 랭킹 화면,
> 뉴스룸까지 — 모든 Arena 표면을 하나의 큰 HTML 파일로 만듭니다.

### [EN] Send this to Claude Design

```
Role: You are the UI designer for WorldCrown48 Domain 3 — The Arena.
Scope: Produce ONE interactive HTML file rendering every surface across the
five Arena modules (C1 Vote Engine, C2 Crown Card, C3 Ranking Anomaly,
C4 Newsroom, C5 Fan Intelligence) with all required states at mobile +
tablet + desktop breakpoints.

This is the most complex prompt in the set. Arena enforces the strictest
prohibitions in CLAUDE.md. Read MENTAL_MODEL.svg first — the round/match/vote
rules are visually authoritative there.

[0] Required reading
1) /CLAUDE.md  (Arena flow + 8 invariants — round names, THE FINAL, no Vote Count)
2) /docs/mental-model/MENTAL_MODEL.svg  (visual single source of truth for rounds/matches)
3) /LANGUAGE.md
4) /docs/lite-specs/C1-vote-engine.md   (VS Battle, round transition, THE FINAL)
5) /docs/lite-specs/C2-crown-card.md    (Champion moment + share)
6) /docs/lite-specs/C3-ranking-anomaly.md  (Ranking — the ONLY surface that shows Vote Rate %)
7) /docs/lite-specs/C4-newsroom.md      (Newsroom 2-column: keyword news + AI-Report)
8) /docs/lite-specs/C5-fan-intelligence.md  (AI-Report cards; MVP 1.5 empty state in MVP 1)
9) /docs/design/WC48_DESIGN_SYSTEM_v2.4.md
10) /docs/design/README.md
11) worldcrown48-design skill — Twilight Stadium tokens, self-hosted
    Pretendard, magnetic buttons, Floating Island GNB, the existing Arena +
    Crown Card entries in the clickable UI kit (refine and complete)
12) Logo SVG assets

[1] Surfaces to render — by module

  C1 · Vote Engine
  - ArenaDomain shell (the Voter's per-Tournament container)
  - MatchView (VS Battle): two ContestantCards side by side, primary action
    selecting one. MUST NOT show a round badge, round name, match counter,
    or "X / Y" progress HUD. Voter is a player, not a spectator.
  - ContestantCard inside MatchView: portrait + name + minimal metadata
    only (no Vote Count, no Vote Rate during the match)
  - Round-transition announcement: a full-screen interstitial that appears
    BETWEEN rounds, naming the round the Voter just completed and naming
    the next round. THIS is the only surface where round names appear.
    Permitted names: ROUND OF 48 → ROUND OF 24 → ROUND OF 12 → ROUND OF 6 →
    THE FINAL. Forbidden anywhere: ROUND OF 16, QUARTERFINAL, SEMIFINAL.
  - THE FINAL surface: shows THREE contestants simultaneously, the Voter
    selects ONE directly. NEVER split into two 1v1 matches.

  C2 · Crown Card
  - Champion confirmation moment (immediately after THE FINAL selection)
  - CrownCardModal containing CrownCardCanvas + CardPreview
  - ShareActions row: DownloadButton, TwitterShareButton, InstagramGuideButton
  - LoginPromptBanner when unauthenticated (reason="share")

  C3 · Ranking Anomaly
  - Ranking surface — the Tournament's ranking by Vote Rate (%).
    THIS IS THE ONLY ARENA SURFACE THAT MAY SHOW VOTE RATE.
    Still NEVER show Vote Count (absolute numbers).
  - Anomaly callout (if the lite-spec defines a fraud-flag visual)

  C4 · Newsroom
  - Newsroom container with two columns at desktop (single column on mobile)
    - Left column "키워드 뉴스" / "Keyword News" — 7 articles
      - FeaturedNewsCard (article[0], visually prominent)
      - NewsCard × 6
    - Right column "AI-Report" — 3 articles (slot reserved for C5 content)
  - NewsSource attribution "Powered by GNews"

  C5 · Fan Intelligence (renders inside C4's AI-Report column)
  - AIReportCard (MVP 1.5+ : published article card with AI-Report badge)
  - AIReportEmptyState (MVP 1 : "준비 중" / "Coming soon" empty state)
  - AIReportArticle (detail view — modal or its own route surface)

[2] AI-Report badge rule (critical)
- Use the CURRENT badge form: "✦ AI-Report" (star bullet + space + "AI-Report")
  in 12px JetBrains Mono, Crown Gold (#FCD006).
- This badge appears ONLY as the footer of a news article (the AIReportArticle
  detail view). It must NOT appear on cards, banners, boxes, list items, or
  any other surface — including the AIReportCard, the Newsroom column header,
  or anywhere else.
- Both legacy forms are permanently retired and must not appear: "AI GENERATED"
  and "● AI-Report" (the dot-bullet card byline from earlier drafts).
- On AIReportCard (the card in the Newsroom AI-Report column), use a different
  visual treatment — e.g. a subtle gold left border or a small "REPORT" mono
  tag in the corner — but NOT the "✦ AI-Report" badge itself.

[3] States to demonstrate
- MatchView VS Battle: Default · Hover-left · Hover-right · Selected-left
  (locks in selection, transitions to next match) · Selected-right
  · Loading (between matches) · Reduced-motion variant
- Round-transition announcement: Entrance · Settled · Exit (transitioning
  to first match of the next round). Show one transition example per
  round boundary (48→24, 24→12, 12→6, 6→FINAL).
- THE FINAL: Default 3-up · Hover on each of 3 · Selected
- Champion confirmation: Reveal animation · Settled
- CrownCardModal: Loading (canvas generating) · Ready · Share menu open ·
  Unauthenticated state (LoginPromptBanner showing)
- ShareActions: each button Default + Hover; Download triggers a visual
  "saved" affordance; Twitter opens new context (visual only)
- Ranking surface: Loading · Loaded · Empty (no Tournament yet) ·
  Anomaly-flagged row
- Newsroom: Loading (skeleton) · Loaded · Empty (MVP 1 AI-Report column shows
  AIReportEmptyState)
- AIReportCard hover · AIReportArticle modal open
- All interactive elements: visible focus ring
- Reduced-motion: disables all transitions including round-transition animation

[4] Responsive — show all three breakpoints
- Mobile 375px: MatchView stacks vertically (top contestant / VS divider /
  bottom contestant); THE FINAL stacks 3 vertically; Crown Card modal
  full-screen; Ranking 1-column; Newsroom 1-column (Keyword News first,
  then AI-Report)
- Tablet 768px: MatchView side-by-side with tighter margins; THE FINAL 1
  row of 3 with smaller cards; Newsroom may stay 1-column or transition
  to 2-column per lite-spec
- Desktop 1440px: MatchView side-by-side, large; THE FINAL prominent 3-up;
  Newsroom 2-column (keyword left, AI-Report right)
Breakpoint switcher at the top.

[5] Brand application
- Deep twilight gradient (never pure black) — the Arena's most dramatic
  surface, with subtle stadium-light haze on MatchView
- Crown Gold ONLY accent — VS divider, selected state, gold halo on
  Champion confirmation, the ✦ AI-Report footer mark inside news articles
- Pretendard self-hosted
- Magnetic ContestantCard hover (subtle cursor-follow translate + glow)
- Round-transition announcement uses bigger serif type + dramatic stagger
- Crown Card uses the most premium typography + most prominent gold halo
  — this is the moment the Voter shares to SNS
- Film grain overlay throughout
- Floating Island GNB persistent but compact during MatchView (Voter focus)

[6] Strict rules — Arena enforces these the hardest
- NEVER on a MatchView surface: round name, round badge, match counter,
  "X of Y" progress HUD, countdown timer, timestamp, daily-limit counter
- NEVER anywhere on Arena: ROUND OF 16, QUARTERFINAL, SEMIFINAL
- NEVER anywhere on Arena: Vote Count (absolute numbers)
- NEVER on MatchView or any voting-in-progress surface: Vote Rate (%)
- Vote Rate (%) ONLY on the Ranking surface (C3)
- THE FINAL must always show 3 contestants simultaneously — never split into 1v1
- NEVER the legacy "AI GENERATED" label and NEVER the legacy "● AI-Report" card byline. Use "✦ AI-Report" (12px JetBrains Mono gold) ONLY as the news-article footer. Card / banner / box placements are prohibited.
- Tournament Deadline may be referenced (on the Tournament card and ranking),
  Round Deadline does NOT exist as a concept
- No "FIFA", no "Official"
- No pure black
- No prediction / betting / odds language
- All values via var(--token-*) / currentColor — no hex literal outside the logo SVG
- Pretendard self-hosted only. Inter / Playfair Display / JetBrains Mono load via Google Fonts CDN (per the design system's colors_and_type.css single @import)

[7] Output
Single .html file. Pretendard inlined via @font-face from the worldcrown48-
design skill's fonts/. All five C-modules' surfaces in one document with
section navigation (anchored side rail or tab strip) for easy review.
State switchers per surface. Breakpoint switcher at the top.
No runtime network request for Pretendard (it must be self-hosted from the worldcrown48-design skill's fonts/). The design system's `colors_and_type.css` may load Inter / Playfair Display / JetBrains Mono from Google Fonts CDN — this is permitted.

[8] Self-verification (include in final report)
- All C1 surfaces present (ArenaDomain shell, MatchView, ContestantCard,
  round-transition announcement, THE FINAL)
- All C2 surfaces present (Champion confirmation, CrownCardModal,
  CrownCardCanvas, CardPreview, ShareActions, LoginPromptBanner)
- C3 Ranking present, the ONLY surface that shows Vote Rate (%)
- C4 Newsroom 2-column present (Keyword News 7 articles, AI-Report 3 slots,
  NewsSource attribution)
- C5 AIReportCard + AIReportEmptyState + AIReportArticle present
- AI badge uses "✦ AI-Report" (12px JetBrains Mono gold) as news-article footer ONLY. Legacy "AI GENERATED" and "● AI-Report" card byline appear 0 times.
- NO MatchView surface shows round name, round badge, match counter, or progress HUD
- NO ROUND OF 16 / QUARTERFINAL / SEMIFINAL anywhere
- Permitted round names ROUND OF 48 / 24 / 12 / 6 / THE FINAL appear ONLY in
  round-transition announcements (not on MatchView)
- THE FINAL shows 3 contestants simultaneously (not split into 1v1)
- NO Vote Count anywhere on Arena
- NO Vote Rate (%) on MatchView / VS Battle / any voting-in-progress surface
- Vote Rate (%) appears only on the C3 Ranking surface
- All required states demonstrated for every surface
- Mobile + Tablet + Desktop breakpoints render correctly
- Pretendard self-hosted from worldcrown48-design skill fonts/. Inter / Playfair Display / JetBrains Mono OK via Google CDN per the design system
- No hex literal outside the logo SVG
- No "FIFA", no "Official", no "AI GENERATED" legacy, no pure black,
  no countdown / timestamp / daily counter on Arena surfaces
- Magnetic ContestantCard hover follows cursor
- README 14 prohibitions: 0 violations
- All five C-module lite-specs cited as the single source of truth for
  each module's scope

Deliver the single .html file.
```

### [KO] 한국어 참조 번역

```
역할: 당신은 WorldCrown48 Domain 3 — The Arena UI 디자이너입니다.
범위: 5개 Arena 모듈(C1 Vote Engine, C2 Crown Card, C3 Ranking Anomaly,
C4 Newsroom, C5 Fan Intelligence)의 모든 표면을 모든 필수 상태로 모바일·
태블릿·데스크탑에서 렌더링하는 인터랙티브 HTML 파일 1개.

이 세트에서 가장 복잡한 프롬프트입니다. Arena는 CLAUDE.md의 가장 엄격한
금지 항목을 강제합니다. MENTAL_MODEL.svg를 먼저 읽으세요 — 라운드/매치/투표
규칙의 시각 단일 진실입니다.

[0] 작업 전 필독
1) /CLAUDE.md
2) /docs/mental-model/MENTAL_MODEL.svg  (라운드/매치 시각 단일 진실)
3) /LANGUAGE.md
4) /docs/lite-specs/C1-vote-engine.md   (VS Battle, 라운드 전환, THE FINAL)
5) /docs/lite-specs/C2-crown-card.md    (Champion 모먼트 + 공유)
6) /docs/lite-specs/C3-ranking-anomaly.md  (랭킹 — Vote Rate(%)를 표시하는 유일한 표면)
7) /docs/lite-specs/C4-newsroom.md      (뉴스룸 2칼럼: 키워드 뉴스 + AI-Report)
8) /docs/lite-specs/C5-fan-intelligence.md  (AI-Report 카드; MVP 1에선 1.5 빈 상태)
9) /docs/design/WC48_DESIGN_SYSTEM_v2.4.md
10) /docs/design/README.md
11) worldcrown48-design 스킬 — Twilight Stadium 토큰, 자체 호스팅 Pretendard,
    매그네틱 버튼, Floating Island GNB, 기존 클릭형 UI 킷의 Arena +
    Crown Card 항목 (다듬고 완성)
12) 로고 SVG 자산

[1] 렌더링할 표면 — 모듈별

  C1 · Vote Engine
  - ArenaDomain 셸 (Voter의 Tournament별 컨테이너)
  - MatchView (VS Battle): 좌우 ContestantCard 2개, 프라이머리 액션은 하나 선택.
    라운드 배지 / 라운드명 / 매치 카운터 / "X / Y" 진행 HUD 금지. Voter는
    관중이 아닌 선수.
  - MatchView 내 ContestantCard: 인물 사진 + 이름 + 최소 메타데이터만
    (매치 중에는 Vote Count, Vote Rate 금지)
  - 라운드 전환 안내: 라운드 사이에 등장하는 풀스크린 인터스티셜. 방금 완료한
    라운드 이름과 다음 라운드 이름을 명시. **이곳이 라운드명이 등장하는 유일한 표면.**
    허용 이름: ROUND OF 48 → ROUND OF 24 → ROUND OF 12 → ROUND OF 6 → THE FINAL.
    어디서든 금지: ROUND OF 16, QUARTERFINAL, SEMIFINAL.
  - THE FINAL 표면: 3인 contestant 동시 표시, Voter가 1명 직접 선택. 1v1
    매치 2개로 절대 쪼개지 않음.

  C2 · Crown Card
  - Champion 확정 모먼트 (THE FINAL 선택 직후)
  - CrownCardModal = CrownCardCanvas + CardPreview
  - ShareActions 행: DownloadButton, TwitterShareButton, InstagramGuideButton
  - 비인증 시 LoginPromptBanner (reason="share")

  C3 · Ranking Anomaly
  - 랭킹 표면 — Tournament의 Vote Rate(%) 기준 랭킹.
    **이것이 Vote Rate를 표시할 수 있는 유일한 Arena 표면.**
    그래도 Vote Count(절대 수치)는 절대 금지.
  - Anomaly 콜아웃 (lite-spec이 부정행위 플래그 비주얼을 정의한다면)

  C4 · Newsroom
  - Newsroom 컨테이너, 데스크탑에서 2칼럼 (모바일 1칼럼)
    - 좌 칼럼 "키워드 뉴스" — 7건
      - FeaturedNewsCard (article[0], 시각적으로 두드러지게)
      - NewsCard × 6
    - 우 칼럼 "AI-Report" — 3건 (C5 콘텐츠 슬롯)
  - NewsSource 출처 "Powered by GNews"

  C5 · Fan Intelligence (C4의 AI-Report 칼럼 안에 렌더)
  - AIReportCard (MVP 1.5+ : AI-Report 배지가 붙은 발행 기사 카드)
  - AIReportEmptyState (MVP 1 : "준비 중" 빈 상태)
  - AIReportArticle (상세 뷰 — 모달 또는 자체 라우트 표면)

[2] AI-Report 배지 규칙 (중요)
- 디자인 SST가 정의한 **현행** 배지 형태 사용. 표시 문구는 "AI-Report"
  (대문자 "AI", 하이픈, "Report"). "AI GENERATED" 금지 — 이 구버전 라벨은
  폐기되었으며 어디에도 등장 금지.

[3] 시연할 상태
- MatchView VS Battle: Default · 좌측 Hover · 우측 Hover · 좌측 선택됨
  (선택 잠금, 다음 매치로 전환) · 우측 선택됨 · 로딩 (매치 사이) ·
  reduced-motion 변형
- 라운드 전환 안내: 입장 · 정착 · 퇴장 (다음 라운드 첫 매치로 전환). 라운드
  경계마다 전환 예시 1개씩 (48→24, 24→12, 12→6, 6→FINAL).
- THE FINAL: Default 3-up · 3개 각각 Hover · 선택됨
- Champion 확정: 등장 애니메이션 · 정착
- CrownCardModal: 로딩 (canvas 생성 중) · 준비 · 공유 메뉴 열림 ·
  비인증 상태 (LoginPromptBanner 표시)
- ShareActions: 각 버튼 Default + Hover; Download는 "저장됨" 어포던스;
  Twitter는 새 컨텍스트 (시각만)
- 랭킹 표면: 로딩 · 로드됨 · Empty (아직 Tournament 없음) · Anomaly 플래그 행
- Newsroom: 로딩 (스켈레톤) · 로드됨 · Empty (MVP 1의 AI-Report 칼럼은
  AIReportEmptyState 표시)
- AIReportCard hover · AIReportArticle 모달 열림
- 모든 인터랙티브 요소: 가시 포커스 링
- reduced-motion: 라운드 전환 애니메이션 포함 모든 트랜지션 비활성화

[4] 반응형 — 3개 브레이크포인트 전부
- Mobile 375px: MatchView 세로 스택 (위 contestant / VS 구분 / 아래
  contestant); THE FINAL 3인 세로 스택; Crown Card 모달 풀스크린;
  랭킹 1칼럼; Newsroom 1칼럼 (키워드 뉴스 먼저, 그 다음 AI-Report)
- Tablet 768px: MatchView 좌우 + 타이트한 마진; THE FINAL 작은 카드 3개 1행;
  Newsroom은 1칼럼 유지 또는 lite-spec에 따라 2칼럼 전환
- Desktop 1440px: MatchView 좌우 크게; THE FINAL 두드러진 3-up;
  Newsroom 2칼럼 (좌 키워드, 우 AI-Report)
상단 브레이크포인트 스위처.

[5] 브랜드 적용
- 딥 트와일라이트 그라디언트 (순수 검정 금지) — Arena의 가장 드라마틱한
  표면, MatchView에 미묘한 스타디움 라이트 헤이즈
- Crown Gold만 액센트 — VS 구분선, 선택 상태, Champion 확정 골드 후광,
  AI-Report 배지의 골드 ●
- 자체 호스팅 Pretendard
- ContestantCard 호버에 매그네틱 (미묘한 커서 추적 이동 + 글로우)
- 라운드 전환 안내는 더 큰 세리프 타입 + 드라마틱 스태거
- Crown Card는 가장 프리미엄한 타이포 + 가장 두드러진 골드 후광 —
  Voter가 SNS에 공유하는 순간
- 전반에 필름 그레인 오버레이
- Floating Island GNB 영구 표시, MatchView 중에는 컴팩트 (Voter 집중)

[6] 엄격 규칙 — Arena가 가장 엄격하게 강제
- MatchView 표면에 **절대** 금지: 라운드명, 라운드 배지, 매치 카운터,
  "X / Y" 진행 HUD, 카운트다운 타이머, 타임스탬프, 일일 한도 카운터
- Arena 어디서든 **절대** 금지: ROUND OF 16, QUARTERFINAL, SEMIFINAL
- Arena 어디서든 **절대** 금지: Vote Count (절대 수치)
- MatchView·투표 진행 표면에 **절대** 금지: Vote Rate (%)
- Vote Rate (%)는 랭킹 표면(C3)에만 허용
- THE FINAL은 항상 3인 동시 표시 — 1v1로 절대 분할 금지
- 구버전 "AI GENERATED" 라벨 **절대** 금지 — AI-Report 배지 형태 사용
- Tournament Deadline은 참조 가능 (Tournament 카드와 랭킹), Round Deadline은
  개념 자체가 없음
- "FIFA"·"Official" 금지
- 순수 검정 금지
- 예측 / 베팅 / 배당률 언어 금지
- 모든 값은 var(--token-*) / currentColor — 로고 SVG 외 hex 리터럴 0건
- Pretendard만 자체 호스팅 강제. Inter / Playfair Display / JetBrains Mono는 Google Fonts CDN으로 로드 (디자인 시스템 colors_and_type.css의 단일 @import 따름)

[7] 산출물
단일 .html 파일. worldcrown48-design 스킬 fonts/에서 @font-face로 Pretendard
인라인. 5개 C 모듈의 모든 표면을 한 문서에, 섹션 네비게이션(앵커 사이드 레일
또는 탭 스트립)으로 검토 용이하게. 표면별 상태 스위처. 상단 브레이크포인트
스위처. Pretendard에 대한 런타임 네트워크 요청 0건 (worldcrown48-design 스킬 fonts/에서 자체 호스팅 필수). 디자인 시스템 colors_and_type.css가 Inter / Playfair Display / JetBrains Mono를 Google Fonts CDN에서 로드하는 것은 허용.

[8] 자기 검증 (결과 보고에 포함)
- C1 전 표면 존재 (ArenaDomain 셸, MatchView, ContestantCard, 라운드 전환
  안내, THE FINAL)
- C2 전 표면 존재 (Champion 확정, CrownCardModal, CrownCardCanvas, CardPreview,
  ShareActions, LoginPromptBanner)
- C3 랭킹 존재, Vote Rate(%)를 표시하는 유일한 표면
- C4 Newsroom 2칼럼 존재 (키워드 뉴스 7건, AI-Report 3슬롯, NewsSource 출처)
- C5 AIReportCard + AIReportEmptyState + AIReportArticle 존재
- AI-Report 배지가 현행 형태 사용 ("AI GENERATED" 아님)
- 어떤 MatchView 표면에도 라운드명·라운드 배지·매치 카운터·진행 HUD가 없는가
- 어디에도 ROUND OF 16 / QUARTERFINAL / SEMIFINAL 0건
- 허용 라운드명 ROUND OF 48 / 24 / 12 / 6 / THE FINAL이 **라운드 전환 안내에만**
  등장 (MatchView 아님)
- THE FINAL이 3인 동시 표시 (1v1 분할 아님)
- Arena 어디에도 Vote Count 0건
- MatchView / VS Battle / 투표 진행 표면에 Vote Rate(%) 0건
- Vote Rate(%)가 C3 랭킹 표면에만 등장
- 모든 표면의 모든 필수 상태 시연됨
- Mobile + Tablet + Desktop 브레이크포인트 정상 렌더링
- Pretendard가 worldcrown48-design 스킬 fonts/에서 자체 호스팅되는가. Inter / Playfair Display / JetBrains Mono는 디자인 시스템 기준 Google CDN 허용
- 로고 SVG 외 hex 리터럴 0건
- "FIFA"·"Official"·"AI GENERATED" 레거시·순수 검정·Arena 표면의
  카운트다운/타임스탬프/일일 카운터 0건
- 매그네틱 ContestantCard 호버가 커서를 따라가는가
- README 14개 금지 항목 위반 0건
- 5개 C 모듈 lite-spec 모두 각 모듈 범위의 단일 진실로 인용됨

단일 .html 파일을 제출하시오.
```

---

# 5️⃣ Prompt 5 — Domain 4 · The Locker Room (`D1`)
# 5️⃣ 프롬프트 5 — Domain 4 · The Locker Room (`D1`)

> Theme: **light** · MVP **2** · Voter's personal space — first light-theme module.
> 테마: **라이트** · MVP **2** · Voter의 개인 공간 — 첫 라이트 테마 모듈.

### [EN] Send this to Claude Design

```
Role: You are the UI designer for WorldCrown48 Domain 4 — The Locker Room.
Scope: Produce ONE interactive HTML file rendering every D1 surface with all
required states at mobile + tablet + desktop breakpoints.

This is the FIRST light-theme module. The look is OFF-WHITE / CREAM — calm,
personal, intimate. NOT harsh pure white. The kit has no Locker Room entry
yet — you start fresh while using the same Twilight Stadium tokens in their
light-theme variants.

[0] Required reading
1) /CLAUDE.md
2) /LANGUAGE.md
3) /docs/lite-specs/D1-locker-room.md  (single source of truth — auth, voting
   limits, GDPR deletion flow, personal history)
4) /docs/design/WC48_DESIGN_SYSTEM_v2.4.md  (light-theme tokens)
5) /docs/design/README.md
6) worldcrown48-design skill — Twilight Stadium tokens (light variants),
   self-hosted Pretendard. NO existing Locker Room entry in the kit —
   start fresh.
7) Logo SVG assets

[1] Surfaces to render — from the lite-spec
- AuthProvider gate states surrounding the Locker Room shell
- Top Navbar with SignInButton (when unauthenticated) / Profile menu (when
  authenticated)
- Profile header: Voter's display name, avatar, account info from Firebase Auth
- Personal voting history: list of Tournaments the Voter has voted in,
  each entry with Tournament title + the contestant the Voter selected as
  Champion (or "in progress" if not finished). NO Vote Count anywhere.
- Vote-limit indicator: shows the Voter's remaining daily votes for the
  current Tournament (1 day 5 votes per Tournament, KST midnight reset)
- Rate-limit warning surface: shown when Voter hits the 1-minute-10-votes
  cooldown (15-minute cooldown displayed). Friendly tone — not punitive.
- GDPR deletion flow: a multi-step surface for account + data deletion.
  Render the entry screen, confirmation modal, and post-deletion confirmation.
- Saved Crown Cards gallery (if the lite-spec includes it)

[2] States to demonstrate
- AuthProvider: Loading · Unauthenticated · Authenticated
- SignInButton: Default · Hover · Loading · Error
- Profile header: with avatar · without avatar (initial fallback)
- Voting history: Loaded · Empty · Loading skeleton
- Vote-limit indicator: 5 remaining · 2 remaining · 0 remaining
- Rate-limit warning: Idle · Triggered (cooldown timer) · Cleared
- GDPR deletion: Entry · Confirmation modal · Submitting · Success · Cancelled
- All interactive elements: visible focus ring
- Reduced-motion: disables transitions

[3] Responsive
- Mobile 375px: Navbar compact + hamburger; Profile stacked; history 1-column
- Tablet 768px: Navbar fits; Profile 2-column (avatar + info); history 1-column wider
- Desktop 1440px: Navbar full; Profile generous; history 2-column grid; sidebar with vote-limit indicator

[4] Brand application
- Light theme surface from the design system's `--color-surface-light` and related tokens (the design system may resolve these to off-white, cream, or `#FFFFFF` — use the token, do not hand-roll a raw color)
- Crown Gold accent — gentler than dark theme
- Pretendard self-hosted
- NO film grain on light surfaces
- Magnetic primary CTAs
- Floating Island GNB visible — light-theme variant
- Mood: intimate and personal, not loud

[5] Strict rules
- Light theme group only. NO dark-group tokens.
- Use design system light tokens (`--color-surface-light` etc.). Hand-rolled raw `#FFFFFF` outside the token system is prohibited
- D1 does NOT show Arena Match progression — C1's territory
- NO Vote Count anywhere
- Vote Rate (%) only on lite-spec-authorized surfaces
- NO round name / round badge / match counter / "AI generated" legacy label
- Only counter D1 may show is the daily vote-limit reset, lite-spec authorized
- "FIFA" / "Official" prohibited
- Korean-only motif prohibited
- All values via var(--token-*) / currentColor — no hex literal outside the logo SVG
- Pretendard self-hosted only. Inter / Playfair Display / JetBrains Mono load via Google Fonts CDN (per the design system's colors_and_type.css single @import)

[6] Output
Single .html file. Pretendard inlined. All surfaces with state switchers + breakpoint switcher. No runtime network request for Pretendard (it must be self-hosted from the worldcrown48-design skill's fonts/). The design system's `colors_and_type.css` may load Inter / Playfair Display / JetBrains Mono from Google Fonts CDN — this is permitted.

[7] Self-verification (include in final report)
- AuthProvider, Navbar, SignInButton, Profile, voting history, vote-limit
  indicator, rate-limit warning, GDPR deletion flow all present
- All required states demonstrated
- Mobile + Tablet + Desktop breakpoints correct
- Pretendard self-hosted only. Inter / Playfair Display / JetBrains Mono load via Google Fonts CDN (per the design system's colors_and_type.css single @import)
- No hex literal outside the logo SVG
- Light theme only — no dark tokens. Use the design system's light tokens (`--color-surface-light` etc.); no hand-rolled raw `#FFFFFF` outside the token system
- No Arena Match progression on D1
- No Vote Count anywhere
- Vote Rate (%) only on lite-spec-authorized surfaces (or absent)
- No round name / round badge / match counter / "AI generated" label
- No FIFA / Official / Korean-only motif
- README 14 prohibitions: 0 violations
- D1-locker-room.md cited as scope's single source of truth

Deliver the single .html file.
```

### [KO] 한국어 참조 번역

```
역할: 당신은 WorldCrown48 Domain 4 — The Locker Room UI 디자이너입니다.
범위: D1의 모든 표면을 모든 필수 상태로 모바일·태블릿·데스크탑에서 렌더링하는
인터랙티브 HTML 파일 1개.

이것은 **첫 라이트 테마 모듈**입니다. 룩은 OFF-WHITE / 크림 — 차분하고
개인적이고 친밀. 강한 순수 흰색 아님. 킷에 Locker Room 항목 아직 없음 —
같은 Twilight Stadium 토큰의 라이트 테마 변형을 사용해 새로 시작.

[0] 작업 전 필독
1) /CLAUDE.md
2) /LANGUAGE.md
3) /docs/lite-specs/D1-locker-room.md  (단일 진실 — 인증, 투표 한도, GDPR
   삭제 플로우, 개인 히스토리)
4) /docs/design/WC48_DESIGN_SYSTEM_v2.4.md  (라이트 테마 토큰)
5) /docs/design/README.md
6) worldcrown48-design 스킬 — Twilight Stadium 토큰(라이트 변형), 자체 호스팅
   Pretendard. 킷에 Locker Room 항목 없음 — 새로 시작.
7) 로고 SVG 자산

[1] 렌더링할 표면 — lite-spec 기준
- Locker Room 셸 주위의 AuthProvider 게이트 상태
- 톱 Navbar: 비인증 시 SignInButton / 인증 시 Profile 메뉴
- Profile 헤더: Voter 표시 이름, 아바타, Firebase Auth 계정 정보
- 개인 투표 히스토리: Voter가 투표한 Tournament 리스트 + Champion 선택
  contestant (또는 미완료 시 "진행 중"). Vote Count 어디에도 금지.
- 투표 한도 인디케이터: 현재 Tournament의 남은 일일 투표 수 (Tournament당
  1일 5회, KST 자정 리셋)
- Rate-limit 경고 표면: 1분 10회 쿨다운 도달 시 (15분 쿨다운 표시). 친절한 톤.
- GDPR 삭제 플로우: 계정 + 데이터 삭제 다단계 표면. 진입, 확인 모달, 삭제 후 확인.
- 저장된 Crown Card 갤러리 (lite-spec에 포함 시)

[2] 시연할 상태
- AuthProvider: 로딩 · 비인증 · 인증
- SignInButton: Default · Hover · 로딩 · 오류
- Profile 헤더: 아바타 있음 · 없음 (이니셜)
- 투표 히스토리: 로드됨 · Empty · 로딩 스켈레톤
- 투표 한도 인디케이터: 5 남음 · 2 남음 · 0 남음
- Rate-limit 경고: 대기 · 트리거됨 (쿨다운 타이머) · 해제됨
- GDPR 삭제: 진입 · 확인 모달 · 제출 중 · 성공 · 취소됨
- 모든 인터랙티브 요소: 가시 포커스 링
- reduced-motion: 트랜지션 비활성화

[3] 반응형
- Mobile 375px: Navbar 컴팩트 + 햄버거; Profile 스택; 히스토리 1칼럼
- Tablet 768px: Navbar 풀; Profile 2칼럼 (아바타 + 정보); 히스토리 1칼럼 넓게
- Desktop 1440px: Navbar 풀; Profile 넉넉; 히스토리 2칼럼 그리드;
  사이드바 투표 한도 인디케이터

[4] 브랜드 적용
- 라이트 테마 표면은 디자인 시스템 `--color-surface-light` 등 토큰 사용 (off-white·크림·#FFFFFF 어디로 해석되든 토큰 그대로). 토큰 시스템 밖에서 hand-roll한 raw color 금지
- Crown Gold 액센트 — 다크 테마보다 부드럽게
- 자체 호스팅 Pretendard
- 라이트 표면에 필름 그레인 없음
- 매그네틱 프라이머리 CTA
- Floating Island GNB 가시 (라이트 변형)
- 무드: 친밀, 개인적, 시끄럽지 않음

[5] 엄격 규칙
- 라이트 테마군만. 다크군 토큰 금지.
- 디자인 시스템 라이트 토큰(`--color-surface-light` 등) 사용. 토큰 시스템 밖에서 hand-roll한 raw `#FFFFFF` 금지
- D1는 Arena Match 진행 노출 금지 — C1 영역
- Vote Count 어디에도 금지
- Vote Rate(%)는 lite-spec 허가 표면에만
- 라운드명 / 라운드 배지 / 매치 카운터 / "AI 생성됨" 라벨 금지
- D1가 표시할 수 있는 유일한 카운터는 일일 투표 한도 리셋, lite-spec 허가 시
- "FIFA"·"Official" 금지
- 한국적 모티프 금지
- 모든 값은 var(--token-*) / currentColor — 로고 SVG 외 hex 리터럴 0건
- Pretendard만 자체 호스팅 강제. Inter / Playfair Display / JetBrains Mono는 Google Fonts CDN으로 로드 (디자인 시스템 colors_and_type.css의 단일 @import 따름)

[6] 산출물
단일 .html 파일. Pretendard 인라인. 모든 표면 + 상태 스위처 + 브레이크포인트
스위처. Pretendard에 대한 런타임 네트워크 요청 0건 (worldcrown48-design 스킬 fonts/에서 자체 호스팅 필수). 디자인 시스템 colors_and_type.css가 Inter / Playfair Display / JetBrains Mono를 Google Fonts CDN에서 로드하는 것은 허용.

[7] 자기 검증 (결과 보고에 포함)
- AuthProvider, Navbar, SignInButton, Profile, 투표 히스토리, 투표 한도
  인디케이터, Rate-limit 경고, GDPR 삭제 플로우 전부 존재
- 모든 필수 상태 시연됨
- Mobile + Tablet + Desktop 브레이크포인트 정확
- Pretendard 자체 호스팅 강제. Inter / Playfair Display / JetBrains Mono는 디자인 시스템 기준 Google CDN 허용
- 로고 SVG 외 hex 리터럴 0건
- 라이트 테마만 — 다크 토큰 0건. 디자인 시스템 라이트 토큰 사용 (hand-rolled raw `#FFFFFF` 금지)
- D1에 Arena Match 진행 없음
- 어디에도 Vote Count 없음
- Vote Rate(%)가 lite-spec 허가 표면에만 등장 (또는 부재)
- 라운드명 / 라운드 배지 / 매치 카운터 / "AI 생성됨" 라벨 0건
- FIFA / Official / 한국적 모티프 0건
- README 14개 금지 항목 위반 0건
- D1-locker-room.md를 범위의 단일 진실로 인용

단일 .html 파일을 제출하시오.
```

---

# 6️⃣ Prompt 6 — Domain 5 · Policy Hub (`E1`)
# 6️⃣ 프롬프트 6 — Domain 5 · Policy Hub (`E1`)

> Theme: **light** · MVP **1** · GDPR cookie consent + legal pages.
> 테마: **라이트** · MVP **1** · GDPR 쿠키 동의 + 법적 페이지.

### [EN] Send this to Claude Design

```
Role: You are the UI designer for WorldCrown48 Domain 5 — Policy Hub.
Scope: Produce ONE interactive HTML file rendering every E1 surface with all
required states at mobile + tablet + desktop breakpoints.

E1 must work from launch day for GDPR compliance. Visual tone is calm,
legally credible, never decorative-for-the-sake-of-it.

[0] Required reading
1) /CLAUDE.md
2) /LANGUAGE.md
3) /docs/lite-specs/E1-policy-hub.md  (single source of truth — cookie
   consent flow, privacy/terms/community policy structure)
4) /docs/design/WC48_DESIGN_SYSTEM_v2.4.md  (light tokens)
5) /docs/design/README.md
6) worldcrown48-design skill — light variants of Twilight Stadium tokens,
   self-hosted Pretendard. NO existing Policy Hub entry — start fresh.
7) Logo SVG assets

[1] Surfaces to render — from the lite-spec
- CookieConsentProvider context wrapping
- CookieBanner: bottom-fixed banner on first visit. Three primary actions:
  Accept all, Reject non-essential, Customize. Calm copy.
- ConsentModal: opens when "Customize" is clicked. Shows toggleable
  categories: Essential (always on, disabled toggle), Analytics, Marketing
  (locked off through MVP 3). Each category with plain-language explanation.
- Policy pages — three: Privacy Policy, Terms of Service, Community Policy.
  Long-form readable layout. Anchor table of contents. Last-updated date.
- Per-page anchor navigation within each policy page

[2] States to demonstrate
- CookieBanner: First-visit show · Hidden after action · Re-opened via footer link
- ConsentModal: Closed · Open · Saving · Saved confirmation
- Consent category toggles: On · Off · Disabled (Essential always-on, Marketing always-off through MVP 3)
- Policy page: Loading · Loaded · Scrolled (sticky anchor highlights active section)
- All interactive elements: visible focus ring
- Reduced-motion: disables transitions

[3] Responsive
- Mobile 375px: CookieBanner full-width bottom; ConsentModal full-screen; policy 1-column + sticky bottom anchor
- Tablet 768px: CookieBanner with margin; ConsentModal centered with margin; policy with side-anchor nav
- Desktop 1440px: CookieBanner contained-width; ConsentModal centered modal; policy with persistent left-rail anchor nav

[4] Brand application
- Light theme surface from the design system's `--color-surface-light` and related tokens (the design system may resolve these to off-white, cream, or `#FFFFFF` — use the token, do not hand-roll a raw color)
- Crown Gold accent — restrained
- Pretendard self-hosted — generous reading sizes
- Calm motion only
- No film grain (light surface)
- Floating Island GNB visible (light variant)

[5] Strict rules
- Light theme group only
- Use design system light tokens (`--color-surface-light` etc.). Hand-rolled raw `#FFFFFF` outside the token system is prohibited
- "FIFA" and "Official" prohibited on every E1 surface — critical for trademark
- Cookie banner placement obeys the lite-spec — must not be visually subordinated (legal obligation)
- No Korean-only motif — global service tone
- MVP 1 language set is ko + en; design both with comparable type weights
- No legacy "AI GENERATED" label and no legacy "● AI-Report" card byline. The current form is "✦ AI-Report" (12px JetBrains Mono gold) news-article-footer-only
- All values via var(--token-*) / currentColor — no hex literal outside the logo SVG
- Pretendard self-hosted only. Inter / Playfair Display / JetBrains Mono load via Google Fonts CDN (per the design system's colors_and_type.css single @import)

[6] Output
Single .html file. Pretendard inlined. State + breakpoint switchers. ko vs en sample policy content toggle. No runtime network request for Pretendard (it must be self-hosted from the worldcrown48-design skill's fonts/). The design system's `colors_and_type.css` may load Inter / Playfair Display / JetBrains Mono from Google Fonts CDN — this is permitted.

[7] Self-verification (include in final report)
- CookieBanner with Accept all + Reject non-essential + Customize actions present
- ConsentModal with Essential / Analytics / Marketing toggleable categories
  (Essential always-on, Marketing always-off through MVP 3)
- Three policy pages (Privacy, Terms, Community) with anchor TOC + last-updated
- All required states demonstrated
- Mobile + Tablet + Desktop breakpoints correct
- Pretendard self-hosted only. Inter / Playfair Display / JetBrains Mono load via Google Fonts CDN (per the design system's colors_and_type.css single @import)
- No hex literal outside the logo SVG
- Light theme only — no dark tokens. Use the design system's light tokens (`--color-surface-light` etc.); no hand-rolled raw `#FFFFFF` outside the token system
- No "FIFA", no "Official" anywhere
- No Korean-only motif
- ko + en sample content with comparable type weights
- README 14 prohibitions: 0 violations
- E1-policy-hub.md cited as scope's single source of truth

Deliver the single .html file.
```

### [KO] 한국어 참조 번역

```
역할: 당신은 WorldCrown48 Domain 5 — Policy Hub UI 디자이너입니다.
범위: E1의 모든 표면을 모든 필수 상태로 모바일·태블릿·데스크탑에서 렌더링하는
인터랙티브 HTML 파일 1개.

E1는 GDPR 준수를 위해 런칭 당일부터 작동. 비주얼 톤은 차분하고 법적으로
신뢰감 있고, 장식적이지 않음.

[0] 작업 전 필독
1) /CLAUDE.md
2) /LANGUAGE.md
3) /docs/lite-specs/E1-policy-hub.md  (단일 진실)
4) /docs/design/WC48_DESIGN_SYSTEM_v2.4.md  (라이트 토큰)
5) /docs/design/README.md
6) worldcrown48-design 스킬 — Twilight Stadium 토큰 라이트 변형, 자체 호스팅
   Pretendard. Policy Hub 항목 없음 — 새로 시작.
7) 로고 SVG 자산

[1] 렌더링할 표면 — lite-spec 기준
- CookieConsentProvider 컨텍스트 래핑
- CookieBanner: 첫 방문 하단 고정 배너. 프라이머리 액션 3개: 모두 수락,
  필수만 수락, 설정하기. 차분한 카피.
- ConsentModal: "설정하기" 클릭 시 열림. 토글 카테고리: 필수 (항상 켜짐,
  비활성), 분석, 마케팅 (MVP 3까지 항상 꺼짐). 평이한 설명.
- 정책 페이지 3개: 개인정보, 이용약관, 커뮤니티 정책. 장문 가독성. 앵커 TOC. 최종 업데이트.
- 각 정책 페이지 내 앵커 네비

[2] 시연할 상태
- CookieBanner: 첫 방문 · 액션 후 숨김 · 푸터 링크로 재오픈
- ConsentModal: 닫힘 · 열림 · 저장 중 · 저장 확인
- 카테고리 토글: 켜짐 · 꺼짐 · 비활성 (필수 항상 켜짐, 마케팅 항상 꺼짐)
- 정책 페이지: 로딩 · 로드됨 · 스크롤됨 (스티키 앵커 활성 섹션 강조)
- 모든 인터랙티브 요소: 가시 포커스 링
- reduced-motion: 트랜지션 비활성화

[3] 반응형
- Mobile 375px: CookieBanner 풀폭 하단; ConsentModal 풀스크린; 정책 1칼럼 + 스티키 하단 앵커
- Tablet 768px: CookieBanner 마진; ConsentModal 가운데 + 마진; 정책 사이드 앵커 네비
- Desktop 1440px: CookieBanner 폭 제한; ConsentModal 가운데 모달; 정책 좌측 영구 앵커 네비

[4] 브랜드 적용
- 라이트 테마 표면은 디자인 시스템 `--color-surface-light` 등 토큰 사용 (off-white·크림·#FFFFFF 어디로 해석되든 토큰 그대로). 토큰 시스템 밖에서 hand-roll한 raw color 금지
- Crown Gold 액센트 — 절제
- 자체 호스팅 Pretendard — 정책 본문 넉넉한 가독성 사이즈
- 차분한 모션만
- 필름 그레인 없음 (라이트 표면)
- Floating Island GNB 가시 (라이트 변형)

[5] 엄격 규칙
- 라이트 테마군만
- 디자인 시스템 라이트 토큰(`--color-surface-light` 등) 사용. 토큰 시스템 밖에서 hand-roll한 raw `#FFFFFF` 금지
- 모든 E1 표면에 "FIFA"·"Official" 금지 — 상표권 critical
- 쿠키 배너 배치는 lite-spec — 시각적 종속 금지 (법적 의무)
- 한국적 모티프 금지 — 글로벌 서비스 톤
- MVP 1 언어 집합 ko + en; 두 언어 비교 가능한 타입 웨이트
- 구버전 "AI 생성됨" 라벨 금지
- 모든 값은 var(--token-*) / currentColor — 로고 SVG 외 hex 리터럴 0건
- Pretendard만 자체 호스팅 강제. Inter / Playfair Display / JetBrains Mono는 Google Fonts CDN으로 로드 (디자인 시스템 colors_and_type.css의 단일 @import 따름)

[6] 산출물
단일 .html 파일. Pretendard 인라인. 상태 + 브레이크포인트 스위처. ko vs en
샘플 정책 콘텐츠 토글. Pretendard에 대한 런타임 네트워크 요청 0건 (worldcrown48-design 스킬 fonts/에서 자체 호스팅 필수). 디자인 시스템 colors_and_type.css가 Inter / Playfair Display / JetBrains Mono를 Google Fonts CDN에서 로드하는 것은 허용.

[7] 자기 검증 (결과 보고에 포함)
- CookieBanner: 모두 수락 + 필수만 수락 + 설정하기 액션 존재
- ConsentModal: 필수 / 분석 / 마케팅 토글 카테고리 (필수 항상 켜짐, 마케팅
  MVP 3까지 항상 꺼짐)
- 정책 페이지 3개 (개인정보, 이용약관, 커뮤니티) + 앵커 TOC + 최종 업데이트
- 모든 필수 상태 시연됨
- Mobile + Tablet + Desktop 브레이크포인트 정확
- Pretendard 자체 호스팅 강제. Inter / Playfair Display / JetBrains Mono는 디자인 시스템 기준 Google CDN 허용
- 로고 SVG 외 hex 리터럴 0건
- 라이트 테마만 — 다크 토큰 0건. 디자인 시스템 라이트 토큰 사용 (hand-rolled raw `#FFFFFF` 금지)
- 어디에도 "FIFA"·"Official" 0건
- 한국적 모티프 0건
- ko + en 샘플 콘텐츠 비교 가능한 타입 웨이트
- README 14개 금지 항목 위반 0건
- E1-policy-hub.md를 범위의 단일 진실로 인용

단일 .html 파일을 제출하시오.
```

---

# 7️⃣ Prompt 7 — Domain 6 · Admin Dashboard (`G1`)
# 7️⃣ 프롬프트 7 — Domain 6 · Admin Dashboard (`G1`)

> Theme: **light** · MVP **1** · admin-only · **desktop-first** (operational tool).
> 테마: **라이트** · MVP **1** · 관리자 전용 · **데스크탑 우선** (운영 도구).

### [EN] Send this to Claude Design

```
Role: You are the UI designer for WorldCrown48 Domain 6 — Admin Dashboard.
Scope: Produce ONE interactive HTML file rendering every G1 surface with all
required states. Desktop-first (1440px primary) with graceful tablet view.
Mobile is secondary.

[0] Required reading
1) /CLAUDE.md
2) /LANGUAGE.md
3) /docs/lite-specs/G1-admin-dashboard.md  (single source of truth)
4) /docs/design/WC48_DESIGN_SYSTEM_v2.4.md
5) /docs/design/README.md
6) worldcrown48-design skill — light variants of Twilight Stadium tokens,
   self-hosted Pretendard. NO existing Admin Dashboard entry — start fresh.
7) Logo SVG assets

[1] Surfaces to render — from the lite-spec
- AdminDashboard shell at /admin/dashboard, admin uid gate
- AdminSidebar (left): navigation between dashboard sections
- DashboardMain (right):
  - KPICards: five metric cards (M1) — concise number + label + delta.
    Vote Count IS permitted on these admin-only cards (lite-spec authorizes).
    MUST NOT leak to Voter-facing components.
  - VoteSpeedChart: real-time vote-speed chart (M1)
  - AlertCards: Rate Limiting + abuse warning cards (M1) — colour-coded
    severity, dismiss + investigate actions
  - TournamentTable: filter + sort (M2)

[2] States to demonstrate
- Admin gate: Authenticated admin · Unauthenticated · Non-admin
- AdminSidebar: collapsed · expanded · active item
- KPICards: Loading · Loaded · Stale-data · Delta positive/negative/neutral
- VoteSpeedChart: Loading · Loaded · Empty · Hover-tooltip
- AlertCards: None · Low · Medium · High · Dismissed
- TournamentTable: Loading · Loaded · Filtered · Sorted · Empty · Row-hover
- All interactive elements: visible focus ring
- Reduced-motion: disables chart entrance animation + transitions

[3] Responsive
- Desktop 1440px primary: sidebar left + main right; 2 or 3-column card grid; chart full-width
- Tablet 768px: sidebar collapses to top-bar; cards 1 or 2-column; chart full-width
- Mobile 375px: "use wider screen" notice; read-only KPI + Alert stacked; table as card list

[4] Brand application
- Light theme surface from the design system's `--color-surface-light` and related tokens (the design system may resolve these to off-white, cream, or `#FFFFFF` — use the token, do not hand-roll a raw color)
- Crown Gold for primary actions + active sidebar item
- Crimson for high-severity AlertCards
- Turquoise / muted teal for informational accents
- Pretendard self-hosted
- Magnetic primary actions
- No film grain (light surface)
- Admin chrome visually distinct from Voter-facing surfaces

[5] Strict rules
- Light theme group only
- Use design system light tokens (`--color-surface-light` etc.). Hand-rolled raw `#FFFFFF` outside the token system is prohibited
- Admin-only. NO Voter-facing language.
- Vote Count IS permitted on internal admin KPI cards (lite-spec authorizes).
  G1 MUST NOT expose any public component that surfaces Vote Count to other modules.
- G1 does NOT display Voter-facing legal copy (E1 territory)
- No legacy "AI GENERATED" label and no legacy "● AI-Report" card byline. The current form is "✦ AI-Report" (12px JetBrains Mono gold) news-article-footer-only — future AI views use AI-Report badge
- No "FIFA", no "Official"
- No Korean-only motif
- All values via var(--token-*) / currentColor — no hex literal outside the logo SVG
- Pretendard self-hosted only. Inter / Playfair Display / JetBrains Mono load via Google Fonts CDN (per the design system's colors_and_type.css single @import)

[6] Output
Single .html file. Pretendard inlined. State + breakpoint switchers. No runtime network request for Pretendard (it must be self-hosted from the worldcrown48-design skill's fonts/). The design system's `colors_and_type.css` may load Inter / Playfair Display / JetBrains Mono from Google Fonts CDN — this is permitted.

[7] Self-verification (include in final report)
- AdminDashboard shell + admin uid gate present
- AdminSidebar with navigation
- KPICards × 5 (M1) with Loading / Loaded / Stale / Delta states
- VoteSpeedChart with Loading / Loaded / Empty / Hover-tooltip
- AlertCards with None / Low / Medium / High / Dismissed
- TournamentTable (M2) with Loading / Loaded / Filtered / Sorted / Empty / Row-hover
- Admin gate: Authenticated / Unauthenticated / Non-admin
- Desktop 1440px primary correct; Tablet 768px graceful; Mobile 375px wider-screen notice + read-only
- Pretendard self-hosted only. Inter / Playfair Display / JetBrains Mono load via Google Fonts CDN (per the design system's colors_and_type.css single @import)
- No hex literal outside the logo SVG
- Light theme only — no dark tokens. Use the design system's light tokens (`--color-surface-light` etc.); no hand-rolled raw `#FFFFFF` outside the token system
- Vote Count present on KPI cards (admin scope) but NOT exposed to Voter-facing components
- No Voter-facing legal copy on G1
- No legacy "AI GENERATED" label and no legacy "● AI-Report" card byline. The current form is "✦ AI-Report" (12px JetBrains Mono gold) news-article-footer-only
- No FIFA / Official / Korean-only motif
- README 14 prohibitions: 0 violations
- G1-admin-dashboard.md cited as scope's single source of truth

Deliver the single .html file.
```

### [KO] 한국어 참조 번역

```
역할: 당신은 WorldCrown48 Domain 6 — Admin Dashboard UI 디자이너입니다.
범위: G1의 모든 표면을 모든 필수 상태로 렌더링하는 인터랙티브 HTML 파일 1개.
데스크탑 우선(1440px) + 우아한 태블릿. 모바일은 보조.

[0] 작업 전 필독
1) /CLAUDE.md
2) /LANGUAGE.md
3) /docs/lite-specs/G1-admin-dashboard.md  (단일 진실)
4) /docs/design/WC48_DESIGN_SYSTEM_v2.4.md
5) /docs/design/README.md
6) worldcrown48-design 스킬 — Twilight Stadium 토큰 라이트 변형, 자체 호스팅
   Pretendard. Admin Dashboard 항목 없음 — 새로 시작.
7) 로고 SVG 자산

[1] 렌더링할 표면 — lite-spec 기준
- AdminDashboard 셸 (/admin/dashboard, 관리자 uid 게이트)
- AdminSidebar (좌): 섹션 네비게이션
- DashboardMain (우):
  - KPICards: 5개 지표 카드 (M1) — 간결한 숫자 + 라벨 + 델타.
    Vote Count는 lite-spec이 허가했으므로 관리자 전용 카드에 표시 가능.
    Voter용 컴포넌트로 누출 절대 금지.
  - VoteSpeedChart: 실시간 투표 속도 차트 (M1)
  - AlertCards: Rate Limiting + 어뷰징 경고 (M1) — 심각도 색상, 무시 + 조사
  - TournamentTable: 필터 + 정렬 (M2)

[2] 시연할 상태
- 관리자 게이트: 인증 · 비인증 · 비관리자
- AdminSidebar: 접힘 · 펼침 · 활성 항목
- KPICards: 로딩 · 로드됨 · stale · 델타 양/음/중립
- VoteSpeedChart: 로딩 · 로드됨 · Empty · 호버 툴팁
- AlertCards: 없음 · 낮음 · 중간 · 높음 · 무시됨
- TournamentTable: 로딩 · 로드됨 · 필터됨 · 정렬됨 · Empty · 행 호버
- 모든 인터랙티브 요소: 가시 포커스 링
- reduced-motion: 차트 등장 + 트랜지션 비활성화

[3] 반응형
- 데스크탑 1440px 메인: 좌 사이드바 + 우 메인; 2 또는 3칼럼 카드 그리드; 차트 풀폭
- 태블릿 768px: 사이드바 톱바로 축소; 카드 1 또는 2칼럼; 차트 풀폭
- 모바일 375px: "더 넓은 화면 사용" 알림; KPI + Alert 스택 읽기 전용; 테이블은 카드 리스트

[4] 브랜드 적용
- 라이트 테마 표면은 디자인 시스템 `--color-surface-light` 등 토큰 사용 (off-white·크림·#FFFFFF 어디로 해석되든 토큰 그대로). 토큰 시스템 밖에서 hand-roll한 raw color 금지
- Crown Gold = 프라이머리 액션 + 활성 사이드바
- Crimson = 높은 심각도 AlertCards
- Turquoise / 차분한 청록 = 정보 액센트
- 자체 호스팅 Pretendard
- 매그네틱 프라이머리 액션
- 필름 그레인 없음 (라이트)
- 관리자 크롬은 Voter용 표면과 시각적으로 명확히 구분

[5] 엄격 규칙
- 라이트 테마군만
- 디자인 시스템 라이트 토큰(`--color-surface-light` 등) 사용. 토큰 시스템 밖에서 hand-roll한 raw `#FFFFFF` 금지
- 관리자 전용. Voter용 언어 금지.
- Vote Count는 lite-spec 허가로 관리자 KPI 카드에 허용.
  Voter용 컴포넌트로 누출하는 공개 컴포넌트 절대 금지.
- G1는 Voter용 법적 카피 표시 금지 (E1 영역)
- 구버전 "AI 생성됨" 라벨 금지 — 향후 AI 뷰는 AI-Report 배지
- "FIFA"·"Official" 금지
- 한국적 모티프 금지
- 모든 값은 var(--token-*) / currentColor — 로고 SVG 외 hex 리터럴 0건
- Pretendard만 자체 호스팅 강제. Inter / Playfair Display / JetBrains Mono는 Google Fonts CDN으로 로드 (디자인 시스템 colors_and_type.css의 단일 @import 따름)

[6] 산출물
단일 .html 파일. Pretendard 인라인. 상태 + 브레이크포인트 스위처. Pretendard에 대한 런타임 네트워크 요청 0건 (worldcrown48-design 스킬 fonts/에서 자체 호스팅 필수). 디자인 시스템 colors_and_type.css가 Inter / Playfair Display / JetBrains Mono를 Google Fonts CDN에서 로드하는 것은 허용.

[7] 자기 검증 (결과 보고에 포함)
- AdminDashboard 셸 + 관리자 uid 게이트 존재
- AdminSidebar + 네비게이션
- KPICards × 5 (M1) + 로딩 / 로드됨 / stale / 델타 상태
- VoteSpeedChart + 로딩 / 로드됨 / Empty / 호버 툴팁
- AlertCards + 없음 / 낮음 / 중간 / 높음 / 무시됨
- TournamentTable (M2) + 로딩 / 로드됨 / 필터됨 / 정렬됨 / Empty / 행 호버
- 관리자 게이트: 인증 / 비인증 / 비관리자
- 데스크탑 1440px 메인 정확; 태블릿 768px 우아; 모바일 375px 알림 + 읽기 전용
- Pretendard 자체 호스팅 강제. Inter / Playfair Display / JetBrains Mono는 디자인 시스템 기준 Google CDN 허용
- 로고 SVG 외 hex 리터럴 0건
- 라이트 테마만 — 다크 토큰 0건. 디자인 시스템 라이트 토큰 사용 (hand-rolled raw `#FFFFFF` 금지)
- KPI 카드에 Vote Count(관리자 영역) — Voter용 컴포넌트로 누출 0건
- G1에 Voter용 법적 카피 0건
- 구버전 "AI 생성됨" 라벨 0건
- FIFA / Official / 한국적 모티프 0건
- README 14개 금지 항목 위반 0건
- G1-admin-dashboard.md를 범위의 단일 진실로 인용

단일 .html 파일을 제출하시오.
```

---

## 📝 Change log · 변경 이력

| Version | Date | Change | 변경 사항 |
|---------|------|--------|----------|
| v1 | 2026-05-29 (AM) | Single mega-prompt, 7-domain boundary | 단일 거대 프롬프트, 7-Domain 경계 (폐기) |
| v2 | 2026-05-29 | Single mega-prompt, 12-agent boundary | 단일 거대 프롬프트, 12-에이전트 경계 (과부하 확인) |
| v3 | 2026-05-30 | 8 prompts per domain, EN+KO — **architecture specs** (wrong output) | 도메인별 8개 프롬프트, EN+KO — **아키텍처 명세** (잘못된 산출물) |
| v3.1 | 2026-05-30 (PM) | Added Strict Mode addendum to v3 — still architecture specs, not UI | v3에 엄격 모드 추가 — 여전히 아키텍처 명세, UI 아님 |
| **v4** | **2026-05-30 (PM)** | **Complete rewrite. Asks Claude Design to produce ACTUAL CLICKABLE HTML UI PROTOTYPES for every surface in every domain — with hover/focus/loading/success/error states, mobile+tablet+desktop breakpoints, self-hosted Pretendard, no hex outside logo SVG. 8 prompts: Brand Visual Guide + Domain 0–6.** | **완전 재작성. Claude Design이 각 도메인 모든 표면의 실제 클릭 가능한 HTML UI 프로토타입을 만들도록 요청 — hover/focus/loading/success/error 상태, 모바일+태블릿+데스크탑 브레이크포인트, 자체 호스팅 Pretendard, 로고 SVG 외 hex 0건. 프롬프트 8개: 브랜드 비주얼 가이드 + Domain 0~6.** |
| **v4.1** | **2026-05-31** | **A1 prompt synced with A1-the-pitch.md v0.2: M5 Newsroom module added · Tournament Host vs System Admin terminology distinction applied · TopCreatorsSidebar retired · desktop grid 4-col→3-col · v4.9 §5 + C4 newsroom added to Required Reading. Other prompts unchanged.** | **A1 프롬프트를 A1-the-pitch.md v0.2와 동기화: M5 뉴스룸 모듈 추가 · Tournament Host vs System Admin 용어 구분 적용 · TopCreatorsSidebar 폐기 · 데스크탑 그리드 4열→3열 · 필독 목록에 v4.9 §5 + C4 뉴스룸 추가. 다른 프롬프트는 변경 없음.** |

---

*© 2026 WorldCrown48 | Claude Design Request v4.1 · Per-Domain Interactive UI Mockups · 2026-05-31*
