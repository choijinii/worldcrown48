# Handoff Brief — G-1 Admin Dashboard (Domain 6)

> **From**: Cowork (기획·시안 분석) · **To**: Claude Code (auto mode 사용)
> **Date**: 2026-06-30 · **Author**: 대표 · **Version**: v1.0 (template v2.1)
> **작업 브랜치**: `feat/g1-admin-dashboard` (main 최신 `4c39e52` 에서 분기)
> **워크트리 제안**: `/Users/jinii/Projects/wc48-g1` (Antigravity 회피 — [[feedback-antigravity-worktree-hijack]])
>
> **목표 산출물** (Phase 4개 — M1 단독 PR):
> - **Phase A** · `/admin` 라우트 + AdminAuthGuard 라이트 테마 변형 + Layout (noindex)
> - **Phase B** · AdminShell(Sidebar + Main) + 5 KPI 카드 + VoteSpeedChart(Recharts) + AlertList
> - **Phase C** · `getAdminKpis` · `listAdminAlerts` Cloud Function callable + 시드 데이터 + i18n(ko·en)
> - **Phase D** · E2E + 시각 검증 + `lib/layout/domains.ts` 활성화 + PR 제출 + Production 머지 + CDN 반영 확인

---

## ⚠️ 이 핸드오프의 진실 공급원 (충돌 시 우선순위)

```
1순위  docs/design/wireframes/Domain 6 · Admin Dashboard.html     ← 시각·인터랙션의 단일 진실 (1,636줄)
2순위  docs/lite-specs/G1-admin-dashboard.md                     ⚠️ 구버전 표기 5건 — 본 §1.2 정정표 사용
3순위  docs/design/WC48_DESIGN_SYSTEM_v2.4.md                    ← 토큰·라이트 팔레트·AI-Report 푸터 락
4순위  docs/mental-model/MENTAL_MODEL.svg                          ← 충돌 시 무조건 우선
5순위  CLAUDE.md 불변 원칙 8가지                                  ← 라이트 테마 · Crown Gold · FIFA 금지 등
```

**lite-spec 정정표 (§0.3 grep 명령으로 강제 확인)**

| # | 구버전 (lite-spec) | 본 핸드오프에서 사용 |
|---|---|---|
| ① | `category: 'FIFA' \| 'KPOP'` 2-카테고리 | **`Category` 6개 enum**: `FOOTBALL · KPOP · ANIME · GAMING · MOVIE · OTHER` — `lib/types/tournament.ts` import ([[project-categories-2026-06-20]]) |
| ② | `middleware`가 `cookies.get('auth-token')` 으로 게이트 | **middleware는 noindex만**. 실제 차단은 client-side `AdminAuthGuard` (B-1 패턴 — Firebase Auth는 IndexedDB라 Edge에서 못 봄) |
| ③ | `import.meta.env.VITE_ADMIN_UID` | **`process.env.NEXT_PUBLIC_ADMIN_UID`** (Next.js, B-1 `isAdmin.ts` 패턴) |
| ④ | 라우트 `/admin/dashboard` | **`/admin`** (와이어프레임 crumb "Admin / Dashboard" + Dev Nav `/admin` 링크와 일치 — 결정 2026-06-30) |
| ⑤ | "Realtime DB onValue 리스너" | **Firestore + Cloud Function callable `getAdminKpis`** (`scheduleRankingCache` 코멘트: "RTDB is never used" — 스택 일관성) |

---

## §0. 자가 검증 — 코드 작성 전 반드시 모두 ✓

하나라도 ✗ 이면 즉시 STOP하고 대표에게 보고. ([[feedback-evidence-before-diagnosis]])

### 0.1 위치 + 브랜치 + main 최신 상태

```bash
git branch --show-current                              # 기대: feat/g1-admin-dashboard
git log main --oneline -3                              # 기대 최신: 4c39e52 (A-1 squash)
git diff main..feat/g1-admin-dashboard --stat | head -5 # 기대: 새 브랜치라 빈 출력 또는 핸드오프 1개
```

### 0.2 핵심 파일 존재

```bash
test -f "docs/design/wireframes/Domain 6 · Admin Dashboard.html" && echo "✓ wireframe"
test -f docs/lite-specs/G1-admin-dashboard.md && echo "✓ lite-spec (구버전 — §1.2 정정표 적용)"
test -f docs/design/WC48_DESIGN_SYSTEM_v2.4.md && echo "✓ v2.4 디자인 토큰"
test -f docs/handoffs/G1-admin-dashboard-handoff.md && echo "✓ 본 핸드오프"
test -f lib/types/tournament.ts && echo "✓ Category enum (C-1·B-1 공통)"
test -f lib/lab/isAdmin.ts && echo "✓ isAdmin pure (B-1 재사용)"
test -f lib/lab/adminGate.ts && echo "✓ adminGateState (B-1 재사용)"
test -f components/admin/lab/AdminAuthGuard.tsx && echo "✓ B-1 dark guard 참조 (G-1은 light 변형 신설)"
test -f middleware.ts && echo "✓ noindex 이미 적용"
test -f lib/layout/domains.ts && echo "✓ SITE_DOMAINS (G-1 머지 시 Domain 6 href 활성화)"
test -f lib/dev/devNav.ts && echo "✓ DEV_DOMAINS (admin /admin 이미 enabled — G-1 완성 시 404 해소)"
test -f functions/src/admin.ts && echo "✓ adminDb (admin SDK)"
test -f functions/src/cors.ts && echo "✓ ALLOWED_ORIGINS"
```

### 0.3 lite-spec 구버전 표기 grep 확인 (정정표 §1.2 강제)

```bash
# 5건 모두 hit 되어야 정상 ("있어야 함"을 확인하고 정정표대로 무시한다)
grep -nE "FIFA.\|.KPOP|cookies\.get\('auth-token'\)|import\.meta\.env|/admin/dashboard|Realtime DB" docs/lite-specs/G1-admin-dashboard.md
# 기대: 5건 hit. 핸드오프 §1.2 정정표대로 무시하고 wireframe·CLAUDE.md만 따른다.
```

### 0.4 Category enum 단일 진실 = lib/types/tournament.ts

```bash
grep -nE "FOOTBALL|KPOP|ANIME|GAMING|MOVIE|OTHER" lib/types/tournament.ts
# 기대: CATEGORIES const에 6개 모두. 본 PR은 import만, 재정의 X.
```

### 0.5 의존성 — Recharts 새로 추가

```bash
node -v        # 기대: v20.x
npm list zustand firebase next react   # 기대: zustand@5 · firebase@12 · next@14.2 · react@18.3
npm list recharts 2>/dev/null || echo "✗ recharts 미설치 — Phase B에서 npm install recharts@^2 필요"
```

### 0.6 운영자 UID 환경변수 (B-1과 동일 변수 재사용)

```bash
# 로컬 .env.local 확인 (커밋 X — 키만 존재 확인)
grep -E "^NEXT_PUBLIC_ADMIN_UID=" .env.local && echo "✓ 로컬 ADMIN_UID 있음"
# Vercel Preview/Production 환경변수는 B-1 PR #23에서 이미 설정됨.
# Phase D에서 Vercel CLI 또는 대시보드로 재확인.
```

### 0.7 라우트 충돌 확인 (Phase A 진입 전)

