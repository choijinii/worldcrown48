# Handoff Brief — A-1 The Pitch (Domain 1)

> **From**: Cowork (기획·시안 분석) · **To**: Claude Code (auto mode 사용)
> **Date**: 2026-06-29 · **Author**: 대표 · **Version**: v1.0 (template v2.1)
> **작업 브랜치**: `feat/a1-the-pitch` (main 최신에서 분기)
> **워크트리 제안**: `/Users/jinii/Projects/wc48-a1` (Antigravity 회피 — [[feedback-antigravity-worktree-hijack]])
>
> **목표 산출물** (Phase 5개):
> - Phase A · 라우트 swap (`/` → A-1, A-0 → `/launch`)
> - Phase B · 5개 모듈 구현 (HeroSection · GNB · TrendingFeed · LabEntryCard · NewsroomFeed)
> - Phase C · 시드 + Firestore 쿼리 + composite index
> - Phase D · i18n(ko·en) + 3-BP 반응형 + E2E + 시각 검증
> - Phase E · PR 제출 + Production 머지 + CDN 반영 확인

---

## ⚠️ 이 핸드오프의 진실 공급원 (충돌 시 우선순위)

```
1순위  docs/design/wireframes/Domain 1 · The Pitch.html   ← 시각·인터랙션의 단일 진실
2순위  docs/lite-specs/A1-the-pitch.md                    ⚠️ 구버전 표기 4건 — 본 §1.2 정정표 사용
3순위  docs/design/WC48_DESIGN_SYSTEM_v2.4.md             ← 토큰·AI-Report 푸터 전용 락
4순위  docs/mental-model/MENTAL_MODEL.svg                  ← 충돌 시 무조건 우선
```

**lite-spec 정정표 (§1.2에 grep 명령으로 강제 확인)**

