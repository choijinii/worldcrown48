# COOKIE-1 동의 층 수리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 동의한 팬에게 동의 바가 다시 뜨지 않고, es 팬이 동의를 저장할 수 있으며, 동의 바가 무대·배너를 가리지 않고, 모든 통계는 분석 동의 뒤에만 나가게 한다.

**Architecture:** 순수 층(`lib/cookieConsent.ts` 파싱 · `lib/policy/consentBar.ts` 표시 판정 · `lib/policy/consentEvents.ts` 결정→이벤트 순서)을 먼저 테스트로 고정하고, React 부품(`CookieConsentProvider` · `CookieBanner`)은 그 순수 함수를 얇게 부른다. 통계 게이트는 `lib/analytics.ts` 한 곳(`track()`)에서 막아 호출부 36곳은 손대지 않는다.

**Tech Stack:** Next.js 14 · TypeScript · Firebase JS SDK(Firestore · Analytics) · Vitest(node 환경, `lib/__tests__/**`) · `@firebase/rules-unit-testing`(에뮬레이터, `tests/rules/**`) · Playwright E2E(CI 프리뷰)

**Spec:** `outputs/PROMPT_ClaudeCode_COOKIE-1_v1.2_2026-10-05.md` (정본 우선순위: 결정 원장 > 이 지시서)

## Global Constraints

- R1 동의 바·모달의 팬 노출 문구 불변. 허용 예외: 본문(ko·en)과 머리말 줄 "쿠키 동의 · COOKIE CONSENT · GDPR"을 '자세히' 뒤로 접기. 접힌 글자도 DOM에 항상 존재.
- 새 글자는 '자세히' 단추 하나("자세히 · Details" 제안) — **대표 승인 전 커밋 금지**.
- R2 동의 전에는 필수 쿠키만. 가로 비표시는 동의를 "미루는 것".
- R3 `cookieConsents`·`userPrefs` 규칙은 `es`를 **추가**만.
- R4 흔적 쿠키 형식 `"1.0.<ms>"` 유지 — 파싱만 고친다.
- R6 색·크기는 `var(--…)` 토큰만 (`npm run check:hex`).
- R7 `SplitStage`·`BannerSlot`·`stageLayout`·`useStageViewport` 수정 금지 (`stageMode` import만).
- R8 쿠키 이벤트는 동의 게이트 통과형만, `bypassConsent` 0건.
- R9 모든 `track()`은 분석 동의 뒤. `getAnalytics()`는 동의 확인 후에만 처음 호출. 이벤트 이름·파라미터·호출 위치 불변.
- D-41: `ensureAnonymousUid`는 Provider 저장 경로에만 — `anonCreationSites.test.ts`를 깨지 않는다.
- `firestore.rules` 배포 금지(병합 후 대표).

## 판단이 필요한 발견 (계획 검토 때 대표 확인)