```bash
# /admin 인덱스가 없어야 함 (현재 404 = 정상). /admin/lab만 있어야 함.
test -f app/admin/page.tsx && echo "✗ 이미 존재 — 충돌. 대표 보고" || echo "✓ 미존재 — Phase A에서 신설"
test -f app/admin/lab/page.tsx && echo "✓ /admin/lab (B-1) 존재"
```

✅ 위 7개 검증이 모두 통과해야만 Phase A로 진행 가능.

---

## §1. Pre-flight Checklist — §0 통과 후

### 1.1 읽기 의무

```
☐ CLAUDE.md 불변 원칙 8가지 (특히 #1 라이트 테마 · #2 Crown Gold · #4 ✦ AI-Report 푸터 락 · #5 FIFA 금지)
☐ LANGUAGE.md 공식 용어 (Tournament · Contestant · Voter · Champion · Crown Card · Vote Rate vs Vote Count)
☐ docs/mental-model/MENTAL_MODEL.svg (Round 표시 위치 가드레일 — Dashboard에 Round HUD 금지)
☐ docs/design/WC48_DESIGN_SYSTEM_v2.4.md §라이트 팔레트
☐ docs/design/wireframes/Domain 6 · Admin Dashboard.html (1,636줄 전부 — 특히 :root 토큰 + .kpi/.alert/.sidebar 스타일)
☐ 본 핸드오프 처음부터 끝까지
☐ 참고: components/admin/lab/AdminAuthGuard.tsx (B-1 인증 패턴 — dark theme), lib/lab/adminGate.ts (pure 로직)
```

### 1.2 lite-spec 구버전 표기 정정 — §0.3 grep 결과 5건 모두 정정표대로 무시

⚠️ lite-spec에 적힌 다음 5건은 **본 핸드오프에서 사용 금지**:
- `FIFA|KPOP` 2-카테고리 · `cookies.get('auth-token')` middleware · `import.meta.env.VITE_ADMIN_UID` · `/admin/dashboard` 경로 · `Realtime DB onValue`

대신 본 핸드오프 §6의 wireframe 매핑·§5 Hard Constraints만 따름.

---

## §2. Goal — 한 줄 결과 정의

> **worldcrown48.com `/admin` 이 Admin Dashboard (M1) 진입점으로 활성화되고, 운영자 로그인 후 5 KPI 카드 + VoteSpeedChart(Recharts 24h) + AlertList(어뷰징 알림) + AdminSidebar 가 라이트 테마(`#F2F2F5`/`#0E0944`/Gold `#FCD006`)로 정상 렌더링된다.** 비로그인은 needs-signin, Voter는 forbidden → `/`. `getAdminKpis`·`listAdminAlerts` Cloud Function callable이 admin SDK로 rules를 우회해 데이터를 묶어서 반환하고, `lib/layout/domains.ts`의 Domain 6 `href: null` → `"/admin"` 활성화로 SiteMapSheet의 "Coming soon" 배지가 해제된다. Dev Nav의 `/admin` 링크도 정상화(404 → Dashboard). M2 Tournaments 테이블은 본 PR에서 제외, 다음 PR로 분리.

---

## §3. Files to CREATE / MODIFY

### Phase A — 라우트 + 인증 게이트 + Layout

| 경로 | 동작 | 비고 |
|---|---|---|
| `app/admin/page.tsx` | **NEW** | Dashboard 진입점. `<AdminAuthGuardLight>` 안에서 `<AdminShell/>` 렌더. Metadata: `robots: { index: false, follow: false }` |
| `app/admin/layout.tsx` | **NEW** | `data-theme="light"` 래퍼 + bg `#F2F2F5` + Pretendard·Inter 폰트 import. 기존 `app/layout.tsx` 글로벌 폰트는 그대로 두되, 여기서 라이트 변수 오버라이드 |
| `components/admin/dashboard/AdminAuthGuardLight.tsx` | **NEW** | B-1 `AdminAuthGuard`의 light theme 변형. `adminGateState` (B-1 pure import) 재사용. 4상태(loading·needs-signin·forbidden·allowed) 동일. 시각 토큰만 light. wireframe `.gate-shell`/`.gate-card` 디자인 |
| `app/admin/admin-light.css` 또는 module | **NEW** | wireframe 토큰을 :root 변수로 옮긴 라이트 팔레트. (or styled-jsx — A-1과 동일 패턴 추천) |

### Phase B — Dashboard UI 컴포넌트

