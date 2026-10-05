# Claude Code 전달 프롬프트 — COOKIE-1 (동의 기록 버그 + 동의 바 재배치 + 동의 후 쿠키 이벤트 + 통계 동의 게이트 + 화면 설정 es) · **v1.2 (2026-10-05)**

> **상태: 실행 가능.** 이 파일은 `PROMPT_ClaudeCode_COOKIE-1_v1.0_승인반영_2026-09-20.md`를 **대체**한다 — 둘이 다르면 이 파일이 이긴다.
> **v1.2에서 더한 것 (2026-10-05 대표 "함께 발견한 두 가지도 이번에 같이 고쳐라 — 미루면 언제 할지 모른다")**
> 6. **모든 통계 이벤트를 분석 동의 뒤로** — 지금 `track()`(동의 게이트 없음)을 부르는 곳이 **36곳**이다(피치 화면 열기 `a1_pitch_view`, 카드·뉴스 클릭, 상단 메뉴, 크라운 카드 창·형식 변경, 런치 패드 4개, 관리자 화면). 이 중 `a1_pitch_view`는 피치 화면을 여는 것만으로 `getAnalytics()`를 깨워, **동의 전에 GA(구글 애널리틱스) 쿠키가 심어질 수 있다**(R2 위반 의심). → `track()` 자체를 동의 게이트 통과형으로 바꾸고, 분석 동의 전에는 `getAnalytics()`를 부르지 않는다(§3 IN ⑦ · §9 게이트 5).
> 7. **화면 설정(`userPrefs`) 규칙에도 es 추가** — 325행이 `ko·en`만 허용. 지금 쓰는 코드는 없지만 나중에 쓰는 순간 es 팬만 막히는 같은 결함이라 함께 고친다(§3 IN ⑧).
> **v1.1에서 바뀐 것 (티오 · 2026-10-05 · main `fc7137a` 기준 대조)**
> 1. 기준 커밋을 `7bb4a93` → **`fc7137a`**(#112 ANON-1 · #114 E2E-1 · #115 CARD-FIX · #116 보고서 이후)로 갱신. 줄 번호 갱신.
> 2. **동의 바 머리말 줄**("쿠키 동의 · COOKIE CONSENT · GDPR")도 본문과 함께 '자세히' 안으로 접는다 — **2026-10-05 대표 승인**. v1.0은 이 줄을 빠뜨려 56px가 성립하지 않았다.
> 3. **쿠키 이벤트 4개**(E-1 설계서에 있고 코드엔 없던 것)를 **분석 동의가 있을 때만** 기록되게 넣는다 — **2026-10-05 대표 결정**. 동의 전 전송(`bypassConsent`)은 금지(R2).
> 4. 익명 계정 생성 시점은 원장 **D-41(PR #112)**로 이미 바뀌었다 — 쿠키 동의 부품은 첫 화면에서 `getExistingUser()`로 기존 사용자만 조회하고, 동의 버튼으로 저장하는 순간 `ensureAnonymousUid()`를 부른다. 건드리지 않는다. `lib/__tests__/auth/anonCreationSites.test.ts`를 깨지 마라.
> 5. E2E 회귀 목록에 `hf3-guest-run` · `run1-daily-run-limit` 추가(지금 C-1 CI에서 같이 돈다). 새 e2e 파일을 만들면 워크플로에 연결해야 한다(`lib/__tests__/ci/e2eWiring.test.ts`가 막는다).
>
> 정본 우선순위: **① 결정 원장 `outputs/DECISIONS_결정원장_v1.0_2026-09-11.md` > ② 이 프롬프트 > ③ 기타 문서**
> 담당: Claude Code · 방식: **Superpowers** (테스트 먼저(RED) → 계획 → 구현(GREEN) → 검증). 계획서는 `docs/superpowers/`에 남긴다.

---

## §0 목적 / 완료 정의(DoD)

**목적**: 쿠키 동의 층의 결함 두 개(기록이 영원히 안 읽힘 · es 팬은 동의 저장 자체가 거부됨)를 고치고, 동의 바가 아레나 무대와 배너 자리를 덮지 않게 하며, 분석 동의가 생긴 순간의 쿠키 이벤트를 기록한다.

**DoD**
- [ ] 동의를 한 번 누른 팬은 **다음 방문에 동의 바가 뜨지 않는다** (지금은 매번 뜬다).
- [ ] **es 팬이 동의를 저장할 수 있다** (지금은 규칙이 거부한다).
- [ ] 동의 바(접힌 상태)가 **데스크톱 1440×900에서 한 줄 56px**이고, 무대 아래 배너 자리를 가리지 않는다. 1024·1280·1366 폭에서의 실제 높이도 보고한다.
- [ ] **모바일 가로(844×390)에서 동의 바가 보이지 않는다**(무대를 덮지 않음). 세로로 돌리면 다시 보인다.
- [ ] 동의 바·모달의 **팬 노출 문구는 한 글자도 바뀌지 않는다** (§4 R1 · 스냅샷 테스트로 판정). 새로 생기는 글자는 '자세히' 단추 하나뿐이며 대표 승인 후 커밋.
- [ ] 쿠키 이벤트 4개가 **분석 동의가 있을 때만** 기록된다(§3 IN ⑤). `bypassConsent: true` 사용 0건.
- [ ] **분석 동의 전에는 어떤 통계 이벤트도 나가지 않고 `getAnalytics()`도 호출되지 않는다** — 첫 방문자가 피치 화면을 열고 클릭해도 `_ga`로 시작하는 쿠키가 생기지 않는다(§3 IN ⑦). 동의를 거두면 수집이 멈춘다.
- [ ] `userPrefs` 규칙이 ko/en/**es**를 허용하고 규칙 테스트가 있다(§3 IN ⑧).
- [ ] 신설 테스트: `lib/__tests__/policy/cookieConsent.test.ts`(순수) · `tests/rules/cookie-consent.rules.test.ts`(에뮬레이터) · 동의 바 표시 판정·이벤트 게이트 유닛 테스트 — **현재 이 층에는 유닛·규칙 테스트가 0건이다**(익명 생성 자리 테스트 1건 제외).
- [ ] `npx vitest run` · `npx tsc --noEmit` · `npm run check:hex` · `cd functions && npm run build` green, Console 에러 0.
- [ ] 최종 보고에 "핸드오프와 달랐던 점".

## §1 필독 (이 순서로)

1. `outputs/DECISIONS_결정원장_v1.0_2026-09-11.md` — **D-17 ③**(모바일 가로 = 집중 모드, 상단 메뉴를 뺀다) · **D-21 바뀜 2026-09-19**(모바일 가로에는 배너를 두지 않는다) · **D-41**(익명 계정은 쿠키 동의 저장·아레나 입장·카드 입장에서만). "아니라고 한 것"을 반드시 읽어라.
2. `lib/cookieConsent.ts` — 순수 층. `Lang`(54) · `CURRENT_POLICY_VERSION`(84) · `writeConsentBreadcrumbCookie`(174) · `readConsentBreadcrumbCookie`(189, **버그 줄 196** `raw.split(".")`).
3. `components/policy/CookieConsentProvider.tsx` — 부팅 경로(흔적 쿠키 → Firestore → 동의 바). 첫 화면은 `getExistingUser()`(190), 동의 버튼 저장 때 `ensureAnonymousUid()`(248). `setAnalyticsConsentReader` 연결도 여기.
4. `components/policy/CookieBanner.tsx` — 구성: **머리말 줄**(`.cb-eyebrow` "쿠키 동의 · COOKIE CONSENT · GDPR") · 제목(`.cb-title`) · 본문(`.cb-body` ko + `.cb-body-en` en) · 버튼 3개(필수만 · Reject non-essential / 설정하기 · Customize / 모두 허용 · Accept all). **문구는 손대지 않는다.**
5. `lib/analytics.ts` — `track()`(동의 게이트 없음) · `trackWithConsent()`(82~, 분석 동의 없으면 아무것도 안 함). 주석의 "cookie_* 는 동의 없이 보낸다"는 **이 킥에서 폐기**(§4 R8) — 주석도 고친다.
6. `app/globals.css` 494~ (`.cookie-banner` · `.cb-inner`) · 880~ (`@media (max-width: 480px)` 모바일 분기).
7. `firestore.rules` 124~150 `cookieConsents` 블록 — **143행** `lang == 'ko' || lang == 'en'`.
8. `lib/arena/stageLayout.ts` — `stageMode(width, height)`(70) · `STAGE_DESKTOP_MIN_WIDTH = 1024`(20). 가로 판정은 **가져다 쓰기만** 하고 수정하지 않는다(R7).
9. `docs/handoffs/E1-policy-hub-handoff.md` 368~377 — 쿠키 이벤트 이름·파라미터 원안.
10. `docs/lite-specs/E1-policy-hub.md` — 정책 도메인 스펙(문구 권위).

## §2 실측 (2026-10-05 · main `fc7137a` · 티오 코드 대조)

| # | 현상 | 실물 |
|---|---|---|
| 1 | **흔적 쿠키가 한 번도 읽히지 않는다** | 값은 `"1.0.<ms>"`인데 읽을 때 `raw.split(".")`(196행) → version이 `"1"`. `CURRENT_POLICY_VERSION`은 `"1.0"` → 언제나 불일치 → `null`. 동의한 팬도 매 방문 Firestore를 조회하고, 조회 실패·지연이면 동의 바가 다시 뜬다 |
| 2 | **es 팬은 동의를 저장할 수 없다** | 규칙 143행 `lang == 'ko' || lang == 'en'`. `Lang` 타입에는 `es`가 있어 클라이언트는 `lang: "es"`를 보낸다 → permission-denied. (D-41 이후: es 팬이 동의 버튼을 누르면 익명 계정은 생기고 동의 문서 저장만 거부된다) |
| 3 | **동의 바가 배너 자리를 덮는다** | 1440×900에서 하단 고정 동의 바(약 200px)가 무대 아래 배너 자리(y 694–846)를 덮는다 (9/20 실측 · 이후 동의 바 코드 변경 없음) |
| 4 | **모바일 가로에서 무대 전체를 덮는다** | 844×390에서 동의 바가 화면을 가득 채운다. `e2e/arena1-split-stage.spec.ts`는 `dismissCookieBanner()`(237행 · 호출 229·571·642·660행)로 닫고 시작한다 |
| 5 | **쿠키 이벤트 5개가 코드에 없다** | E-1 설계서의 `cookie_banner_view` · `cookie_accept_all` · `cookie_reject` · `cookie_customize_open` · `cookie_save` 중 코드에 있는 것 0개(있는 것은 `cookie_lang_switch`뿐, 동의 게이트 통과형). `bypassConsent: true` 호출부 0건 |
| — | 테스트 공백 | `cookieConsents` 규칙 테스트 0건, `lib/cookieConsent.ts` 유닛 테스트 0건(`lib/__tests__/policy/` 폴더 없음). `e2e/d1-auth.spec.ts:161`은 계정 삭제 후 동의 문서가 **지워졌는지**만 본다 |
| 6 | **동의 게이트 없는 통계 호출 36곳** | `track()`은 `lib/analytics.ts`에서 게이트 없이 `ensureAnalytics()`→`getAnalytics()`를 부른다. 호출부: `components/pitch/`(PitchPage 25 `a1_pitch_view` — 화면 열기만으로 발생 · NewsFeedItem · TournamentCard · LabEntryCard · NewsroomFeed) · `components/layout/Navbar.tsx:117` · `components/crown/`(CrownCardModal 62 · ShareMenu 110) · `components/launch/`(WaitlistForm 105·111 · SNSLinks 63 · FeaturedTournament 98) · `components/admin/**` · `lib/admin/dashboard/useKpis.ts:42`. 정확한 목록은 `grep -rn "\btrack(" lib components app`로 다시 세어라. **동의 전 `_ga` 쿠키가 실제로 생기는지는 프리뷰에서 실측해 보고서 B에 적어라**(티오는 코드로만 확인) |
| 7 | `userPrefs` 규칙(325행)도 `ko·en`만 허용 | 저장소 안에 `userPrefs`를 쓰는 코드는 없다(테스트 제외). 그래도 이번에 `es`를 추가한다(대표 지시) |

## §3 스코프

| | 내용 |
|---|---|
| **IN** | ① 흔적 쿠키 버전 파싱 수정 ② `firestore.rules` `cookieConsents`에 `es` 추가 + 규칙 테스트 신설 ③ 동의 바(접힌 상태)를 **한 줄 56px**로 재배치 — 머리말 줄·본문은 '자세히' 안으로(§9 게이트 1) ④ **모바일 가로에서 동의 바 비표시**(§9 게이트 2) ⑤ **쿠키 이벤트 4개를 분석 동의가 있을 때만 기록**(§9 게이트 4) ⑥ 위 모두의 신설 유닛·규칙 테스트 ⑦ **통계 동의 게이트 일원화**(§9 게이트 5) — `track()`을 게이트 통과형으로 바꾸고, 분석 동의 전 `getAnalytics()` 미호출, 동의 철회 시 수집 중지 ⑧ **`userPrefs` 규칙에 `es` 추가** + `tests/rules/user-prefs.rules.test.ts` 신설 |
| **OUT** | 동의 **문구** 변경(R1) · 동의 카테고리·모달 구조 변경 · 모달 기본값(기능·분석 켬 · 마케팅 끔 — E-1 확정, 바꾸지 않음) · 개인정보처리방침/쿠키 정책 본문 · `ipHash` 콜러블 · 익명 계정 생성 시점(D-41로 이미 처리 — 건드리지 않음) · 배너 자리(BannerSlot)·무대(ARENA-1) 재작업 · 동의 기록 마이그레이션 · 구글 동의 모드(Consent Mode) 도입 · 동의 전 이벤트 전송 · 이벤트 이름·파라미터 변경 · GA4 콘솔 설정(대표 몫) |

## §4 RULE

- **R1 문구 불변** — 동의 바·모달의 팬 노출 문구는 한 글자도 바꾸지 않는다. **허용 예외(대표 승인)**: ① 본문 두 블록(ko·en)을 '자세히' 뒤로 접기(2026-09-20) ② **머리말 줄 "쿠키 동의 · COOKIE CONSENT · GDPR"도 함께 접기(2026-10-05)**. 접힌 글자도 DOM에는 항상 존재해야 한다. 그 밖의 요약·삭제·바꿔 쓰기는 여전히 변경이다.
- **R2 동의 없이 선택 쿠키 금지** — 어떤 배치 변경도 "동의 전에는 필수 쿠키만"을 깨지 않는다. 가로에서 동의 바를 감추는 경우에도 동의는 **미루는 것**이지 **가정하는 것**이 아니다.
- **R3 추가만** — `cookieConsents` 스키마는 `es` 허용을 **추가**할 뿐, 기존 필드·검증을 빼지 않는다.
- **R4 옛 쿠키 호환** — 이미 심어진 `"1.0.<ms>"` 쿠키를 고친 뒤에도 읽을 수 있어야 한다. 파싱만 고치고 형식은 바꾸지 않는다.
- **R5 동작 변화 명시** — 이 수정으로 **동의 바 노출 빈도가 줄어든다**(매번 → 1회). 의도된 결과다.
- **R6 색·크기는 토큰만** — `var(--…)`, raw hex 금지(`npm run check:hex`).
- **R7 선택 엔진·무대 불변** — ARENA-1 산출물(`SplitStage`·`BannerSlot`·`stageLayout`)은 수정하지 않는다. `stageMode`를 import해 쓰는 것은 허용.
- **R8 쿠키 이벤트는 동의 게이트 통과형만** — 모든 쿠키 이벤트는 `trackWithConsent(event, params)`로, **`bypassConsent` 없이** 보낸다. 분석 동의가 없는 순간(동의 바 노출·"필수만"·분석 끈 저장)은 기록하지 않는다. `lib/analytics.ts`의 "cookie_* 는 동의 없이 보낸다" 주석은 이 원칙으로 고쳐 쓴다(주석은 팬 노출 문구가 아니므로 R1 대상 아님). 동의의 법적 기록은 Firestore `cookieConsents` 문서가 맡는다.
- **R9 통계는 하나의 문으로** — v1.2부터 **모든** 통계 이벤트(쿠키·피치·크라운·런치·관리자)는 분석 동의를 지나야 나간다. 게이트 없는 경로를 남기지 않는다. `getAnalytics()`는 분석 동의가 확인된 뒤에만 처음 호출한다. 이벤트 이름·파라미터·호출 위치는 바꾸지 않는다(화면 동작 불변 — 통계 전송 여부만 달라짐).

## §5 Phase 분할 (Phase = 커밋 1개 · TDD RED→GREEN)

- **A 흔적 쿠키 파싱** — `lib/__tests__/policy/cookieConsent.test.ts` 신설: 쓰기→읽기 왕복 · `"1.0.<ms>"` 읽힘 · 정책 버전이 올라가면 무효 · 만료 · 손상된 값. → `readConsentBreadcrumbCookie` 수정(마지막 `.` 기준 분리 권장).
- **B 규칙 es** — `tests/rules/cookie-consent.rules.test.ts` 신설(`tests/rules/banners.rules.test.ts` 형태 그대로): 소유자만 읽기·쓰기 · ko/en/**es** 저장 성공 · 알 수 없는 lang 거부 · `essential:false` 거부 · 남의 uid 거부. → `firestore.rules` 143행에 `es` 추가.
- **C 동의 바 한 줄 56px** — 먼저 **문구 불변 스냅샷 테스트**(머리말·제목·본문 ko·en·버튼 3개 글자가 수정 전후 동일)를 만든다. 그다음 §9 게이트 1 그대로 재배치. '자세히' 단추 글자는 전후 비교를 대표에게 보이고 승인 전 커밋 금지.
- **D 모바일 가로 비표시** — 판정을 순수 함수로 뺀다: `shouldShowConsentBar({ mode })`(`mode`는 `stageMode(width, height)` 결과) → `landscape`면 false. 유닛 테스트 후 얇게 렌더. 가로→세로 회전 시 다시 보이는지 테스트.
- **E 쿠키 이벤트 4개(동의 후)** — 유닛 테스트 먼저: (1) 분석 동의 없음 → 이벤트 0건 (2) "모두 허용" → 동의 상태가 갱신된 **뒤에** `cookie_accept_all` 1건(동의 읽기 함수가 새 값을 보기 전에 부르면 조용히 사라진다 — 이 순서를 테스트로 고정) (3) 분석 켜고 저장 → `cookie_save` 1건, 분석 끄고 저장 → 0건 (4) 이미 분석 동의한 팬이 설정 창을 다시 열면 `cookie_customize_open` 1건 (5) `bypassConsent` 사용 0건(grep 테스트). → 구현은 §9 게이트 4 표대로.
- **F 통계 동의 게이트 일원화** — 유닛 테스트 먼저(`lib/__tests__/analytics/consentGate.test.ts`): (1) 분석 동의 없음 → `track()` 호출해도 `logEvent` 0회 **그리고 `getAnalytics` 0회**(firebase/analytics를 mock) (2) 동의 후 → 1회 (3) 동의 철회 → `setAnalyticsCollectionEnabled(false)` 호출 후 추가 전송 0회 (4) 저장소 전체에 게이트를 우회하는 `logEvent` 직접 호출 0건(grep 테스트). → 구현: `track()` 안에서 동의 읽기 함수를 먼저 확인하도록 바꾸는 방식을 권장(호출부 36곳을 고치지 않아도 됨). `trackWithConsent()`는 같은 동작의 별칭으로 남기거나 정리하되, 호출부 동작이 바뀌지 않게 하라. 관리자 화면 이벤트도 예외 없음.
- **G userPrefs es** — `tests/rules/user-prefs.rules.test.ts` 신설: 소유자만 · ko/en/**es** 성공 · 알 수 없는 lang 거부 · theme 허용값 검증 유지 · 남의 uid 거부. → `firestore.rules` 325행에 `es` 추가, 315행 주석도 `'ko' | 'en' | 'es'`로.
- **H 검증·PR** — §7 하네스 + E2E 회귀. D 반영 후 `arena1-split-stage`의 `dismissCookieBanner()` 우회가 필요 없어지는지 확인하고 정리하되, 데스크톱 시험은 여전히 동의 바를 닫아야 할 수 있다 — 실측으로 판단하고 보고하라.

## §6 Auto-STOP

- '자세히' 단추의 **새 글자**는 대표 승인 전 커밋 금지 → 그 지점에서 STOP(전후 비교 제시).
- 문구를 한 글자라도 바꿔야 56px가 성립하는 상황 → STOP.
- 가로 비표시가 "동의 없이 선택 쿠키 사용"으로 귀결되는 설계 → STOP(R2).
- 쿠키 이벤트를 위해 `bypassConsent`나 동의 전 GA 초기화가 필요하다고 판단되는 경우 → STOP(R8).
- 흔적 쿠키 형식 자체를 바꿔야 한다고 판단되는 경우 → STOP(R4).
- `firestore.rules` 배포 → 사람 절차(§9) — 직접 배포하지 마라.
- 실물이 이 문서 §2와 다름 → STOP(근거 경로 + 권장안).
- 통계 게이트를 바꾸다가 **화면 동작(버튼·이동·카드 생성)**이 달라져야 하는 상황 → STOP(R9).
- 동의 전 GA 초기화를 막으려면 Firebase 초기화 순서(`lib/firebase.ts`) 자체를 바꿔야 하는 경우 → 바꾸기 전에 STOP하고 근거·권장안 보고.

## §7 검증 하네스

| | 무엇 | 통과 기준 |
|---|---|---|
| 기계 | `npx vitest run` · `npx tsc --noEmit` · `npm run check:hex` · `cd functions && npm run build` | 전부 green |
| 기계 | `npm run test:rules` (에뮬레이터 · Java 21) | 신설 `cookie-consent.rules.test.ts` 포함 green |
| 기계 | 문구 스냅샷 — 머리말·제목·본문·버튼 문자열이 수정 전후 동일 | 차이 0 |
| 기계 | `anonCreationSites.test.ts` · `e2eWiring.test.ts` | green (깨지면 안 됨) |
| 기계 | 신설 `consentGate.test.ts` · `user-prefs.rules.test.ts` | green |
| 사람 | 프리뷰 첫 방문(쿠키 비운 창): 피치 화면을 열고 카드·메뉴를 눌러도 개발자 도구 쿠키 목록에 `_ga…` 없음 → "모두 허용" 뒤에 생김 | Claude Code 실측 + 대표 확인 |
| 기계 | E2E 회귀: `d1-auth`(d1-e2e.yml) · `c1-arena-flow` · `run1-daily-run-limit` · `arena1-split-stage` · `hf3-guest-run`(c1-e2e.yml) | 100% PASS · 건너뜀 0 |
| 사람 | 프리뷰: 동의 → 새로고침 → **동의 바가 다시 뜨지 않는다** | 대표 확인 |
| 사람 | 프리뷰 1440×900: 동의 바가 한 줄이고, 무대 아래 배너 자리가 가리지 않는다 · '자세히'를 누르면 머리말·본문이 그 자리에서 펼쳐진다 | 대표 확인 |
| 사람 | 프리뷰 844×390(휴대폰 가로): 동의 바가 보이지 않는다 · 세로로 돌리면 보인다 | 대표 확인 |
| 사람 | `?lang=es`로 동의 저장 성공(콘솔 permission-denied 없음) — 규칙 배포 후 | 대표 확인 |
| 사람 | GA4 실시간 보고서: "모두 허용" 누른 뒤 `cookie_accept_all` 1건 | 대표 확인(선택) |

## §8 PR 본문

A 무엇을 했나 · B 어떻게 확인했나(명령·실측) · C 판단이 필요했던 것(§6 "발견만" 항목 포함) · D 핸드오프와 달랐던 점 · E 리뷰어 체크리스트(사용자 영향 한 줄: "동의한 팬에게 동의 바가 다시 뜨지 않고, es 팬이 동의를 저장할 수 있으며, 동의 바가 무대·배너를 가리지 않는다 — 동의 문구·카테고리 무변경, 쿠키 이벤트는 분석 동의 후에만").

## §9 승인 게이트 · 사람 절차

| # | 필요한 것 | 상태 |
|---|---|---|
| 1 | **동의 바 한 줄 56px** — **의도 먼저**: 동의 바가 무대와 배너 자리를 가리지 않게 한다. 그래서 접힌 상태의 높이를 **56px 한 줄**로 한다. **한 줄에 담는 것**: ① 제목 한 문장("데이터를 정중하게 다루기 위한 동의가 필요합니다.") ② **'자세히'** 펼침 단추 ③ 버튼 3개(필수만 · 설정하기 · 모두 허용 — **같은 줄에 같은 크기로**, 거부가 허용만큼 쉽게 보여야 한다). **'자세히' 안에 접는 것**: 머리말 줄("쿠키 동의 · COOKIE CONSENT · GDPR") · ko 본문 · en 본문 — 누르면 **그 자리에서 펼쳐진다**(DOM에는 항상 존재 · 글자 불변). *이 수치가 정하지 않는 것*: 펼친 상태의 높이 · 문구 · 카테고리 · 모달 구조. '자세히' 단추의 글자(기존 버튼과 같은 병기 형식 "자세히 · Details")는 새 문구라 커밋 전 대표 승인. 좁은 화면(모바일 세로)에서 한 줄에 다 안 들어가면 버튼 줄을 아래로 내려 **두 줄**까지 허용하되 제목·버튼을 숨기지 마라 — 실제 높이를 보고하라. | ✅ 승인 (본문 2026-09-20 · 머리말 줄 2026-10-05 대표) |
| 2 | **모바일 가로 비표시** — 모바일 가로(폭 < 1024 · 가로가 세로보다 김 = `stageMode` `landscape`)에서는 동의 바를 보이지 않고, 세로로 돌아오면 보인다. 그동안은 **필수 쿠키만** 쓴다 — 동의를 미루는 것이지 가정하는 것이 아니다(R2). 티오는 법률가가 아니다 — 수익화 전 법무 검토(G-LEGAL-1) 때 함께 본다. | ✅ 승인 (2026-09-20 대표) |
| 3 | 동의 바 문구 변경 없음 | ✅ 범위 확정 (2026-09-20 대표) |
| 4 | **쿠키 이벤트 — 분석 동의 후에만** — **의도 먼저**: 몇 명이 분석까지 허용하는지 GA4(구글 애널리틱스)에서 보되, 동의 전에는 아무것도 보내지 않는다(R2). 넣는 것: `cookie_accept_all {categories:'all'}`("모두 허용" 직후) · `cookie_save {functional, analytics, marketing}`(설정 창 저장 시, 분석이 켜진 경우만 실제 기록) · `cookie_customize_open {}`(설정 창 열기 — 이미 분석 동의한 팬만 기록) · `cookie_reject {categories:'essential_only'}`(호출은 넣되 분석 동의가 없으므로 사실상 기록 0 — 예전에 분석을 허용했던 팬이 바꿀 때만 기록될 수 있음, 그 순서도 테스트로 정하라). **넣지 않는 것**: `cookie_banner_view`(동의 바가 보이는 순간은 정의상 동의 전이라 기록 불가). *이 결정이 정하지 않는 것*: 동의율 정확 측정(허용한 사람만 세어지므로 비율로 읽지 말 것) · 구글 동의 모드 도입(런칭 후 과제). | ✅ 결정 (2026-10-05 대표 — "동의한 뒤에만 기록되게 넣기") |
| 5 | **통계는 분석 동의 뒤로(일원화)** — **의도 먼저**: 동의하지 않은 방문자에게서 GA 쿠키·통계가 나가지 않게 한다(R2). *비용(대표 인지)*: 피치 화면 조회·카드 클릭·크라운 카드 창 열기 같은 숫자가 **분석을 허용한 사람만** 세어져 지금보다 작게 나온다 — 홍보 효과를 볼 때 "허용한 사람 기준"으로 읽는다. *이 결정이 정하지 않는 것*: 이벤트 종류·이름 · 모달 기본값 · 구글 동의 모드(런칭 후). | ✅ 결정 (2026-10-05 대표 — "이번에 같이 고쳐라") |
| 6 | **userPrefs es** — 화면 설정 규칙에 es 추가. 지금 쓰는 코드 없음 → 팬 화면 변화 없음. | ✅ 결정 (2026-10-05 대표) |
| — | `firebase deploy --only firestore:rules` (cookieConsents·userPrefs es 허용 반영) — 병합 후 | 사람 절차 — 대표 (명령은 티오가 한 줄씩 안내) |

## §10 참고 — 이 킥이 생긴 경위

ARENA-1 PR 1 운영 스모크(2026-09-20)에서 ①②③④가 한꺼번에 드러났다. ①②는 그 전부터 있던 결함이고, ③④는 무대·배너 자리가 생기면서 보이게 된 것이다. ⑤ 쿠키 이벤트 공백은 2026-10-04 GA4 이벤트 목록 정리 때 발견했다. 런칭 전 순서(D-36·D-43): E2E-1(끝) → CARD-FIX(끝) → **COOKIE-1** → NAV-1 → THUMB-1 → FONT-1 → ARENA-2 → 크라운 카드 새 디자인.

*초안 2026-09-20 Claude Code → v1.0 승인 반영 2026-09-20 티오 → v1.1 main 대조 · 2026-10-05 티오 (머리말 줄 접기 · 쿠키 이벤트 동의 후 기록) → **v1.2 · 2026-10-05 티오** (통계 동의 게이트 일원화 · userPrefs es — 대표 "이번에 같이")*