| # | 구버전 (lite-spec) | 본 핸드오프에서 사용 |
|---|---|---|
| ① | Vite + React Router | **Next.js 14 App Router** (CLAUDE.md #8) |
| ② | `FIFA \| KPOP` 2-카테고리 enum | **6개**: `FOOTBALL · KPOP · ANIME · GAMING · MOVIE · OTHER` ([[project-categories-2026-06-20]]) |
| ③ | `<CategoryFilter />` 컴포넌트 | **삭제** (wireframe 줄 170 주석: single-stream feed) |
| ④ | "LIVE 뱃지 표시 가능" | **금지** (CLAUDE.md 불변 원칙 #2 Round Scope Lock) |
| ⑤ | wireframe `nfi-tag = REPORT` | **`✦ AI-Report`로 변경** (v2.4 Footer-Only Lock — [[project-ai-report-footer-only]]) |

---

## §0. 자가 검증 — 코드 작성 전 반드시 모두 ✓

하나라도 ✗이면 즉시 STOP하고 대표에게 보고. ([[feedback-evidence-before-diagnosis]])

### 0.1 위치 + 브랜치 + main 최신 상태

```bash
git branch --show-current                              # 기대: feat/a1-the-pitch
git log main --oneline -3                              # 기대 최신: 78948ab (dev-visual-aid squash)
git diff main..feat/a1-the-pitch --stat | head -5      # 기대: 새 브랜치라 빈 출력 또는 핸드오프 1개
```

### 0.2 핵심 파일 존재

```bash
test -f "docs/design/wireframes/Domain 1 · The Pitch.html" && echo "✓ wireframe"
test -f docs/design/WC48_DESIGN_SYSTEM_v2.4.md && echo "✓ v2.4 토큰"
test -f docs/handoffs/A1-the-pitch-handoff.md && echo "✓ 본 핸드오프"
test -f lib/types/tournament.ts && echo "✓ Tournament 타입 (C-1에서 작성)"
test -f app/page.tsx && echo "✓ 현재 / = A-0 Launch Pad (Phase A에서 이동 대상)"
```

### 0.3 lite-spec 구버전 표기 grep 확인 (정정표 §1.2 강제)

```bash
# 구버전 표기가 실제로 lite-spec에 있는지 = "있어야 함" (있다는 사실을 확인하고 정정표대로 무시한다)
grep -nE "Vite|React Router|FIFA.\|.KPOP|CategoryFilter|LIVE" docs/lite-specs/A1-the-pitch.md
# 기대: 5건 모두 hit. 핸드오프 §1.2 정정표대로 무시하고 wireframe만 따른다.
```

### 0.4 카테고리 enum 단일 진실 = lib/types/tournament.ts

```bash
grep -nE "FOOTBALL|KPOP|ANIME|GAMING|MOVIE|OTHER" lib/types/tournament.ts
# 기대: CATEGORIES const에 6개 모두. 본 PR은 import만, 재정의 X.
```

### 0.5 의존성

```bash
node -v        # 기대: v20.x
npm list zustand firebase next react   # 기대: zustand@5 · firebase@12 · next@14.2 · react@18.3
```

### 0.6 라우트 swap 안전 검증 (Phase A 진입 전)

```bash
# 현재 / 의 컴포넌트가 옮길 수 있는 상태인지 확인
grep -E "LaunchHero|FeaturedTournament|WaitlistForm|SNSLinks" app/page.tsx | wc -l
# 기대: 4 (모두 import). 4가 아니면 A-0 구조가 바뀐 것 → 대표 보고 후 진행.
```

---

## §1. Pre-flight Checklist — §0 통과 후

### 1.1 읽기 의무

```
☐ CLAUDE.md 불변 원칙 8가지 (특히 #1 다크테마 · #2 Crown Gold · #5 FIFA 금지)
☐ LANGUAGE.md 공식 용어 (Tournament · Contestant · Voter · Champion · Crown Card)
☐ docs/mental-model/MENTAL_MODEL.svg (Round 표시 위치 가드레일)
☐ docs/design/WC48_DESIGN_SYSTEM_v2.4.md §AI-Report 배지 표준
☐ docs/design/wireframes/Domain 1 · The Pitch.html (710줄 전부)
☐ 본 핸드오프 처음부터 끝까지
```

### 1.2 lite-spec 구버전 표기 정정 — 본 §0.3 grep 결과 5건 모두 정정표대로 무시

⚠️ lite-spec에 적힌 다음 5건은 **본 핸드오프에서 사용 금지**:
- Vite + React Router · `FIFA|KPOP` 2-카테고리 · `<CategoryFilter />` · "LIVE 뱃지" · `nfi-tag=REPORT`

대신 본 핸드오프 §6의 wireframe 매핑·§5 Hard Constraints만 따름.

---

## §2. Goal — 한 줄 결과 정의

> **worldcrown48.com `/` 가 A-1 The Pitch(트렌딩 토너먼트 피드)로 진입하고, A-0 Launch Pad는 `/launch`로 archive된다.** wireframe 5개 모듈(GNB · Hero · TrendingFeed · LabEntryCard · NewsroomFeed)이 3-BP 반응형으로 작동하고, Vote Count 절대 수치·Vote Rate(%)·LIVE 배지·CategoryFilter·Round HUD는 어디에도 노출되지 않으며, ko/en 다국어 + 시드 데이터로 Preview 100% 시각 검증 후 Production 머지.

---

## §3. Files to CREATE / MODIFY

| Phase | 경로 | 동작 | 설명 |
|---|---|---|---|
| **A** | `app/page.tsx` | **EDIT** | A-0 imports 제거 → A-1 `<PitchPage />` 로 교체 |
| **A** | `app/launch/page.tsx` | **NEW** | 현 `app/page.tsx` 내용 그대로 이동 (A-0 archive) |
| **A** | `app/launch/layout.tsx` | **NEW** | A-0 전용 metadata(title·description·OG) 유지 |
| **A** | `app/layout.tsx` | **EDIT** | metadata.title·description·OG image를 A-1 기준으로 교체. A-0 OG는 launch/layout으로 이동 |
| **B** | `app/components/pitch/PitchPage.tsx` | **NEW** | `<main>` shell + `.pitch-grain` + `<PitchInner>` 컨테이너 쿼리 호스트 |
| **B** | `app/components/pitch/GnbIsland.tsx` | **NEW** | Floating Island GNB + scroll-compact (`pitch-scroll > 40px` → compact class) |
| **B** | `app/components/pitch/HeroSection.tsx` | **NEW** | Kicker + L1/L2 타이틀 + sub + `START VOTING` · `EXPLORE` CTA + magnetic translate |
| **B** | `app/components/pitch/TrendingFeed.tsx` | **NEW** | section-head + `<TournamentCard>` grid + skeleton/empty state switch |
| **B** | `app/components/pitch/TournamentCard.tsx` | **NEW** | cover(48 VS) + status pill(active/published만) + title + meta(`48 Contestants · Closes {date}`) + ENTER. **Vote Count/Rate/LIVE 금지** |
| **B** | `app/components/pitch/LabEntryCard.tsx` | **NEW** | `data-lab="locked"` (기본, 일반 Voter) 와 `data-lab="active"` (Tournament Host) 2-state |
| **B** | `app/components/pitch/NewsroomFeed.tsx` | **NEW** | GNews + Fan Intelligence(`✦ AI-Report`) merged feed. `data-news="loaded/loading/partial/empty"` 4-state |
| **B** | `app/components/pitch/NewsFeedItem.tsx` | **NEW** | thumb(88×72) + source + title(2줄 clamp) + date + ext-link. AI 기사면 `border-left:3px gold` + 푸터 `✦ AI-Report` |
| **B** | `lib/pitch/pitchStore.ts` | **NEW** | Zustand: `tournaments[]`, `loading`, `subscribeToTrending()` (Firestore onSnapshot — single-stream, no category) |
| **B** | `lib/pitch/newsroom.ts` | **NEW** | GNews fetch + Fan Intelligence 통합 merge 로직 (생성 순서대로 6개 — wireframe 줄 693 패턴) |
| **B** | `app/components/pitch/pitch.css` | **NEW** | wireframe `<style>` 토큰화 — `--space-*`, `--color-*` v2.4 변수만 사용 (hex literal 0건) |
| **C** | `functions/scripts/seed-a1-preview.mjs` | **NEW** | 6개 시드 토너먼트 (4 published + 2 draft, 카테고리 6종 분산, featured 1개) |
| **C** | `firestore.indexes.json` | **EDIT** | tournaments: `where status=='published' orderBy createdAt desc` 인덱스 추가 ([[feedback-firestore-composite-index]]) |
| **C** | `lib/i18n/locales/ko.json` | **EDIT** | A-1 string key 추가 |
| **C** | `lib/i18n/locales/en.json` | **EDIT** | A-1 string key 추가 |
| **D** | `__tests__/pitch/pitchStore.test.ts` | **NEW** | Zustand store 유닛 (subscribe 호출 · 정렬 · 빈 상태) |
| **D** | `__tests__/pitch/newsroom.test.ts` | **NEW** | merge 순서·AI 배지 분기 유닛 |
| **D** | `__tests__/pitch/TournamentCard.test.tsx` | **NEW** | LIVE 배지·voteCount·voteRate 0건 검증 (RTL grep assertion) |
| **D** | `__tests__/pitch/LabEntryCard.test.tsx` | **NEW** | locked/active state 전환 |
| **D** | `e2e/pitch.spec.ts` | **NEW** | 4개 E2E 시나리오 (§7.2) |
| **D** | `.github/workflows/a1-pitch-e2e.yml` | **NEW** | PR scope: `app/components/pitch/**`, `lib/pitch/**`, `e2e/pitch.spec.ts` ([[feedback-workflow-spec-scope]]) |
| **D** | `playwright.config.ts` | **EDIT** | mobile-320 · tablet-768 · desktop-1440 projects 확인 (없으면 추가) |

---

## §4. Acceptance Criteria — 완료 조건

```
☐ AC-1   /  방문 시 A-1 The Pitch 렌더 (Hero·GNB·TrendingFeed·LabEntryCard·NewsroomFeed 5개 보임)
☐ AC-2   /launch 방문 시 A-0 (LaunchHero·FeaturedTournament·WaitlistForm·SNSLinks) 렌더, 깨짐 0건
☐ AC-3   /admin/lab · /arena/[id] · /policies/[type] · /account 기존 라우트 정상 작동 (회귀 0건)
☐ AC-4   TournamentCard에 voteCount·voteRate·LIVE 문자열 0건 (RTL `queryByText` null assertion)
☐ AC-5   CategoryFilter 컴포넌트·chip UI 0건 (코드 grep + 시각 검증)
☐ AC-6   Round 정보(`ROUND OF 48` 등) The Pitch 전 영역에서 0건
☐ AC-7   "FIFA"·"Official" 문자 The Pitch 어디에도 0건
☐ AC-8   GNB scroll-compact 작동 (pitch-scroll.scrollTop > 40 시 `.gnb--compact` 토글)
☐ AC-9   LabEntryCard `data-lab="locked"` 기본, hostUid 매칭 시 `data-lab="active"` 전환
☐ AC-10  NewsroomFeed AI 기사 푸터에 `✦ AI-Report` 1회만 (카드 바이라인 `● AI-Report` 0건)
☐ AC-11  3-BP 반응형: 320(1열) · 768(2열) · 1440(3열) grid 확인 (시각 회귀)
☐ AC-12  ko/en 토글 시 모든 string key 번역 (영문/한글 누락 0건)
☐ AC-13  Vercel Preview 100% 시각 검증 통과 (`?lang=ko` · `?lang=en` · 3-BP × 5 모듈 = 30 스크린샷)
☐ AC-14  Production 머지 후 worldcrown48.com 5분 내 CDN 반영 확인 (curl 200 + HTML 비교)
☐ AC-15  prefers-reduced-motion 시 magnetic translate·shimmer·transition 모두 중단
```

---

## §5. Hard Constraints — DO / DON'T

### DO
- **wireframe HTML을 단일 진실로 사용**. 토큰·간격·라운드 라벨 표기는 wireframe verbatim ±2px.
- **카테고리는 lib/types/tournament.ts `CATEGORIES` import만**. 재정의 금지.
- **Firestore 쿼리는 `where status == 'published' orderBy createdAt desc limit 12`** (trend_score 정렬 노출 X).
- **NewsroomFeed AI 분기 = `source.includes('Fan Intelligence')`** 한 곳에서만 결정.
- **시드 스크립트 키는 ENV로만**. 채팅 노출 절대 금지 ([[feedback-secret-clipboard-pattern]]).
- **i18n 텍스트 assertion E2E는 `?lang=ko` 쿼리로 언어 강제** ([[feedback-i18n-test-determinism]]).
- **시드 데이터 날짜는 동적 계산** (`now() + 14d`), 하드코드 X ([[feedback-seed-date-anti-pattern]]).

### DON'T
- ❌ Vote Count 절대 수치 표시 (어디에도)
- ❌ Vote Rate(%) 표시 (Ranking 화면에서만 허용 — The Pitch 금지)
- ❌ LIVE 배지·LIVE NOW·Pulse 인디케이터 (CLAUDE.md #2)
- ❌ Round 정보(`ROUND OF 48` 등) TournamentCard·Hero·GNB·NewsFeed 어디에도 노출
- ❌ "FIFA"·"Official" 문자 (상표권)
- ❌ CategoryFilter 컴포넌트·chip·필터 인터랙션 (single-stream feed)
- ❌ "AI GENERATED" 배지·`● AI-Report` 카드 바이라인 (v2.4에서 폐기)
- ❌ trend_score 등 내부 정렬값 UI 노출
- ❌ A-0 코드 삭제 (반드시 `/launch`로 **이동**, archive)
- ❌ hex literal 사용 (CSS는 `var(--color-*)` 토큰만 — colors_and_type.css 외 0건 [[feedback-design-tokens-match-logo]])
- ❌ 이메일·API 키·시드 키 채팅에 붙여넣기

---

## §6. Design Reference — wireframe verbatim

### 6.1 컴포넌트 트리

```
<PitchPage>
  <div className="pitch-grain" aria-hidden />
  <GnbIsland defaultActive="The Pitch" />
  <PitchInner>           {/* container-type: inline-size */}
    <HeroSection />
    <TrendingFeed>
      <TournamentCard tournament={t} />  × 6
      <SkeletonGrid />                   {/* data-card-state="loading" */}
      <EmptyState />                     {/* data-card-state="empty" */}
    </TrendingFeed>
    <LabEntryCard data-lab="locked" | "active" />
    <NewsroomFeed data-news="loaded" | "loading" | "partial" | "empty">
      <NewsFeedItem variant="ai-report" | "keyword" />  × 6
    </NewsroomFeed>
    <PitchFoot>WORLDCROWN48 · 48 CONTESTANTS · ONE CROWN</PitchFoot>
  </PitchInner>
</PitchPage>
```

### 6.2 핵심 디자인 토큰 (wireframe 줄 26~48에서 추출 — colors_and_type.css와 일치)

```css
:root {
  --color-bg-void:#00001F; --color-bg-deep:#00003A; --color-bg-default:#0E0944;
  --color-bg-soft:#241754; --color-bg-elevated:#362261;
  --color-gold:#FCD006; --color-gold-hover:#E3BB05;
  --color-gold-subtle:rgba(252,208,6,0.12);
  --color-border:#2D1C5A; --color-border-gold:rgba(252,208,6,0.30);
  --color-text:#F2F2F5; --color-text-sub:#B1B5C4; --color-text-muted:#484B67;
  --shadow-gold:0 0 32px rgba(252,208,6,0.25);
  --radius-border:5px; --radius-chip:999px;
  --font-display:'Playfair Display', Georgia, serif;
  --font-mono:'JetBrains Mono', 'SF Mono', monospace;
}
```

⚠️ pitch.css에서 **hex literal 0건**. 토큰 변수만 사용. ([[feedback-design-tokens-match-logo]])

### 6.3 반응형 컨테이너 쿼리 (wireframe 줄 301~313)

| 브레이크포인트 | 조건 | 주요 변화 |
|---|---|---|
| **모바일 320~759px** | container width | 1열 grid · Hero L1 38px / L2 40px · GNB lbl 표시 |
| **태블릿 760~1099px** | `@container (min-width:760px)` | 2열 grid · Hero L1 52px / L2 54px · padding 80px |
| **데스크탑 1100px+** | `@container (min-width:1100px)` | 3열 grid · Hero L1 60px / L2 62px · max-width 1320px · GNB lbl 표시 |

⚠️ 컨테이너 쿼리 host는 `<PitchInner>` (wireframe `.pitch` div). **viewport 미디어 쿼리 사용 금지** — wireframe 동작과 어긋남.

### 6.4 인터랙션 사양 (wireframe `<script>` 줄 495~707)

- **GNB scroll-compact**: `pitchScroll.scrollTop > 40` → `.gnb--compact` 추가 (transition 160ms)
- **Magnetic translate**: Hero CTA (strength 0.3) + TournamentCard (strength 0.06). `prefers-reduced-motion: reduce` 시 무효
- **TournamentCard hover**: `translateY(-4px) + shadow-gold + border-left gold`. pressed: `translateY(-1px)`
- **LabEntryCard locked → hover**: `.lab-tip` 툴팁 표시 ("Coming Soon · Tournament hosting opens after launch")
- **NewsroomFeed state switch**: `data-news` 속성 변경 시 feed/skel/empty/notice 자동 토글

---

## §7. Test Plan

### 7.1 수동 시나리오 (대표가 Preview에서 직접 통과)

1. `/` 진입 → A-1 5모듈 모두 보임 · CategoryFilter 안 보임 · GNB sticky
2. 스크롤 → GNB compact 전환 · NewsroomFeed `Around the Pitch` 헤더 도달
3. `/launch` 진입 → A-0 LaunchHero·waitlist 정상
4. `/?lang=en` 진입 → 모든 텍스트 영문 전환
5. DevTools mobile-320 → 1열 grid · 태블릿-768 → 2열 · 데스크탑-1440 → 3열
6. TournamentCard hover → 골드 좌측 보더 + shadow + magnetic 약간
7. LabEntryCard hover → "Coming Soon" 툴팁 표시
8. NewsroomFeed → AI 기사 푸터에 `✦ AI-Report`, 카드 바이라인에 `● AI-Report` 없음

### 7.2 E2E 시나리오 (Playwright — 필수)

```ts
// e2e/pitch.spec.ts
test.describe('A-1 The Pitch', () => {
  let consoleErrors: string[] = [];
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', m => m.type() === 'error' && consoleErrors.push(m.text()));
  });
  test.afterEach(() => expect(consoleErrors, 'Console errors').toHaveLength(0));

  test('AC-1: / renders 5 modules', async ({ page }) => {
    await page.goto('/?lang=ko');
    await expect(page.getByText('Who wears the')).toBeVisible();
    await expect(page.getByText('Trending Tournaments')).toBeVisible();
    await expect(page.getByText('Create Tournament')).toBeVisible();
    await expect(page.getByText('Around the Pitch')).toBeVisible();
    await expect(page.locator('[aria-label="Primary navigation"]')).toBeVisible();
  });

  test('AC-2: /launch renders A-0 archive', async ({ page }) => {
    await page.goto('/launch?lang=ko');
    await expect(page.locator('main.lp')).toBeVisible();
  });

  test('AC-4: TournamentCard has no voteCount/voteRate/LIVE', async ({ page }) => {
    await page.goto('/?lang=en');
    await expect(page.getByText(/\d+ votes/i)).toHaveCount(0);
    await expect(page.getByText(/\d+%/)).toHaveCount(0);
    await expect(page.getByText(/^LIVE$/i)).toHaveCount(0);
  });

  test('AC-5+AC-6: No CategoryFilter, no Round labels', async ({ page }) => {
    await page.goto('/?lang=ko');
    await expect(page.getByRole('button', { name: /Football|K-Pop/i })).toHaveCount(0);
    await expect(page.getByText(/ROUND OF (48|24|12|6)/i)).toHaveCount(0);
    await expect(page.getByText(/QUARTERFINAL|SEMIFINAL/i)).toHaveCount(0);
  });
});
```

### 7.3 시각 회귀 (Phase D 마지막)

Preview 배포 후 30 스크린샷:
- `?lang=ko` · `?lang=en` × 320·768·1440 × Hero·Trending·Lab·Newsroom·GNB
- 대표가 직접 한 장씩 확인하고 결함 0건 확인 후 Production 머지

---

## §8. Analytics Events

```
이벤트명               파라미터                       발생 시점
a1_pitch_view         { lang, breakpoint }            PitchPage mount
a1_card_click         { tournamentId, position }      TournamentCard 클릭
a1_lab_locked_hover   { }                             LabEntryCard locked hover (Coming Soon 노출)
a1_news_click         { source, isAiReport, position } NewsFeedItem 클릭 (외부 이동 직전)
a1_see_more_click     { destination: 'arena_newsroom' } "더 보기" 클릭
a1_gnb_cta_vote_now   { from: 'gnb' }                 GNB Vote Now 클릭
```

---

## §9. 알려진 함정 (Cowork이 미리 파악한 위험)

1. **A-0 swap 위험** — 옵션 A 결정. 머지 즉시 / 가 변경되므로 **Preview에서 100% 시각 검증 후** Production 머지. 사전에 `/launch` 새 라우트가 정상 응답해야 함.
2. **Firestore composite index 누락 위험** — `where status orderBy createdAt` 인덱스 사전 등록 의무. Phase C 시작 전 `firestore.indexes.json` 업데이트 + `firebase deploy --only firestore:indexes` 선행. [[feedback-firestore-composite-index]] C-1 5시간 막힘 재발 방지.
3. **lite-spec 구버전 표기 유혹** — A-1 작업 중 lite-spec 참조 충동 시 §1.2 정정표 재확인. wireframe 우선.
4. **AI-Report 카드 바이라인 회귀** — wireframe 줄 676 `nfi-tag = REPORT` 그대로 옮기면 v2.4 위반. 푸터로만 이동.
5. **컨테이너 쿼리 미지원 브라우저** — Next.js 14는 자동 polyfill X. 단, Safari 16+·Chrome 105+ 지원이라 2026년 시점 무시 가능. PostCSS plugin 추가 X.
6. **scroll-compact double bind** — wireframe 줄 632에서 seg-gnb이 compact 상태일 때 scroll 핸들러 무시 처리됨. React 변환 시 useRef+useEffect로 동일 보장.
7. **/admin 404 이월** — G-1 미구현이라 정상. A-1 PR에서 건드리지 않음. ([[project-dev-visual-aid-merged-2026-06-29]])
8. **시드 키 노출 위험** — `FIREBASE_ADMIN_SDK_KEY` 채팅 붙여넣기 금지. `export FIREBASE_ADMIN_SDK_KEY="$(pbpaste)"` 패턴 사용. [[feedback-secret-clipboard-pattern]]
9. **playwright 워크플로우 spec scope** — `.github/workflows/a1-pitch-e2e.yml` 의 `playwright test` 명령에 `e2e/pitch.spec.ts` 경로 명시. 안 하면 다른 모듈 spec까지 돌려 false-red. [[feedback-workflow-spec-scope]]
10. **mobile-320 isolation** — 만약 A-1 E2E가 per-Voter 상태에 의존하게 되면 votes + roundProgress 사전 삭제. [[feedback-test-isolation-per-voter]]

---

## §10. 핸드오프 종료 조건

```
☐ §4 Acceptance Criteria AC-1~AC-15 전 항목 통과
☐ §5 Hard Constraints DON'T 11건 모두 위반 0건 (자동 grep + 시각 확인)
☐ CLAUDE.md 불변 원칙 8가지 위반 0건
☐ LANGUAGE.md 금지 용어(대회·배틀·Candidate·1등 등) 0건
☐ §7.1 수동 시나리오 8건 통과
☐ §7.2 Playwright E2E 4개 시나리오 GitHub Actions PASS
☐ §7.3 시각 회귀 30 스크린샷 대표 검수 통과
☐ Vercel Preview 동작 확인 + E2E HTML 리포트 PR 본문 첨부
☐ Console 에러 0건 자동 검증 통과
☐ Firestore composite index 사전 배포 (firebase deploy --only firestore:indexes)

★ 옵션 A 라우트 swap 전용 추가 의무 ★
☐ Preview 배포 URL에서 / · /launch 둘 다 200 응답 + 시각 검증 통과
☐ Production 머지 후 worldcrown48.com 5분 내 CDN 반영 확인:
    curl -s -o /tmp/a1.html https://worldcrown48.com/
    grep -E "Who wears the|Ultimate Crown" /tmp/a1.html   # 기대: 1건 이상
    curl -s -o /tmp/launch.html https://worldcrown48.com/launch
    grep -E "lp-inner" /tmp/launch.html                   # 기대: 1건
☐ Vercel deploy timestamp 확인 ([[feedback-final-phase-push-check]])
```

---

## §11. Superpowers 워크플로우 지시 — Claude Code 필독

> ⚠️ 본 섹션은 **필수**. Superpowers 플러그인(`/plugin install superpowers@claude-plugins-official`) 활성화 상태로 작업.

### 11.1 적용 단계 (순서 엄수)

```
Phase 1 — Brainstorming (5분)
  /brainstorm 으로 §2 Goal + §9 함정 입력
  → 라우트 swap 위험·composite index·v2.4 footer-only lock 우선순위 정리

Phase 2 — Writing Plan
  /plan 으로 Phase A·B·C·D·E 분해
  → §3 Files 표를 파일별 commit 단위로 그룹화

Phase 3 — TDD RED-GREEN-REFACTOR (모든 신규 로직)
  1. RED   — §11.2 테스트 매핑대로 테스트 먼저
  2. GREEN — 최소 코드
  3. REFACTOR — §5 Hard Constraints 준수 + 토큰화

Phase 4 — Code Review
  /review 로 자체 리뷰
  ☐ Hard Constraints DON'T 11건 0건 (grep)
  ☐ hex literal 0건 (grep -E "#[0-9A-Fa-f]{3,6}" app/components/pitch/*.css → colors_and_type.css 제외 0건)
  ☐ TS strict + console.error 0건

Phase 5 — PR 제출
  /pr 로 PR 생성. 본문에 §10 체크리스트 + E2E artifact 링크 + Preview URL 포함.
```

### 11.2 TDD 대상 매핑

| 테스트 파일 | 테스트 대상 | §4 기준 |
|---|---|---|
| `__tests__/pitch/pitchStore.test.ts` | subscribeToTrending · 정렬 · 빈 상태 · cleanup | AC-1 |
| `__tests__/pitch/newsroom.test.ts` | merge 순서(AI·KW 교차) · AI 분기 (`source.includes('Fan Intelligence')`) | AC-10 |
| `__tests__/pitch/TournamentCard.test.tsx` | voteCount·voteRate·LIVE 0건 + Round 라벨 0건 | AC-4 · AC-6 |
| `__tests__/pitch/LabEntryCard.test.tsx` | locked → active state 전환 · 툴팁 노출 | AC-9 |
| `e2e/pitch.spec.ts` | §7.2 4 시나리오 + console.error 0건 | AC-1·2·4·5·6 |

### 11.3 TDD 면제 조건 (사유 PR에 명시)

- pitch.css 순수 스타일 변경 (로직 없음)
- pitch-grain SVG 인라인 (정적 콘텐츠)

그 외 모든 로직(스토어·라우팅·merge·state 전환)은 TDD 필수.

### 11.4 3계층 테스트 의무

| 계층 | 도구 | 적용 | 통과 기준 |
|---|---|---|---|
| Unit | vitest | pitchStore · newsroom merge · 카드 렌더 | 100% PASS |
| Integration | Firebase Emulator + vitest | tournaments where/orderBy 쿼리 · 인덱스 사용 검증 | 100% PASS |
| E2E | Playwright | §7.2 4 시나리오 (3-BP × ko/en) | 100% PASS + Console 0건 |

### 11.5 CI 통합

`.github/workflows/a1-pitch-e2e.yml` 신규:

```yaml
name: A-1 Pitch E2E (Playwright)
on:
  pull_request:
    branches: [main]
    paths:
      - 'app/page.tsx'
      - 'app/launch/**'
      - 'app/components/pitch/**'
      - 'lib/pitch/**'
      - 'e2e/pitch.spec.ts'
      - 'firestore.indexes.json'
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - uses: actions/setup-java@v4         # firebase emulator 의존 — Java 21+ 필수
        with: { distribution: 'temurin', java-version: '21' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e -- e2e/pitch.spec.ts     # ⚠️ 스코프 명시 ([[feedback-workflow-spec-scope]])
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: a1-playwright-report, path: playwright-report/ }
```

### 11.6 Console 에러 0건 자동 검증

§7.2 코드 예시 그대로 사용. afterEach에 `expect(consoleErrors).toHaveLength(0)` 강제.

---

## §12. Cowork 셀프체크리스트 — Publish 전 확인 (대표가 직접)

```
☐ §11 별도 섹션 존재 (§7 안에 묻기 X)
☐ "권장" 단어 0건 — grep -i "권장\|선택\|옵션\|가능하면" docs/handoffs/A1-the-pitch-handoff.md
☐ 핵심 사용자 흐름 E2E 시나리오 명시 (§7.2 Playwright 코드 예시 포함)
☐ §10 Done-Definition에 E2E 증거 + 옵션 A 라우트 swap 검증 의무 포함
```

---

## §13. Phase 분할 (Claude Code auto mode · 5 commit)

| Phase | 핵심 산출 | 검증 |
|---|---|---|
| **A · Route Swap** | app/page.tsx 교체 + app/launch/* 신설 + metadata 이전 | `/` · `/launch` 둘 다 dev 서버 200 |
| **B · 5 Modules** | 컴포넌트 8개 + pitchStore + newsroom + pitch.css 토큰화 | RTL 유닛 통과 + Storybook(있다면) 시각 확인 |
| **C · Data + i18n** | 시드 6개 + composite index 배포 + ko/en 키 | Emulator integration 통과 + i18n key 누락 0건 |
| **D · Tests + Visual** | E2E 4 + 워크플로우 + 시각 회귀 30장 | GitHub Actions PASS + 대표 시각 검수 통과 |
| **E · Ship** | PR squash 머지 + Production 배포 + CDN 5분 확인 | curl 검증 통과 + deploy timestamp ([[feedback-final-phase-push-check]]) |

---

*핸드오프 버전: v1.0 (template v2.1)*
*© 2026 WorldCrown48 | CONFIDENTIAL*