| 경로 | 동작 | 비고 |
|---|---|---|
| `components/admin/dashboard/AdminShell.tsx` | **NEW** | `app-shell` 그리드 (sidebar 240px / 1fr main). 768px 이하 sidebar 가로 collapse, 480px 이하 mobile-notice |
| `components/admin/dashboard/AdminSidebar.tsx` | **NEW** | MVP1 nav 3개 (Dashboard 현재·Tournaments disabled M2·The Lab `/admin/lab`) + MVP2 disabled 2개 (Live operations·AI-Report queue). 운영자 아바타 footer. wireframe `.sidebar`/`.sb-*` 패턴 |
| `components/admin/dashboard/DashboardMain.tsx` | **NEW** | `<header.main-top>` (crumb + 라이브 ●dot 인디케이터) + `<KPICards/>` + `<TwoColPanels/>` (chart + alerts) |
| `components/admin/dashboard/KPICards.tsx` | **NEW** | 5개 카드 grid `grid-cols-5`. 데이터: `useKpis()` hook (60초 polling). 상태: loaded·loading(shimmer)·stale(STALE 배지). 5지표 라벨 표시는 §6.5 표 참조 |
| `components/admin/dashboard/VoteSpeedChart.tsx` | **NEW** | Recharts `<LineChart>` (24h, stroke=Gold). 동적 import(`next/dynamic` with `ssr: false`) — SSR 시 window 없음 ([[§9 함정 #6]]). hover tooltip + 3 stat (24h Total · Peak hr · Now). 1H/24H/7D 토글은 본 PR 24H만 작동 (나머지 disabled+tooltip) |
| `components/admin/dashboard/AlertList.tsx` | **NEW** | severity별 색상 (high=crimson·medium=amber·low=turquoise·dismissed=opacity 0.45). Dismiss/Investigate 버튼. empty state ("All clear"). 데이터: `useAlerts()` hook |
| `components/admin/dashboard/MobileNotice.tsx` | **NEW** | 480px 이하: "Use a wider screen — Admin Dashboard is desktop-first (1440px primary)" |
| `components/admin/dashboard/dashboard.module.css` | **NEW** | wireframe CSS verbatim 이식 (kpi-grid·panel·alert 등). 토큰은 v2.4와 매칭 |

### Phase C — Cloud Function callable + 데이터 hook + 시드

| 경로 | 동작 | 비고 |
|---|---|---|
| `functions/src/core/buildAdminKpis.ts` | **NEW** | 순수 함수: `(votes[], tournaments[], adminAlerts[], now) => KpiSnapshot`. node-env 테스트 100%. 입력은 plain object 배열만 (Timestamp 분리) |
| `functions/src/__tests__/buildAdminKpis.test.ts` | **NEW** | 빈 데이터 → 0 모두, 1 tournament → round_status 정확, abuse_warnings count, vote_speed 60s 윈도우 등 |
| `functions/src/getAdminKpis.ts` | **NEW** | `onCall` 래퍼. `req.auth.uid !== ADMIN_UID` ⇒ HttpsError('permission-denied'). admin SDK로 votes·tournaments·admin_alerts read. `buildAdminKpis` 호출. region: `asia-northeast3`. 60s memory cache |
| `functions/src/listAdminAlerts.ts` | **NEW** | `onCall` 래퍼. admin claim 대신 ADMIN_UID 비교. admin_alerts collection의 최근 50건 + severity sort. type: `AdminAlert[]` |
| `functions/src/index.ts` | **EDIT** | `export { getAdminKpis } from './getAdminKpis'` + `export { listAdminAlerts } from './listAdminAlerts'` 추가 |
| `lib/admin/dashboard/types.ts` | **NEW** | `KpiSnapshot`, `AdminAlert`, `AlertSeverity` type 정의 (functions와 공유) |
| `lib/admin/dashboard/useKpis.ts` | **NEW** | `getAdminKpis` callable wrap. 60초 polling (`setInterval`), `staleAfter: 90s` (90초 후 카드에 STALE 배지). 수동 새로고침 함수 export |
| `lib/admin/dashboard/useAlerts.ts` | **NEW** | `listAdminAlerts` callable wrap. 동일 60초 polling. dismiss 액션은 `dismissAdminAlert` 신규 callable로 (별도 작업 — 본 PR에서는 dismiss 버튼은 UI만 작동, 실제 write는 stub) |
| `lib/admin/dashboard/__tests__/*` | **NEW** | hook 단위 테스트 (mock callable) |
| `scripts/seed-preview.mjs` | **EDIT** | `--module=admin` 추가: dev-preview Tournament + 30~50개 votes 시드 + admin_alerts 3건(high·medium·low) 시드. Preview에서 0/0/0/0/0 빈 화면 방지 |

### Phase D — 도메인 활성화 + E2E + i18n

| 경로 | 동작 | 비고 |
|---|---|---|
| `lib/layout/domains.ts` | **EDIT** | Domain 6 `href: null` → `"/admin"` (1줄). 자동으로 SiteMapSheet의 "Coming soon" 배지 해제 + 정상 링크화 |
| `lib/dev/devNav.ts` | **확인** | Admin Dashboard `/admin` 이미 enabled — 변경 불필요. (404 해소되는지 Phase D 시각 검증) |
| `firestore.rules` | **변경 없음** | `admin_alerts`는 callable로만 접근하므로 기존 `admin claim` rule 그대로 둠 (callable은 admin SDK라 rules 우회). client 직접 read 시도 없음 |
| `messages/ko.json`, `messages/en.json` | **EDIT** | dashboard.* 키 추가 (5 KPI 라벨·alert severity·sidebar 메뉴·gate 메시지) |
| `e2e/g1-admin-dashboard.spec.ts` | **NEW** | 7+ 시나리오 (§7 참조). Console 에러 0건 fixture 포함. `?lang=` 쿼리로 i18n 결정론화 |
| `.github/workflows/g1-e2e.yml` | **NEW** | paths 필터: `app/admin/**`·`components/admin/dashboard/**`·`functions/src/{getAdminKpis,listAdminAlerts}.ts`·`lib/admin/dashboard/**` |
| `playwright.config.ts` | **EDIT** | g1 spec 추가 시 spec scope 분리 ([[feedback-workflow-spec-scope]]) |

---

## §4. Acceptance Criteria — 완료 조건 (Required)

### 4.1 라우팅 & 인증 게이트

```
☐ /admin (운영자 = NEXT_PUBLIC_ADMIN_UID 일치) → Dashboard 렌더
☐ /admin (비로그인) → needs-signin 카드 + Google 로그인 버튼 (light theme)
☐ /admin (Voter, UID 불일치) → forbidden → router.replace("/") + "권한이 없습니다" 토스트
☐ /admin (anonymous) → needs-signin (B-1과 동일 — anonymous는 비로그인 취급)
☐ X-Robots-Tag: noindex 헤더 (middleware) — 기존 그대로
☐ 페이지 metadata: robots index:false, follow:false
☐ getAdminKpis/listAdminAlerts callable: 비운영자 호출 → permission-denied (server-side 재확인)
```

### 4.2 5 KPI 카드

```
☐ Total Votes 카드 (운영자 전용 노출 명시 desc) + delta vs 어제
☐ Active Voters 카드 ("최근 1시간 내 투표 참여 유니크 Voter") + delta vs 1h
☐ Vote Speed 카드 (votes/min · 60s rolling) + delta
☐ Abuse Warnings 카드 + delta + 즉시 검토 강조
☐ Round Status 카드 (active Tournament 수 · 라운드별 분포 · 다음 Deadline)
☐ 데이터: useKpis() 60초 polling + 수동 새로고침 ↻ 버튼 작동
☐ loading 상태: shimmer 스켈레톤 (애니메이션, prefers-reduced-motion 대응)
☐ stale 상태: 90초 이상 응답 없으면 STALE 배지 + 숫자 muted
```

### 4.3 VoteSpeedChart (Recharts)

```
☐ Recharts LineChart 렌더 (24h, 데이터 25 포인트 — 시간당)
☐ stroke="#FCD006" (Gold) + areaGradient (opacity 0.32→0)
☐ next/dynamic ssr:false (SSR window error 방지)
☐ hover tooltip (시간 + votes/hr)
☐ 3 stat (24h Total / Peak hr / Now) + delta
☐ 1H/24H/7D 토글: 24H만 active, 나머지 disabled+tooltip "Phase 2 예정"
☐ empty 상태 ("No vote data yet" + CHART WILL APPEAR WHEN FIRST VOTE LANDS)
☐ loading 상태 (스피너 + "Subscribing to Realtime DB…" 텍스트 → "데이터 동기화 중…"으로 교체 ★lite-spec 정정⑤)
```

### 4.4 AlertList

```
☐ severity별 색상 (high=crimson tint · medium=amber · low=turquoise · dismissed=opacity 0.45)
☐ 각 알림: 아이콘 + key (HIGH/MEDIUM/LOW · 타입 · 경과 시간) + title + desc + actions
☐ Investigate/Dismiss 버튼 (dismiss는 UI만 작동, 실제 write는 stub — TODO 주석)
☐ empty 상태 ("All clear" + ✓ 체크 아이콘)
☐ "Mark all read" 버튼 (UI stub)
☐ 데이터: useAlerts() 60초 polling
```

### 4.5 AdminSidebar

```
☐ MVP1 nav: Dashboard(현재 aria-current) · Tournaments(M2 disabled) · The Lab(/admin/lab 링크)
☐ MVP2 nav: Live operations · AI-Report queue (둘 다 disabled + Tooltip "MVP 2 예정")
☐ 운영자 아바타 footer (이니셜 + 이름 + ROLE "SYSTEM ADMIN")
☐ 토글 (768px 이하 가로 collapse) — wireframe 동작 매핑
```

### 4.6 반응형

```
☐ Desktop ≥1440px: full layout (kpi grid-cols-5, two-col 2fr 1fr)
☐ Tablet ≤900px: kpi grid-cols-2, two-col 1fr (chart 위, alerts 아래)
☐ Mobile ≤480px: MobileNotice 표시 ("Use a wider screen…")
☐ prefers-reduced-motion 모든 애니메이션 0초
```

### 4.7 사이트 통합

```
☐ lib/layout/domains.ts Domain 6 href: "/admin" 활성화
☐ SiteMapSheet (☰ 햄버거) → Domain 6 "Admin Dashboard" 정상 링크 (Coming soon 배지 해제)
☐ Dev Nav (Cmd+Shift+D) → Admin Dashboard 링크 정상 작동 (404 해소)
☐ Production worldcrown48.com/admin 로그인 후 Dashboard 정상
```

### 4.8 i18n + 용어

```
☐ ko/en 두 언어 모든 텍스트 (KPI 라벨·sidebar·gate·alert·empty/loading 상태)
☐ ?lang= 쿼리로 강제 가능 ([[feedback-i18n-test-determinism]])
☐ LANGUAGE.md 금지 용어 0건: grep -nE "Candidate|Battle|대회|이벤트|배틀|참여자|우승자|결과 카드|Round Deadline|Vote Count" 0건
   ★ 예외: "Vote Count" 는 KPI 카드 desc 안에서 "admin-internal only"라는 맥락으로 1회만 허용 (운영자 전용 dashboard라서)
☐ FIFA 표기 grep 0건 (단, 와이어프레임의 임시 "FIFA" 카테고리는 모두 "FOOTBALL"로 교체)
☐ "AI GENERATED" 0건, "● AI-Report" 0건 (이미 폐기 — v2.4 Footer-Only Lock)
```

---

## §5. Hard Constraints — DO / DON'T

### DO

- **인증**: `lib/lab/isAdmin.ts` + `lib/lab/adminGate.ts` 순수 함수 100% 재사용 (B-1과 동일 fail-closed 패턴). `NEXT_PUBLIC_ADMIN_UID` 미설정 → 모든 사람 forbidden (절대 fail-open 금지).
- **테마**: light. bg `#F2F2F5`, surface `#FFFFFF`, text `#0E0944`, text-sub `#3A4570`, text-muted `#8C99B3`, border `#D4DCE3`/`#E6EAF0`, royal `#241754`, gold `#FCD006`.
- **Crown Gold**: 포인트 컬러는 오직 `#FCD006`. 형광 노랑/그린 금지 (CLAUDE.md #2).
- **Recharts**: dynamic import `next/dynamic` with `ssr: false`. line stroke = `#FCD006`, area gradient = gold 0.32→0.
- **Category**: `import { CATEGORIES, type Category } from '@/lib/types/tournament'` — 재정의 절대 금지.
- **LANGUAGE.md 용어**: Tournament/Contestant/Voter/Match/Champion/Crown Card. Round Deadline 개념 X (Tournament Deadline만).
- **Callable 보안**: getAdminKpis · listAdminAlerts 모두 server-side에서 `req.auth.uid !== ADMIN_UID` ⇒ HttpsError. client guard만 믿지 말기 (defense-in-depth). region: `asia-northeast3`.
- **AlertList severity**: high/medium/low/dismissed 4단계. 색상은 v2.4 라이트 팔레트 매핑.
- **시드 우회**: Preview 검증을 위해 seed-preview.mjs에 admin 시드 추가. Production에는 절대 실행 안 됨 ([[project-c3-followup-decision-2026-06-26]] 패턴).

### DON'T

- ❌ **B-1 `AdminAuthGuard` 그대로 재사용 X**. B-1은 dark theme (`background: #0E0944`). G-1은 light. 그대로 import하면 깜빡임. → `adminGateState` (pure)만 import하고 light 컴포넌트 신설.
- ❌ **Realtime DB 사용 X** (RTDB 미사용 확정 — scheduleRankingCache 코멘트).
- ❌ **client에서 admin_alerts 직접 read X** (firestore.rules가 `admin` custom claim 요구. 우리는 ADMIN_UID 패턴이라 claim 없음 → 반드시 listAdminAlerts callable로).
- ❌ **`FIFA` · `KPOP` 2-카테고리 enum 새로 만들기 X** (6개 enum import).
- ❌ **LIVE 배지 · Round HUD를 Dashboard 안에 표시 X** (MENTAL_MODEL — Round 표시는 Arena RoundTransition 전용).
- ❌ **AI GENERATED · ● AI-Report 사용 X** (v2.4 Footer-Only Lock — ✦ AI-Report는 뉴스 article 푸터에만, Dashboard에는 등장 X).
- ❌ **localStorage에 KPI 캐싱 X** (서버 cache가 진실. dev nav on/off만 localStorage).
- ❌ **mobile layout 욕심 X** (desktop primary. 480px 이하는 안내만).
- ❌ **Tournaments 테이블 만들기 X** (본 PR M1 단독 — M2 다음 PR로 분리).
- ❌ **dismiss 기능 backend write X** (UI stub만. 실제 write callable 신설은 다음 PR).
- ❌ **한국적 요소 X** (CLAUDE.md #3 글로벌 MZ Sporty 럭셔리).

---

## §6. Design Reference

### 6.1 핵심 컴포넌트 트리 (시안 §940~1217 매핑)

```
<AdminAuthGuardLight>                  # Phase A · lib/lab/adminGate.ts 재사용
  <AdminShell>                         # Phase B · grid: 240px / 1fr
    <AdminSidebar />                   # Workspace MVP1 + Operations MVP2 disabled
    <DashboardMain>
      <header.main-top>                # crumb + h1 + live ●dot
      <KPICards />                     # 5개 grid-cols-5
      <TwoColPanels>                   # grid-cols 2fr / 1fr
        <VoteSpeedChart />             # Recharts dynamic import
        <AlertList />                  # severity별 4종
      </TwoColPanels>
    </DashboardMain>
  </AdminShell>
  <MobileNotice />                     # ≤480px
</AdminAuthGuardLight>
```

### 6.2 핵심 디자인 토큰 (v2.4 라이트 + wireframe :root 일치)

```css
:root[data-admin] {
  /* Surfaces */
  --color-bg-light:        #F2F2F5;
  --color-surface-light:   #FFFFFF;
  --color-surface-soft:    #F8F8FB;

  /* Text */
  --color-text-light:      #0E0944;
  --color-text-sub-light:  #3A4570;
  --color-text-muted-light:#8C99B3;

  /* Borders */
  --color-border-light:    #D4DCE3;
  --color-border-soft:     #E6EAF0;

  /* Brand */
  --color-royal:           #241754;
  --color-deep-twil:       #0E0944;
  --color-gold:            #FCD006;
  --color-gold-hover:      #E3BB05;
  --color-gold-subtle:     rgba(252,208,6,0.12);
  --color-gold-glow:       rgba(252,208,6,0.25);

  /* Severity */
  --color-crimson:         #D7063A;
  --color-crimson-subtle:  rgba(215,6,58,0.10);
  --color-turquoise:       #00A3B7;
  --color-turquoise-subtle:rgba(0,163,183,0.10);
  --color-amber-subtle:    rgba(251,176,59,0.14);

  /* Shadow */
  --shadow-card:           0 1px 2px rgba(36,23,84,0.06);
  --shadow-card-hover:     0 4px 16px rgba(36,23,84,0.10), 0 1px 2px rgba(36,23,84,0.08);

  /* Radius */
  --radius-rect: 0;
  --radius-border: 5px;
  --radius-chip: 999px;

  /* Spacing scale */
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px;
  --space-5:20px; --space-6:24px; --space-8:32px; --space-10:40px; --space-12:48px;

  /* Fonts (이미 글로벌에서 import — 여기선 변수만) */
  --font-sans:    'Inter','Pretendard',-apple-system,sans-serif;
  --font-display: 'Playfair Display','Pretendard',Georgia,serif;
  --font-mono:    'JetBrains Mono','SF Mono',ui-monospace,monospace;
}
```

### 6.3 반응형 브레이크포인트

| 구간 | 조건 | 주요 변화 |
|---|---|---|
| Desktop | ≥1440px (primary) | kpi grid-cols-5 · two-col 2fr/1fr · sidebar 240px expanded |
| Laptop | 901~1439px | kpi grid-cols-5 유지 · 차트·alert 폭만 축소 |
| Tablet | 481~900px | kpi grid-cols-2 · two-col 1fr (세로 적층) · sidebar 가로 collapse 또는 hidden |
| Mobile | ≤480px | MobileNotice ("Use a wider screen") |

### 6.4 KPI 카드 시각 명세

```
.kpi {
  background: #FFFFFF;
  border: 1px solid #D4DCE3;
  border-radius: 5px;
  padding: 20px;
  display: flex; flex-direction: column; gap: 8px;
}
.kpi-label {                  /* JetBrains Mono 10px 0.14em uppercase */
  font-family: var(--font-mono); font-size: 10px;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: #8C99B3;
}
.kpi-value {                  /* JetBrains Mono 32px bold royal */
  font-family: var(--font-mono); font-weight: 700;
  font-size: 32px; letter-spacing: -0.01em;
  color: #241754;
}
.kpi-delta.up   { color: #00A3B7; background: rgba(0,163,183,0.10); }
.kpi-delta.down { color: #D7063A; background: rgba(215,6,58,0.10); }
.kpi-delta.flat { color: #8C99B3; background: #F2F2F5; }
```

### 6.5 5 KPI 라벨 정확 매핑 (ko / en)

| id | ko | en | 단위 | desc (ko) | source |
|---|---|---|---|---|---|
| `total_votes` | 총 투표 수 | Total Votes | 정수 | Vote Count는 운영자 전용. Voter 화면에 절대 노출 금지. | Firestore `votes` count |
| `active_voters` | 활성 Voter 수 | Active Voters | 정수 | 최근 1시간 내 투표 참여 유니크 Voter | `votes` distinct(userId) where ts > now-1h |
| `vote_speed` | 투표 속도 | Vote Speed | votes/min | 60초 rolling window | `votes` count where ts > now-60s |
| `abuse_warnings` | 어뷰징 경고 | Abuse Warnings | 정수 | Rate-limit 발동 + 의심 계정 (최근 1시간) | `admin_alerts` count where severity≠dismissed |
| `round_status` | 라운드 현황 | Round Status | "{N} active" | "1 in ROUND OF 24 · 1 in ROUND OF 12 · 1 in THE FINAL" + 다음 Deadline | `tournaments` where status=active |

### 6.6 AlertList severity 매핑

| sev | 색상 (배경/텍스트) | 사용 예 |
|---|---|---|
| `high` | crimson tint / crimson | 봇 패턴 감지 · IP cluster 의심 |
| `medium` | amber tint / gold-hover | T-1·T-2 ranking margin anomaly |
| `low` | turquoise tint / turquoise | rate-limit cooldown 정상 발동 |
| `dismissed` | opacity 0.45 (그대로) | 처리 완료 (24h 후 자동 숨김) |

---

## §7. Test Plan — 수동 시나리오 + E2E

### 7.1 수동 시나리오 (Phase D · Preview 시각 검증)

```
시나리오 #1 — 비로그인 진입
- worldcrown48.com/admin 접속 (시크릿 모드)
- 기대: needs-signin 카드 (라이트 테마, Google 버튼)

시나리오 #2 — Voter 로그인 후 /admin
- /로 가서 Google 로그인 (운영자 아닌 일반 계정)
- /admin 접속
- 기대: forbidden 토스트 → /로 리다이렉트

시나리오 #3 — 운영자 로그인 후 /admin
- 운영자 계정으로 로그인 (NEXT_PUBLIC_ADMIN_UID 본인)
- /admin 접속
- 기대: Dashboard 정상 렌더 + 5 KPI + 차트 + alerts + sidebar

시나리오 #4 — 60초 polling
- Dashboard에서 60초 대기
- 기대: 카드 값 갱신 (시드 데이터 변화)

시나리오 #5 — 수동 새로고침
- ↻ 버튼 클릭
- 기대: 즉시 재요청 + 카드에 짧은 shimmer

시나리오 #6 — Alert dismiss
- alert "Dismiss" 클릭
- 기대: UI에서 opacity 0.45로 변경 (backend write는 stub — TODO 주석)

시나리오 #7 — SiteMapSheet 통합
- /로 가서 ☰ 클릭
- Domain 6 항목 확인
- 기대: "Coming soon" 배지 해제 + 정상 링크 (/admin)

시나리오 #8 — Dev Nav 통합
- Cmd+Shift+D로 Dev Nav 열기
- "Admin Dashboard" 클릭
- 기대: /admin으로 이동 (404 해소)

시나리오 #9 — 반응형
- DevTools로 1440 / 768 / 375 폭 토글
- 기대: 각 BP별 §6.3 표대로 변형

시나리오 #10 — ko/en 토글
- Language Toggle 클릭
- 기대: 모든 KPI 라벨·sidebar·gate가 즉시 전환
```

### 7.2 E2E 자동 — §11.4 의무 (Required)

§11에서 정의.

---

## §8. Analytics Events

```
이벤트명                       파라미터                                 발생 시점
admin_view                    { uid, surface: "dashboard" }            /admin 진입 시
admin_kpi_refresh             { uid, source: "auto" | "manual" }       60초 polling or ↻ 클릭
admin_alert_action            { uid, alertId, action: "dismiss"|"investigate" }  버튼 클릭
admin_sidebar_nav             { uid, target: "lab" }                   The Lab 링크 클릭
admin_gate_state              { state: "needs-signin"|"forbidden"|"allowed" } 진입 시 1회
```

→ B-1·C-1 패턴 따라 `lib/analytics.ts`에 헬퍼 추가. 본 PR에서는 콘솔 로그 + analytics gtag 둘 다 emit.

---

## §9. 알려진 함정 (Cowork이 미리 파악한 위험 — 우선순위순)

### 함정 #1 — AdminAuthGuard 다크/라이트 테마 분리 (Severity: 🔴 HIGH)

**문제**: B-1 `components/admin/lab/AdminAuthGuard.tsx`는 dark (`background: #0E0944`). G-1은 light. 그대로 import하면 깜빡임 + 디자이너 결함.

**해결**: `adminGateState` 함수(pure)만 import. light 컴포넌트는 새로 작성 (`components/admin/dashboard/AdminAuthGuardLight.tsx`). 4상태(loading·needs-signin·forbidden·allowed) 동일 로직, 시각 토큰만 light.

**왜 generalize(theme prop)를 안 하나**: B-1과 G-1 시각이 충분히 달라서(다크 vs 라이트, 폰트 사이즈, 버튼 스타일) 분기 if 문이 더 더러워짐. 별도 파일이 더 명확.

### 함정 #2 — `lib/layout/domains.ts` 수정 누락 (Severity: 🔴 HIGH)

**문제**: Dashboard 만들고 SiteMapSheet 그대로 두면 ☰에서 여전히 "Coming soon" 배지 노출. PR 통과 후 발견하면 hotfix 필요.

**해결**: §3 Phase D 표대로 Domain 6 `href: null` → `"/admin"` 1줄 수정. AC §4.7 체크리스트에 포함.

### 함정 #3 — `admin_alerts` rule custom claim 요구 (Severity: 🔴 HIGH)

**문제**: `firestore.rules`의 `admin_alerts`는 `request.auth.token.admin == true` (custom claim) 요구. 우리는 ADMIN_UID 비교 패턴이라 claim 없음 → client에서 직접 onSnapshot 시도하면 permission-denied.

**해결**: `listAdminAlerts` callable로만 접근. callable은 admin SDK라 rules 우회. client 직접 read 절대 금지.

### 함정 #4 — `NEXT_PUBLIC_ADMIN_UID` 환경변수 미설정 fail-closed (Severity: 🟡 MED)

**문제**: Vercel Preview/Production 환경변수 누락 시 운영자 본인도 forbidden. B-1 PR #23에서 이미 설정했으나 Preview는 PR별로 별도 env scope 가능 — 재확인 필요.

**해결**: Phase D Vercel CLI(`vercel env ls`) 또는 대시보드 확인. 미설정 시 즉시 추가 후 redeploy.

### 함정 #5 — Cloud Function adminUid server-side 재확인 누락 (Severity: 🔴 HIGH)

**문제**: client AdminAuthGuard만 믿고 callable에서 verify 안 하면 — Voter가 직접 callable 호출로 KPI/alerts 탈취 가능 (devtool로 functions URL 보임).

**해결**: 모든 admin callable 첫 줄:
```ts
if (req.auth?.uid !== process.env.ADMIN_UID) {
  throw new HttpsError("permission-denied", "운영자 권한이 필요합니다.");
}
```
정의는 functions/.env 또는 firebase secrets ([[feedback-secret-firebase-not-env.md]]).

### 함정 #6 — Recharts SSR window error (Severity: 🟡 MED)

**문제**: Next.js App Router SSR에서 Recharts는 internal에서 `window` 참조 → `window is not defined` 빌드 실패.

**해결**: `next/dynamic` with `ssr: false`:
```tsx
const VoteSpeedChart = dynamic(() => import('./VoteSpeedChart'), { ssr: false });
```
loading prop으로 스피너 보여주기.

### 함정 #7 — i18n hardcoded text (Severity: 🟡 MED)

**문제**: 와이어프레임에 영어 텍스트가 많이 박혀 있어서 그대로 옮기면 ko에서 영어 노출.

**해결**: 모든 사용자 노출 텍스트는 `messages/ko.json`+`messages/en.json` 키로 분리. KPI 라벨은 §6.5 표 한/영 둘 다 사용 가능 (mono 폰트로 시각상 OK).

### 함정 #8 — 시드 데이터 부재 시 KPI 0/0/0/0/0 (Severity: 🟡 MED)

**문제**: Preview 첫 로드 시 모든 카드 0. 디자이너 시각 검증 시 "stale인가? 망가졌나?" 의심.

**해결**: `seed-preview.mjs --module=admin` 추가. dev-preview Tournament + votes 30~50개 + admin_alerts 3건(high·medium·low). 시드는 Preview ONLY (Production은 절대 실행 안 됨 — A-1/C-3 패턴).

### 함정 #9 — Vercel Preview Protection 401 (Severity: 🔴 HIGH)

**문제**: 인증 게이트 있는 G-1은 Playwright가 Vercel Preview에서 401 ([[feedback-vercel-preview-protection-401]]).

**해결**: GitHub Actions에 `VERCEL_AUTOMATION_BYPASS_SECRET` 이미 등록되어 있음 (A-1·B-1·C-1·D-1·E-1에서 사용 중). E2E spec에서 헤더 추가:
```ts
extraHTTPHeaders: { 'x-vercel-protection-bypass': process.env.VERCEL_BYPASS! }
```

### 함정 #10 — Firebase Authorized domains 누락 (Severity: 🔴 HIGH)

**문제**: Google sign-in 사용 → Production/Preview URL 둘 다 Firebase Console → Authentication → Settings → Authorized domains 등록 안 되면 sign-in 시 popup 닫힘 ([[feedback-firebase-auth-domains-checklist]]).

**해결**: PR 머지 전 §10 체크리스트:
- localhost
- worldcrown48.firebaseapp.com
- worldcrown48.com
- www.worldcrown48.com
- 이번 PR의 Preview URL (e.g. `wc48-git-feat-g1-admin-dashboard-...vercel.app`)

### 함정 #11 — Recharts 번들 사이즈 (Severity: 🟢 LOW)

**문제**: Recharts는 ~95KB gzip. dashboard에서만 dynamic import해서 main bundle에는 영향 없음 — 검증 필요.

**해결**: Phase D `npm run build` 후 `.next/analyze` 또는 chunk 확인. 95KB 이하면 OK, 그 이상이면 lazyload retry.

### 함정 #12 — Tournaments 테이블 누락에 따른 sidebar 링크 fallback (Severity: 🟢 LOW)

**문제**: Sidebar에 "Tournaments" 항목 있는데 본 PR에서 M2 구현 안 함. 클릭하면 어디로?

**해결**: `aria-disabled="true"` + Tooltip "M2 예정 (다음 PR)" + `cursor-not-allowed`. wireframe MVP2 disabled 패턴 그대로.

### 함정 #13 — Edge middleware는 Firebase Auth 못 봄 (재확인) (Severity: 🟢 LOW)

**문제**: lite-spec은 middleware에서 인증 게이트 시도 (`cookies.get('auth-token')`). Firebase Auth는 IndexedDB → Edge에서 못 봄.

**해결**: middleware는 noindex만 (이미 작동 중). 진짜 게이트는 client-side AdminAuthGuard ([[B-1 trap #13]] 참조).

### 함정 #14 — `_archive` 안의 옛 lite-spec 그늘 (Severity: 🟢 LOW)

**문제**: `_archive/`에 `WorldCrown48_ProjectSkill_v1_6.md` 등 옛 admin 언급 문서 다수. grep에 걸려서 혼란 가능.

**해결**: 모든 grep에 `--exclude-dir=_archive` 추가. 단일 진실은 `docs/lite-specs/G1-admin-dashboard.md` + 본 핸드오프 정정표.

---

## §10. 핸드오프 종료 조건

Claude Code가 PR을 제출하면 대표가 다음을 확인:

```
☐ Acceptance Criteria §4.1~§4.8 전 항목 통과
☐ Hard Constraints §5 위반 0건
☐ CLAUDE.md 불변 원칙 위반 0건 (특히 #1 라이트 테마 · #2 Crown Gold · #5 FIFA 금지)
☐ LANGUAGE.md 금지 용어 grep 0건 (Vote Count는 운영자 desc 1회 예외)
☐ Test Plan §7.1 수동 시나리오 10개 통과
☐ 반응형 3-BP (1440 · 768 · 375) 통과
☐ Vercel Preview 배포에서 시각 검증 (디자이너 눈)
☐ Production 머지 후 worldcrown48.com/admin 로그인→Dashboard 정상 ([[feedback-final-phase-push-check]])
☐ Console 에러 0건 자동 검증 통과 (§11.6)
☐ Cloud Function logs: getAdminKpis · listAdminAlerts 호출 시 비운영자 permission-denied 확인
☐ SiteMapSheet ☰ → Domain 6 정상 링크 (Coming soon 배지 해제) — 시드 검증 + 시각 캡처
☐ Dev Nav Cmd+Shift+D → Admin Dashboard 클릭 → /admin 정상 (404 해소) — 시드 검증

★ v2.1 필수 항목 (Firebase Auth 사용 PR — G-1 해당) ★
☐ Firebase Console → Authentication → Settings → Authorized domains 에 다음 모두 등록:
   - localhost · worldcrown48.firebaseapp.com · worldcrown48.com · www.worldcrown48.com · 이번 PR의 Preview URL
☐ §11 Playwright E2E 7개 시나리오 GitHub Actions PASS
☐ E2E HTML 리포트 또는 영상(.webm) PR 본문 첨부
☐ Console 에러 0건 자동 검증 통과
☐ VERIFICATION_DISCIPLINE.md §3 firebase-auth-domains 체크리스트 ✅
☐ Vercel Preview Protection bypass 토큰으로 E2E 통과 검증
☐ Production functions:deploy + Vercel deploy timestamp 확인 ([[feedback-final-phase-push-check]])
☐ commit ≠ push ≠ deploy ≠ CDN 반영 — 4단계 timestamp 모두 확인
```

---

## §11. Superpowers 워크플로우 지시 — Claude Code 필독

> ⚠️ 이 섹션은 **모든 Handoff Brief에 필수 포함**됩니다.
> Claude Code는 Superpowers 플러그인(`/plugin install superpowers@claude-plugins-official`)을
> 반드시 활성화한 상태에서 작업해야 합니다.

### 11.1 적용 단계 (순서 엄수)

```
Phase 1 — Brainstorming (5분)
  /brainstorm 명령으로 §2 Goal + §9 함정 14개를 입력
  → 구현 접근 방식, 잠재 위험, 의존성 순서를 정리
  → 핵심 질문: AdminAuthGuardLight 신설 vs theme prop generalize? 시드 데이터 어떻게?

Phase 2 — Writing Plan
  /plan 명령으로 구현 계획 작성
  → §3 Phase A~D 표 기반으로 파일별 작업 순서 확정
  → §4 Acceptance Criteria를 테스트 케이스로 매핑 (§11.2 표 보강)

Phase 3 — TDD RED-GREEN-REFACTOR (핵심)
  모든 신규 로직에 대해 다음 사이클을 반복:
  1. RED   — 테스트 먼저 작성 (§4 Acceptance Criteria + §11.2 표 기반)
  2. GREEN — 테스트를 통과하는 최소 코드 작성
  3. REFACTOR — §5 Hard Constraints 준수 확인 + 코드 정리
  
  ⚠️ 테스트 없이 구현 코드를 먼저 작성하지 마세요.
  ⚠️ UI 컴포넌트도 렌더링 테스트 + 상태 전환 테스트 선행.

Phase 4 — Code Review
  /review 명령으로 자체 코드 리뷰 실행
  → 체크 항목:
    ☐ §5 Hard Constraints 위반 0건
    ☐ CLAUDE.md 불변 원칙 위반 0건 (특히 #1 라이트 테마 · #2 Crown Gold · #5 FIFA 금지)
    ☐ LANGUAGE.md 금지 용어 0건 (Vote Count 1회 예외 검증)
    ☐ TypeScript strict mode 통과
    ☐ console.error 0건
    ☐ getAdminKpis/listAdminAlerts callable 모두 server-side ADMIN_UID 재확인
    ☐ Recharts dynamic import ssr:false 적용
    ☐ lib/layout/domains.ts Phase D 수정 완료

Phase 5 — PR 제출
  /pr 명령으로 PR 생성
  → PR 본문에 §10 종료 조건 체크리스트 포함
  → 시각 캡처: Desktop / Tablet / Mobile-notice 3개 첨부
  → Cloud Function logs 캡처 (비운영자 permission-denied 증거)
```

### 11.2 TDD 대상 매핑 (Cowork이 채움)

| 테스트 파일 | 테스트 대상 | §4 기준 |
|---|---|---|
| `functions/src/__tests__/buildAdminKpis.test.ts` | `buildAdminKpis(votes, tournaments, alerts, now)` 순수 함수 — 빈 입력→0 모두, 1 tournament→round_status 정확, 60s 윈도우 vote_speed, distinct(userId) active_voters, abuse_warnings count (dismissed 제외) | AC §4.2 5개 모두 |
| `functions/src/__tests__/getAdminKpis.test.ts` | `getAdminKpis` callable — auth 없음 → unauthenticated, auth.uid≠ADMIN_UID → permission-denied, auth.uid=ADMIN_UID → buildAdminKpis 호출 + KpiSnapshot 반환 | AC §4.1 callable 보안 |
| `functions/src/__tests__/listAdminAlerts.test.ts` | 동일 패턴: 비운영자 거부 + 운영자 → admin_alerts 최근 50건 severity sort | AC §4.4 |
| `lib/admin/dashboard/__tests__/useKpis.test.ts` | hook 단위 — mock callable로 60s polling, staleAfter 90s, manual refresh 함수 | AC §4.2 polling + stale |
| `lib/admin/dashboard/__tests__/normalizeAlerts.test.ts` | severity sort (high>medium>low>dismissed), dedup by alertId, 24h 이상 dismissed 필터 | AC §4.4 |
| `components/admin/dashboard/__tests__/AdminAuthGuardLight.test.tsx` | adminGateState 4상태 분기 렌더 (vitest + RTL) — loading→spinner, needs-signin→Google btn, forbidden→redirect call, allowed→children | AC §4.1 게이트 |
| `components/admin/dashboard/__tests__/KPICards.test.tsx` | 5개 카드 렌더 + loading shimmer + stale 배지 + delta up/down/flat 색상 | AC §4.2 |
| `components/admin/dashboard/__tests__/AlertList.test.tsx` | severity별 색상 className + empty state + dismiss UI 작동 | AC §4.4 |
| `components/admin/dashboard/__tests__/AdminSidebar.test.tsx` | MVP1 3개 nav + MVP2 disabled 2개 + 운영자 푸터 + 토글 | AC §4.5 |
| `e2e/g1-admin-dashboard.spec.ts` | §11.4 시나리오 7개 — Console 에러 0건 fixture | AC §4 전체 |

### 11.3 TDD 면제 조건

다음 경우에만 TDD를 건너뛸 수 있습니다 (사유를 PR에 명시):
- 순수 CSS/스타일링 변경 (로직 없음) — `dashboard.module.css`만 해당
- 정적 콘텐츠 렌더링 (변환 로직 없음) — `MobileNotice` 등
- 외부 라이브러리 설정 파일 — `next.config.js` Recharts transpile

그 외 모든 로직(인증 게이트·callable·hook·KPI 계산·alert sort·sidebar 상태)은 TDD 필수.

### 11.4 3계층 테스트 의무 (v2.1 신설 — "권장" 단어 금지)

| 계층 | 도구 | 적용 대상 | 통과 기준 |
|------|------|---------|----------|
| **유닛 (Unit)** | vitest | `buildAdminKpis` · `normalizeAlerts` · `adminGateState`(B-1 재사용 검증) · format 헬퍼 | 100% PASS |
| **통합 (Integration)** | Firebase Emulator + vitest | `getAdminKpis` callable · `listAdminAlerts` callable · firestore.rules `admin_alerts` deny (custom claim 없을 때) | 100% PASS |
| **E2E (Playwright)** | `@playwright/test` | **인증 게이트 4상태** (loading→needs-signin→sign-in→allowed) · KPI 카드 60s polling · alert dismiss UI · sidebar nav The Lab · SiteMapSheet 통합 · Dev Nav 통합 · 반응형 3-BP | 100% PASS + Console 에러 0건 |

⚠️ **운영자 로그인·callable permission-denied·세션 흐름은 E2E 의무.** 유닛만으론 절대 못 잡는다 (PR #20 D-1 사고가 증거).

E2E 시나리오 (최소 7개):

```ts
test.describe('G-1 Admin Dashboard', () => {
  test('비로그인 /admin → needs-signin 카드', ...)
  test('Voter 로그인 후 /admin → forbidden → /로 리다이렉트', ...)
  test('운영자 로그인 후 /admin → Dashboard 정상 렌더 + KPI 5개', ...)
  test('SiteMapSheet ☰ → Domain 6 정상 링크 (Coming soon 해제)', ...)
  test('Dev Nav Cmd+Shift+D → Admin Dashboard 클릭 → /admin', ...)
  test('Alert dismiss 버튼 클릭 → UI opacity 0.45 변경', ...)
  test('반응형: 1440 → 768 → 375 BP 전환 + MobileNotice 표시', ...)
});
```

### 11.5 CI 통합 (GitHub Actions) — v2.1 신설

신규 파일: `.github/workflows/g1-e2e.yml`

```yaml
name: G-1 Admin Dashboard E2E (Playwright)
on:
  pull_request:
    branches: [main]
    paths:
      - 'app/admin/**'
      - 'components/admin/dashboard/**'
      - 'functions/src/getAdminKpis.ts'
      - 'functions/src/listAdminAlerts.ts'
      - 'functions/src/core/buildAdminKpis.ts'
      - 'lib/admin/dashboard/**'
      - 'lib/layout/domains.ts'
      - 'e2e/g1-admin-dashboard.spec.ts'
      - 'messages/*.json'
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - uses: actions/setup-java@v4    # ⚠️ Java 21+ 필수 ([[feedback-firebase-tools-java21]])
        with: { java-version: '21', distribution: 'temurin' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:unit -- lib/admin/dashboard functions/src/__tests__/buildAdminKpis
      - run: npm run test:integration -- functions/src/__tests__/getAdminKpis functions/src/__tests__/listAdminAlerts
      - name: E2E (g1 spec only — scope 분리)
        run: npx playwright test e2e/g1-admin-dashboard.spec.ts
        env:
          VERCEL_BYPASS: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: g1-playwright-report, path: playwright-report/ }
```

⚠️ spec scope 분리 의무 ([[feedback-workflow-spec-scope]]) — 다른 모듈 워크플로우가 우리 spec 돌리지 못하게.

### 11.6 Console 에러 0건 자동 검증 (E2E 내장 코드)

```ts
import { test, expect } from '@playwright/test';

let consoleErrors: string[];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
});

test.afterEach(async () => {
  expect(consoleErrors, 'Console errors must be 0').toHaveLength(0);
});
```

---

## §12. Cowork 셀프체크리스트 — 핸드오프 publish 전 의무 (v2.1)

```
☑ §11 별도 섹션 존재? (§7 안쪽 묻기 X — 별도 ✓)
☑ "권장" 단어 0건? (grep -i "권장\|선택\|옵션\|가능하면" 핸드오프 → 0건 — 본문 검증 완료)
  ⚠️ 단, §11.4 표 안의 "권장" 단어 금지 문구는 메타 설명이므로 예외
☑ 핵심 사용자 흐름 E2E 시나리오 명시? (§11.4 7개 시나리오 + Playwright 코드 예시 포함 ✓)
☑ §10 Done-Definition에 E2E 증거 + Firebase Authorized domains 의무 항목 추가? (✓ §10 v2.1 항목)
☑ lite-spec 구버전 표기 정정표 §1.2 + grep 명령 §0.3 강제 (✓)
☑ 함정 14개 ([[memory-link]] 포함) 시각화 + Severity 표시 (✓)
☑ 진실 공급원 5순위 명시 (✓)
☑ Phase A~D 분할 + 파일별 NEW/EDIT 표 (✓)
☑ TDD 매핑 표 §11.2 10개 항목 채움 (✓)
☑ CI workflow yml 예시 + spec scope 분리 + Java 21 (✓)
```

---

## 부록 A — 워크트리 + Antigravity 회피

```bash
# main 최신 동기화 (대표가 직접 실행)
cd /Users/jinii/Projects/worldcrown48
git fetch origin
git checkout main
git pull origin main          # 기대: 4c39e52 등장

# 워크트리 + feat 브랜치 생성 (대표가 직접 실행)
git worktree add -b feat/g1-admin-dashboard /Users/jinii/Projects/wc48-g1 main

# 본 핸드오프 워크트리에 복사 + 커밋 (대표가 직접 실행)
cp ~/Downloads/G1-admin-dashboard-handoff.md \
   /Users/jinii/Projects/wc48-g1/docs/handoffs/G1-admin-dashboard-handoff.md
cd /Users/jinii/Projects/wc48-g1
git add docs/handoffs/G1-admin-dashboard-handoff.md
git commit -m "docs(g1): handoff brief v1.0 (template v2.1)"
git push -u origin feat/g1-admin-dashboard
```

⚠️ Antigravity worktree hijack 경고 ([[feedback-antigravity-worktree-hijack]]) — 본 워크트리에 Claude Code만 켜고 Antigravity는 절대 켜지 않음.

---

## 부록 B — Claude Code auto mode kickoff 프롬프트

워크트리 셋업 후 Claude Code(auto mode)에서 다음 프롬프트로 시작:

```
docs/handoffs/G1-admin-dashboard-handoff.md 를 처음부터 끝까지 읽고,
§0 자가 검증 7항목을 모두 통과시킨 뒤,
§11.1 Phase 1~5 순서대로 진행하세요.

Auto-STOP 조건:
- §0 검증 1개라도 ✗ → 즉시 STOP + 대표 보고
- 3계층 테스트(§11.4) 어느 하나라도 fail → 즉시 STOP
- Hard Constraints(§5) 위반 자체 발견 → 즉시 STOP
- 토큰 사용량 400k 초과 시 → §4 진척 보고 후 STOP

목표: PR draft 제출까지 1세션 안에 완주.
```

---

*핸드오프 버전: G-1 v1.0 · template v2.1 (2026-06-30 작성)*
*기반: A-1 The Pitch handoff v1.0 (2026-06-29) + B-1 The Lab handoff (2026-06-21)*
*© 2026 WorldCrown48 | CONFIDENTIAL*