**F-1. 흔적 쿠키를 고치면 돌아온 팬의 분석 동의가 사라진다.** 지금 부팅 경로는 흔적 쿠키가 읽히면 Firestore를 읽지 않고 바로 숨긴다(`hide-by-cookie`). 흔적 쿠키에는 정책 버전·저장 시각만 있고 **카테고리 선택은 없다**. 지금까지는 쿠키가 한 번도 읽히지 않아(버그 #1) 언제나 Firestore 경로로 가서 `analytics` 값을 복원했다. 파싱만 고치면 → 돌아온 팬은 모두 "분석 동의 없음"으로 취급 → 게이트 일원화(F) 뒤에는 **모든 통계가 첫 방문 세션 외엔 0**이 된다.
- 권장안: 흔적 쿠키가 있으면 **동의 바는 즉시 숨기고**(지금처럼), 그 뒤 **기존 사용자가 있을 때만** Firestore 동의 기록을 읽어 카테고리를 복원한다. 계정은 만들지 않는다(D-41 유지 — `getExistingUser`만). 형식은 그대로(R4). 사용자가 없거나 읽기 실패면 분석 꺼짐(안전한 쪽, R2).
- 대안(채택 안 함): 흔적 쿠키에 카테고리를 넣기 → 형식 변경이라 R4 위반.

**F-2. 지금은 첫 세션에서 "모두 허용"을 눌러도 통계가 켜지지 않는다.** 동의 읽기 함수가 `savedRecord != null && preferences.analytics`인데, 저장 경로는 `savedRecord`를 갱신하지 않는다. 또 읽기 함수는 `useEffect`로 다시 심어져 저장 직후 같은 틱에는 옛 값을 본다(지시서 Phase E (2)의 함정). → 동의 상태를 React 상태가 아니라 `lib/analytics.ts`의 모듈 값(`setAnalyticsConsent(granted)`)으로 **동기적으로** 바꾼다.

**F-3. `cookie_reject` 순서 결정.** 쿠키 이벤트는 모두 **새 동의를 적용한 뒤** 그 동의로 판단한다(규칙 하나). 그래서 "필수만"은 언제나 기록 0, 분석 끄고 저장도 0. "예전에 허용했던 팬이 바꿀 때"도 바꾼 순간 동의가 없으므로 보내지 않는다 — 거부 직후 전송은 거부 의사에 반하기 때문. 테스트로 고정.

**F-4. 순서 변경.** 지시서 Phase 순서는 E(쿠키 이벤트) → F(게이트 일원화)지만 E가 F의 동기 동의 값에 기대므로 **F를 E 앞에** 둔다. 커밋은 Phase당 1개 그대로.

## Review Focus

1. 흔적 쿠키는 있는데 로그아웃·쿠키 일부 삭제로 사용자가 없는 팬 → 동의 바 숨김 유지, 분석은 꺼짐(Task 6 테스트).
2. 동의를 거둔 팬(모두 허용 → 다시 열기 → 필수만) → 그 뒤 `logEvent` 0회, `setAnalyticsCollectionEnabled(false)` 1회(Task 5 테스트).
3. 측정 ID가 없는 환경(로컬·CI)에서 동의 후 `track()` → 예외 없이 조용히 끝난다(Task 5 테스트).
4. 가로→세로 회전 시 동의 바가 다시 보이고, 1024 이상 데스크톱 가로 창에서는 보인다(Task 4 테스트: `stageMode` 경계 1023/1024).
5. 흔적 쿠키 값이 `"1.0."` · `"abc"` · 미래 버전 `"1.1.<ms>"` · 다른 쿠키 이름에 `wc48_consent`가 접두로 붙은 경우(`xwc48_consent=`) → null(Task 1 테스트).

---

### Task 1 (Phase A): 흔적 쿠키 파싱

**Files:**
- Modify: `lib/cookieConsent.ts:189-203`
- Test (new): `lib/__tests__/policy/cookieConsent.test.ts`

**Interfaces:**
- Produces: `parseConsentBreadcrumb(raw: string, now: Date): Date | null` (순수, export) — `readConsentBreadcrumbCookie`가 이것을 부른다.

- [ ] **Step 1: 실패하는 테스트** — node 환경이라 `document`를 `globalThis`에 가짜로 심는다(`{ cookie: "" }` 객체; setter는 `name=value`를 저장하는 간단한 jar). 케이스: 쓰기→읽기 왕복 · `"1.0.<ms>"` 직접 읽힘 · 버전 `"1.1"`·`"2.0"` 무효 · 저장 후 365일 지나면 null · `"1.0."`·`"abc"`·`"1.0.NaN"` null · 다른 쿠키 사이에 섞여도 읽힘 · `parseConsentBreadcrumb`가 마지막 `.` 기준으로 분리.
- [ ] **Step 2: 실행해 RED 확인** — `npx vitest run lib/__tests__/policy/cookieConsent.test.ts` → 왕복·직접 읽기 실패(null).
- [ ] **Step 3: 구현**

```ts
export function parseConsentBreadcrumb(raw: string, now: Date): Date | null {
  // 값은 `${CURRENT_POLICY_VERSION}.${ms}` — 버전 자체에 점이 있으므로("1.0") 마지막 점에서 나눈다.
  const cut = raw.lastIndexOf(".");
  if (cut <= 0) return null;
  const version = raw.slice(0, cut);
  const savedAtMs = raw.slice(cut + 1);
  if (version !== CURRENT_POLICY_VERSION) return null; // policy bumped → re-prompt
  if (!/^\d+$/.test(savedAtMs)) return null;
  const savedAt = new Date(Number(savedAtMs));
  if (savedAt.getTime() + CONSENT_VALIDITY_MS <= now.getTime()) return null;
  return savedAt;
}
```
`readConsentBreadcrumbCookie`는 `match` 뒤 `return parseConsentBreadcrumb(raw, now)`.
- [ ] **Step 4: GREEN** — 같은 명령 PASS, `npx vitest run` 전체 PASS.
- [ ] **Step 5: 커밋** — 지시서 사본 + 이 계획서 포함. `fix(consent): COOKIE-1 A — 흔적 쿠키 버전 파싱 (마지막 점에서 분리)`

### Task 2 (Phase B): `cookieConsents` 규칙 es

**Files:**
- Modify: `firestore.rules:122,143`
- Test (new): `tests/rules/cookie-consent.rules.test.ts` (`banners.rules.test.ts` 형태)

- [ ] **Step 1: 테스트** — 유효 문서 = `{uid, essential:true, functional, analytics, marketing, timestamp: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now()+365d), ipHash:"", lang, version:"1.0"}`. 케이스: ko/en/es 저장 성공 · `lang:"fr"` 거부 · `essential:false` 거부 · 남의 uid 문서 쓰기 거부 · 비로그인 거부 · 소유자 읽기 성공 · 남 읽기 거부 · 알 수 없는 키 거부.
- [ ] **Step 2: RED** — `PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npx firebase emulators:exec --only firestore "npx vitest run --config vitest.rules.config.ts tests/rules/cookie-consent.rules.test.ts"` → es 케이스만 실패.
- [ ] **Step 3: 구현** — 143행 `(… == 'ko' || … == 'en' || request.resource.data.lang == 'es')`, 122행 주석 `'ko' | 'en' | 'es'`.
- [ ] **Step 4: GREEN** 같은 명령.
- [ ] **Step 5: 커밋** `fix(rules): COOKIE-1 B — cookieConsents 에 es 허용 + 규칙 테스트`

### Task 3 (Phase G): `userPrefs` 규칙 es

**Files:** Modify `firestore.rules:315,325` · Test (new) `tests/rules/user-prefs.rules.test.ts`

- [ ] **Step 1: 테스트** — 유효 문서 `{uid, lang, theme?:'auto'|'dark'|'light', updatedAt: serverTimestamp()}`(실제 규칙의 나머지 조건을 읽고 맞춘다). 케이스: ko/en/es 성공 · `fr` 거부 · `theme:"neon"` 거부 · theme 생략 성공 · 남의 uid 거부 · 소유자만 읽기.
- [ ] **Step 2: RED** (Task 2와 같은 명령, 파일만 바꿈) → es 실패.
- [ ] **Step 3: 구현** — 325행 es 추가, 315행 주석 `'ko' | 'en' | 'es'`.
- [ ] **Step 4: GREEN** · **Step 5: 커밋** `fix(rules): COOKIE-1 G — userPrefs 에 es 허용 + 규칙 테스트`

### Task 4 (Phase C): 문구 불변 스냅샷 → 동의 바 한 줄 56px  ⛔ 승인 게이트

**Files:**
- Test (new): `lib/__tests__/policy/cookieBannerCopy.test.ts`
- Modify: `components/policy/CookieBanner.tsx` · `app/globals.css:494-590,880-890`

- [ ] **Step 1: 문구 스냅샷 테스트를 지금 코드에 대고 GREEN으로 만든다** — `vi.mock("@/components/policy/CookieConsentProvider", …)`로 `bannerState:"visible"` 주입 → `react-dom/server`의 `renderToStaticMarkup(createElement(CookieBanner))` → 태그를 걷어낸 텍스트에서 머리말 · 제목 · ko 본문 · en 본문 · 버튼 3개 문자열이 **지금 글자와 정확히 같음**을 단언(공백 정규화). (`.tsx` import가 vitest esbuild에서 JSX 변환되는지 확인 — 안 되면 `vitest.config.ts`에 `esbuild: { jsx: "automatic" }` 추가.)
- [ ] **Step 2: 재배치 테스트(RED)** — 같은 파일에: '자세히' 단추가 `aria-expanded="false"` · `aria-controls`로 접힌 영역을 가리킴 · 머리말과 본문이 접힌 영역 안에 있고 DOM에 존재(`hidden` 속성) · 제목과 버튼 3개는 접힌 영역 밖.
- [ ] **Step 3: '자세히' 글자 전후 비교를 대표에게 제시하고 STOP** — 승인 전 이 Task 커밋 금지.
- [ ] **Step 4: 구현** — 구조: `aside.cookie-banner > .cb-inner > [.cb-row: h2.cb-title · button.cb-more · .cb-actions(3)] + div#cb-details.cb-details[hidden](머리말 + 본문)`. 펼친 영역은 줄 **위**에 그 자리에서 열린다. CSS: 접힌 상태 높이 56px(테두리 2 포함) — `.cb-row` 한 줄 flex, 제목 한 줄 말줄임 없이, 버튼 3개 같은 크기(`flex: 0 0 auto` + 같은 padding). 좁은 화면은 버튼 줄을 아래로(두 줄까지). 토큰만.
- [ ] **Step 5: GREEN + 브라우저 실측** — 1440×900 높이 56, 1024·1280·1366 높이 기록, 배너 자리(`[data-testid=banner-slot]`) 아래 변 ≤ 동의 바 위 변.
- [ ] **Step 6: 커밋(승인 후)** `feat(consent): COOKIE-1 C — 동의 바 한 줄(56px) · 머리말·본문은 '자세히' 안으로`

### Task 5 (Phase D): 모바일 가로 비표시

**Files:**
- Create: `lib/policy/consentBar.ts` · Test `lib/__tests__/policy/consentBar.test.ts`
- Modify: `components/policy/CookieBanner.tsx`

**Interfaces:** Produces `shouldShowConsentBar(input: { mode: StageMode }): boolean`.

- [ ] **Step 1: 테스트** — `landscape`→false, `portrait`·`desktop`→true; `stageMode(844,390)`→false, `stageMode(390,844)`→true, `stageMode(1024,600)`→true, `stageMode(1023,600)`→false.
- [ ] **Step 2: RED** · **Step 3: 구현** `return input.mode !== "landscape";` + 부품: `useState<StageMode>("desktop")`, 마운트 후 `stageMode(innerWidth, pickViewportHeight(innerHeight, visualViewport?.height))`, `resize`·`orientation` matchMedia·`visualViewport.resize` 구독. `bannerState==="visible" && !show`면 `hidden`. 동의 상태는 건드리지 않는다(R2 — 미룸).
- [ ] **Step 4: GREEN** · **Step 5: 커밋** `feat(consent): COOKIE-1 D — 모바일 가로에서는 동의 바를 미룬다`

### Task 6 (Phase F): 통계 동의 게이트 일원화 (+F-1·F-2)

**Files:**
- Modify: `lib/analytics.ts` · `components/policy/CookieConsentProvider.tsx`
- Test (new): `lib/__tests__/analytics/consentGate.test.ts`

**Interfaces:**
- Produces: `setAnalyticsConsent(granted: boolean): void` (동기) · `track(event, params)` (게이트 통과형) · `trackWithConsent(event, params)` = `track` 별칭(세 번째 인자 삭제). `setAnalyticsConsentReader` 삭제.

- [ ] **Step 1: 테스트** — `vi.mock("firebase/analytics", () => ({ isSupported: vi.fn(async()=>true), getAnalytics: vi.fn(()=>({})), logEvent: vi.fn(), setAnalyticsCollectionEnabled: vi.fn() }))`, `vi.mock("@/lib/firebase", () => ({ getFirebaseApp: () => ({}) }))`, `process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-TEST"`, `globalThis.window = {}`; 매 테스트 `vi.resetModules()`로 모듈 상태 초기화. (1) 동의 없음 → `track` 후 `logEvent` 0 · `getAnalytics` 0 · `isSupported` 0 (2) `setAnalyticsConsent(true)` → 1 (3) 동의 후 철회 → `setAnalyticsCollectionEnabled(false)` 1회, 그 뒤 `logEvent` 증가 0 (4) 재동의 → `setAnalyticsCollectionEnabled(true)` (5) 측정 ID 없음 + 동의 → 예외 없이 0 (6) grep: `app·components·lib`(테스트 제외)에서 `logEvent(`·`getAnalytics(`가 `lib/analytics.ts` 밖에 0건, `bypassConsent` 0건.
- [ ] **Step 2: RED** · **Step 3: 구현**

```ts
let analyticsConsent = false;
export function setAnalyticsConsent(granted: boolean): void {
  analyticsConsent = granted;
  // 이미 깨운 적이 있을 때만 수집 스위치를 돌린다 — 동의 전에는 GA를 깨우지 않는다(R9).
  if (analyticsReady) void analyticsReady.then((a) => a && setAnalyticsCollectionEnabled(a, granted));
}
export async function track(event: string, params: EventParams = {}): Promise<void> {
  if (!analyticsConsent) return; // R9 — 동의 전에는 GA를 깨우지도 않는다
  const a = await ensureAnalytics();
  if (!a || !analyticsConsent) return;
  logEvent(a, event, params);
}
export const trackWithConsent = track;
```
머리 주석을 R8·R9로 고쳐 쓴다. Provider: `setAnalyticsConsentReader` 효과 삭제; 부팅에서 기록을 읽으면 `setAnalyticsConsent(record.analytics)`; 흔적 쿠키 경로는 숨긴 뒤 `getExistingUser()`→`loadConsent()`로 카테고리 복원(F-1, 계정 생성 없음); 저장 성공 직후 `setAnalyticsConsent(next.analytics)`; `useAnalyticsConsent`는 `preferences.analytics && lastSavedAt != null`로.
- [ ] **Step 4: GREEN** + `anonCreationSites.test.ts` green. **Step 5: 커밋** `fix(analytics): COOKIE-1 F — 모든 통계는 분석 동의 뒤로 (동의 전 GA 미기동)`

### Task 7 (Phase E): 쿠키 이벤트 4개 (동의 후)

**Files:**
- Create: `lib/policy/consentEvents.ts` · Test `lib/__tests__/policy/consentEvents.test.ts`
- Modify: `components/policy/CookieConsentProvider.tsx` (acceptAll · rejectAll · savePreferences · openModal)

**Interfaces:**
- Produces: `consentEventFor(decision: "accept_all" | "reject" | "save", prefs: ConsentPreferences): { event: string; params: Record<string, string | boolean> }` · `async recordConsentDecision(decision, prefs, deps: { applyAnalyticsConsent(granted: boolean): void; track(event: string, params: Record<string, string | boolean>): Promise<void> }): Promise<void>` — 적용 **먼저**, 이벤트 **나중**. · `trackCustomizeOpen(track)` = `track("cookie_customize_open", {})`.

- [ ] **Step 1: 테스트** — 진짜 `lib/analytics`(firebase/analytics mock)로: (1) 동의 없음에서 `cookie_customize_open` → 0 (2) `recordConsentDecision("accept_all", ACCEPT_ALL)` → `logEvent(…,"cookie_accept_all",{categories:"all"})` 1 (3) save 분석 켬 → `cookie_save {functional,analytics,marketing}` 1, 분석 끔 → 0 (4) 동의된 상태에서 customize open → 1 (5) 동의된 팬이 reject → 0 (F-3) (6) deps 호출 순서 `["apply","track"]`.
- [ ] **Step 2: RED** · **Step 3: 구현** + Provider 연결(저장 성공 뒤 `void recordConsentDecision(...)`, `openModal`에서 `void trackWithConsent("cookie_customize_open", {})`). `cookie_banner_view`는 넣지 않는다.
- [ ] **Step 4: GREEN** · **Step 5: 커밋** `feat(analytics): COOKIE-1 E — 쿠키 이벤트 4개는 분석 동의 뒤에만`

### Task 8 (Phase H): 검증 · E2E 정리 · PR

- [ ] `npx vitest run` · `npx tsc --noEmit` · `npm run check:hex` · `(cd functions && npm run build)` · `npm run test:rules`(JDK 21) 전부 green.
- [ ] 로컬 dev 실측(1440×900·1024·1280·1366·844×390·390×844): 높이 · 배너 자리 겹침 · 회전 · '자세히' 펼침 · 콘솔 에러 0.
- [ ] `e2e/arena1-split-stage.spec.ts`의 `dismissCookieBanner` 주석("버전 1.0 점 때문에 못 읽는다")을 사실대로 고치고, 가로 테스트에서 불필요해졌는지 실측으로 판단(데스크톱은 유지 가능).
- [ ] 브랜치 push → PR(§8 형식) → 프리뷰에서 `_ga` 쿠키 실측(동의 전 없음 · 모두 허용 후 생김), E2E 회귀(`d1-auth`·`c1-arena-flow`·`run1-daily-run-limit`·`arena1-split-stage`·`hf3-guest-run`) 결과를 PR 본문 B에 기록.
