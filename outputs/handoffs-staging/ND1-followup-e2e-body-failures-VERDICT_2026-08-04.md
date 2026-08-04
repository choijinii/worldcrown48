# 판정 보고 — C-1·G-1 E2E 본체 실패 (조사 완료)

| 항목 | 값 |
|---|---|
| 작성 | 2026-08-04 |
| 입력 | `ND1-followup-e2e-body-failures-2026-07-30.md` (조사 메모) |
| 증거 | run **C-1 `30546736137`** · **G-1 `30546736135`** (PR #49 head-SHA 해석 = 신뢰 가능) |
| 스코프 | 조사 전용. 앱·스펙 수정 없음, PR 없음 |
| 결과 | **실패 7건 / 근본원인 4개**. 메모의 "4건"은 실패 **테스트 케이스** 수를 과소·과대 혼재 계상 (아래 §0) |

---

## 0. 먼저 — 실패 목록 정정

메모는 4건으로 적었으나 실제 run 기준:

| run | 결과 | 내역 |
|---|---|---|
| G-1 `30546736135` | **3 failed / 4 passed** | `:100` · `:124` · **`:131`(메모 누락)** |
| C-1 `30546736137` | **4 failed / 2 passed** | `c1-anon-gate:127` · `c1-arena-flow:264` **×3 (320·375·414px 모두)** — 메모는 320px만 기재 |

근본원인은 4개다 (C-1 실패 4건은 **한 원인**).

---

## 1. G-1 `:100` — non-authenticated /admin → needs-signin card

### 판정: **(c) 전제 문제 — 테스트 하네스 결함**  (앱 정상)

**증거 — 실패 시점 렌더 DOM** (`error-context.md`, 3회 전부 동일):
```yaml
- banner:
  - button "Open user menu for Hyunjin Choi": Hyunjin Choi     ← 로그인 상태
- complementary "Admin sidebar":                               ← 대시보드가 렌더됨
  - text: WorldCrown48 ADMIN · BACKSTAGE
```
"비로그인 컨텍스트"라던 페이지가 **운영자(jounnamu12@gmail.com)로 로그인된 상태**였고, `/admin`은 정상적으로 대시보드를 렌더했다. gate-card가 안 뜬 게 아니라 **뜰 이유가 없었다.**

**원인:** `e2e/g1-admin-dashboard.spec.ts:101`
```ts
const ctx = await browser.newContext(); // no storageState → signed out   ← 이 주석이 거짓
```
Playwright의 `browser` fixture는 `newContext()`에 **config의 `use` 옵션을 상속시킨다.** `playwright.config.ts:use.storageState = "tests/.auth/user.json"` 이 그대로 적용된다.

**로컬 실증** (저장소와 동일한 Playwright **1.61.0**):
```
COOKIES_IN_FRESH_CONTEXT=[{"name":"probe","value":"LEAKED","domain":"example.com",...}]
```
`use.storageState`에만 넣은 쿠키가 `browser.newContext()`로 만든 "빈" 컨텍스트에 그대로 실렸다 → **가설 1(global-setup 인증 간섭) 확정.**

**권고 수정안** — 스펙만 수정, 앱 무변경. Vercel bypass 쿠키(`_vercel_jwt`)는 살리고 Firebase 인증(localStorage = `origins`)만 버린다:
```ts
const st = JSON.parse(readFileSync("tests/.auth/user.json", "utf8"));
const ctx = await browser.newContext({ storageState: { cookies: st.cookies, origins: [] } });
```
- 위치: `e2e/g1-admin-dashboard.spec.ts:100~106` · 규모 **~5줄**
- 주의: `origins`를 통째로 비우지 않고 `newContext()`만 고치면 bypass 쿠키까지 잃어 401 벽에 부딪힌다. 반대로 `storageState: undefined`도 같은 함정.
- 사후 확인: `AdminAuthGuardLight.tsx:111,131`이 `.gate-card[data-st="needs-signin"]`을 렌더하고, 익명 로그인도 signed-out으로 취급(파일 헤더 주석 L10)하므로 수정 후 green 기대.

---

## 2. G-1 `:124` — SiteMapSheet ☰ → Domain 6 live link  ★ 최우선 지정 건

### 판정: **(b) 스펙 노후 — 앱은 정상. Domain 6는 이미 live 링크다**

**증거 — 실패 시점 DOM:**
```yaml
- button "Open user menu for Hyunjin Choi" [expanded]:   ← 사용자 메뉴가 열렸다
- menu "User menu":
    - menuitem "Account Settings" / "Delete my data" / "Sign out"
```
**SiteMapSheet는 열리지도 않았다.** 스펙의 locator
```ts
page.getByRole("button", { name: /menu|메뉴|sitemap|☰/i }).first()
```
가 햄버거 버튼의 접근성 이름 **`"Open site map"`**(띄어쓰기 → `/sitemap/i` 불일치)을 못 잡고, 대신 `/menu/i`에 걸린 **`"Open user menu for …"`**를 `.first()`로 클릭했다. 즉 이 테스트는 **Domain 6의 live 여부를 한 번도 검증한 적이 없다.**

**앱은 정상 — Domain 6는 live:**
- `lib/layout/domains.ts:26` → `{ n: 6, name: "Admin Dashboard", desc: "Operations console", href: "/admin" }` (Coming soon 게이팅 없음)
- `components/layout/SiteMapSheet.tsx:63~72` → `href`가 있으면 `<Link href={d.href}>`, `href: null`인 도메인만 "Coming soon" span. Domain 4(Locker Room)만 `href: null`.
- 접근성 이름 = "Domain 6 Admin Dashboard Operations console" → `/Admin Dashboard/i`에 **매칭됨**. 시트만 열렸으면 통과했을 assertion이다.
- `lib/__tests__/layout/domains.test.ts`가 이미 "Locker Room(4)만 비활성" + "Domain 6 → /admin"을 단위 테스트로 고정하고 있고, 이 테스트는 green.

**언제 낡았나 (커밋 특정):**
- `aria-label="Open site map"`는 **PR #31 `4c39e52`**(A-1 The Pitch, 2026-06-29)에서 도입.
- g1 스펙은 **PR #32 `d4c7aba`**(2026-06-30)에서 작성 — `4c39e52`가 `d4c7aba`의 **조상임을 확인**(`git merge-base --is-ancestor` 통과).
- 즉 스펙은 **한 번도 main에 존재한 적 없는 햄버거 라벨**을 기준으로 작성되었고, **작성 이래 통과한 적이 없다.**

**권고 수정안:** `page.getByRole("button", { name: /site map/i })` (또는 `.wc-nav-burger`). **~1줄.**

> **최우선 지정 사유에 대한 사실 정정 (중요)**
> 이 red는 `/admin`·`/news` 접근 불가를 뜻하지 않는다 — locator 결함이다. 다만 조사 중 확인된 별건:
> **`/news` 라우트는 존재하지만(`app/news/page.tsx`, `app/news/[slug]`) `SITE_DOMAINS`에 항목이 없어 사이트맵·내비 어디에도 노출되지 않는다.**
> 인터넷신문 등록 심사에서 문제가 되는 건 `/news`의 **공개 발견 가능성**이므로, 이 스펙 수정과 무관한 **별도 판단 사항**으로 대표에게 올린다 (이번 스코프 밖 — 임의 변경하지 않음).

---

## 3. G-1 `:131` — Dev Nav Cmd+Shift+D → Admin Dashboard link  (메모 누락분)

### 판정: **(b) 스펙 노후·불완전 — 앱 정상**

**증거:** 단축키 입력 후 DOM에 Pitch 히어로만 있고 Dev Nav 시트가 없음. 에러는 `:124`와 동일한 `element(s) not found`.

**원인:** 단축키는 Dev Nav를 **켜기만** 한다 → `DevNavFab`(⚙️ FAB, `data-testid="dev-nav-fab"`)이 렌더될 뿐이고, `"Admin Dashboard"` 링크는 **FAB를 클릭해야 열리는 `DevNavSheet`** 안에 있다(`components/dev/DevNavFab.tsx:24,63` — `open` state로 시트 제어). 스펙이 그 클릭을 빠뜨렸다.
- 앱 로직 정상: `lib/dev/devNav.ts:69`에 `{ key:"admin", label:"Admin Dashboard", href:"/admin", enabled:true }` 존재, 단축키도 `metaKey || ctrlKey` + `code==="KeyD"`로 Linux 러너에서 정상 동작.
- **올바른 패턴이 이미 저장소에 있다:** `e2e/dev-nav.spec.ts:48` → `await page.getByTestId("dev-nav-fab").click();`

**권고 수정안:** 단축키와 링크 조회 사이에 FAB 클릭 1줄 추가. **~1줄.**

---

## 4. C-1 `c1-anon-gate:127` + `c1-arena-flow:264`(×3) — **원인 1개**

### 판정: **(a) 앱 회귀 — Arena 첫 진입이 client-side write에 무한 블로킹**
### 회귀 유발: **HF-2 (`1c4f59c`, 2026-07-06) — bracket seed 도입이 Arena 렌더 경로에 최초의 클라이언트 쓰기를 넣었다**

**증거 1 — 두 실패 모두 렌더가 로딩에서 멈춤** (`error-context.md`):
```yaml
- banner: [ ☰ , 로고 ]
- status: 불러오는 중…
```
`app/arena/[tournamentId]/page.tsx:152`
```ts
if (loading && !tournament) return <Center>불러오는 중…</Center>;
```
`voteStore`의 초기값은 `loading: false`(`lib/arena/voteStore.ts:60~67 EMPTY`)이므로, **이 화면은 `loadTournament`가 아직 in-flight일 때만** 나온다. 실패 시 캡처된 스크린샷도 동일(320px 다크 화면 중앙에 "불러오는 중…").

**증거 2 — trace 네트워크: Listen은 전부 정상, Write 단 1건이 끝나지 않음**
```
13:27:00.648  AUTH   POST  200  (101ms)
13:27:00.770  LISTEN POST  200  … (Listen 채널 약 20건, 전부 200 / 180~1000ms)
13:27:04.934  WRITE  POST   -1  (time -1)      ← 완료되지 않음
13:27:05.119  LISTEN GET   200  (183ms)
```
C-1 두 trace(`c1-anon-gate` retry1, `c1-arena-flow` 320px retry1) **모두 동일 패턴** — Write 채널 POST는 정확히 1건이고 끝내 완료되지 않았다.

**증거 3 — 멈춘 지점 특정.** `lib/arena/voteStore.ts:85~136`의 `loadTournament`는 순서대로
`tournaments` getDoc → `contestants` getDocs → `votes` getDocs → **`loadOrCreateBracketSeed`** 를 await한다.
- 앞의 read 3건이 성공했음이 확정된다 — 실패했다면 write 자체가 발행되지 않고 `catch`가 `error:"load-failed"`를 세팅해 **"토너먼트를 찾을 수 없어요"** 화면이 떴을 것이다(L133~134, L153~161). 그 화면이 아니다.
- 따라서 멈춘 지점은 **`lib/arena/bracketSeed.ts:51`의 `setDoc(bracket_seeds/{uid}_{tid})` 단 한 곳**이다.

**증거 4 — pass/fail이 "bracket seed 사전 존재 여부"와 정확히 일치** (6개 테스트, 재시도 포함 14회 시도):
| 테스트 | seed 사전 존재 | 결과 |
|---|---|---|
| `c1-arena-flow:204` refresh mid-round | ✅ `beforeAll`의 `seedBracketSeed()` | **✓ pass** |
| `c1-arena-flow:217` THE FINAL | ✅ 동일 | **✓ pass** |
| `c1-arena-flow:264` mobile 320/375/414 | ❌ `resetVoterProgress()`가 `bracket_seeds/…` 삭제(L~150) | **✘ ×3, 재시도 2회씩 전부** |
| `c1-anon-gate:127` | ❌ 이 스펙은 bracket seed를 **아예 시드하지 않음**(grep 확인) | **✘, 재시도 2회 전부** |

플레이크가 아니다. 클라이언트가 seed를 **직접 만들어야 하는 경우에만** 100% 실패한다.

**증거 5 — 룰 문제가 아니다.** `bracket_seeds`의 **read**(`getDoc`, 동일 룰 블록 `firestore.rules:229~239`)가 성공했으므로 해당 룰은 prod에 배포되어 있다. 또한 룰 거부는 `setDoc` 프라미스를 **reject**시키므로 → `catch` → `load-failed` → "찾을 수 없어요" 화면이 됐어야 한다. 관측된 건 **영구 로딩**이다.

**증거 6 — 증상이 로그에서 은폐돼 있었다.** `e2e/c1-arena-flow.spec.ts:196`이 `"Could not reach Cloud Firestore backend"` 콘솔 에러를 의도적으로 무시한다. Write 채널이 막혔을 때 나오는 바로 그 메시지다.

### 앱 측 결함 (수정 대상)
`loadOrCreateBracketSeed`는 **Arena 최초 렌더 경로에 놓인, 타임아웃도 폴백도 없는 블로킹 쓰기**다. Write 채널이 한 번 지연되면 Arena는 **"불러오는 중…"에서 영구 정지**하고 에러 표면조차 없다. 그리고 **모든 실제 Voter의 Tournament 첫 진입이 이 경로를 탄다.**

### 수정 전 반드시 가를 갈래 (시크릿 필요 — 이번 세션에서 불가)
- **(i) CI 러너 네트워크 한정**: Listen은 되고 Write 채널만 막힘 → prod는 무사. 그래도 앱 하드닝은 필요.
- **(ii) 환경 무관 재현**: **Tournament 첫 진입 P0 프로덕션 버그.**

**판별 실험(권고):** 대표 로컬(비-CI 네트워크)에서 C-1 시크릿을 걸고
`PREVIEW_URL=<현 프리뷰> npx playwright test e2e/c1-arena-flow.spec.ts -g "mobile 320"`
→ 로컬 pass + CI fail = (i) · 둘 다 fail = **(ii), 즉시 P0 격상**.

### 권고 수정 방향 (어느 갈래든 공통)
seed를 **첫 렌더의 블로커에서 제외**한다. 택1:
1. 로컬 생성 seed로 즉시 렌더 + `setDoc`은 백그라운드 영속화 (create-once 룰이 경합을 이미 방어)
2. `setDoc`에 타임아웃 레이스 + 폴백
3. seed 생성을 서버(`onVote`/callable)로 이관

규모 **~30~60줄 + 단위 테스트**. **앱 변경이므로 대표 승인 후 C-1 PR에서 진행.**

### ADR-0003 정합성 (모순 아님)
ADR-0003의 "WebChannel transport가 아니다"는 **읽기**에 대한 결론이고 지금도 유효하다(Listen 전부 200). 당시 앱은 이 경로에서 **클라이언트 쓰기를 하지 않았다** — 최초 쓰기는 HF-2(2026-07-06)가 넣었다. 즉 Write 채널은 그 검증 범위 밖이었다.

---

## 5. 과거 red는 증거로 쓰지 말 것 (frozen preview 확증)

`c1-e2e.yml` 이력: **마지막 green = 2026-06-30 `b0d57c4`**, 이후 2026-07-05부터 전부 red.
그러나 PR #49 이전 run은 고정 프리뷰를 봐서 **커밋 귀속이 불가**하다. 확증:
2026-07-06 run(`1c4f59c`, HF-2)의 `refresh mid-round` 실패 출력 —
```
Expected substring: "P7"          ← HF-2 시드 대진이 기대하는 값
Received string:    "P✓P21KR · FWVOTE LEFTP21"   ← HF-2 이전 코드의 순서 대진
```
그 프리뷰는 **HF-2 이전 번들을 서빙**하고 있었다. (부수적으로: 클라이언트 쓰기가 없던 그 버전은 **정상 렌더**됐다 — §4 주장을 뒷받침한다.)
단, `c1-anon-gate:127`은 **도입일(2026-07-05)부터 오늘까지 CI에서 한 번도 통과한 적이 없다.**

**신뢰 가능한 run은 `30546736137`/`30546736135` 둘뿐이다.**

---

## 6. 모듈별 PR 분리안

| PR | 모듈 | 내용 | 앱 변경 | 규모 | 상태 |
|---|---|---|---|---|---|
| **A** | G-1 | `e2e/g1-admin-dashboard.spec.ts` 3건: ① 쿠키만 남긴 컨텍스트 ② `/site map/i` locator ③ FAB 클릭 1줄 | **없음** | ~10줄 | **PR #51 오픈** (2026-08-04) — red→green 판정은 해당 PR의 G-1 E2E CI가 한다 |
| **B** | C-1 | bracket seed를 첫 렌더 비블로킹으로 (앱) + 기존 4개 실패 테스트가 RED→GREEN | **있음** | ~30~60줄 + 단위 테스트 | **대기 — §4 판별 실험 먼저** |

- PR A는 (b)/(c) 판정이라 **테스트만** 손대며, 3건 모두 "작성 이래 통과한 적 없는" 스펙 결함이다.
- PR B는 (a) 판정 — 이미 존재하는 실패 테스트 4건이 그대로 RED이며, 수정 후 GREEN이 완료 조건이다.
- 어느 쪽도 테스트 삭제·skip 없음. frozen preview 재도입 없음.

---

## 7. 별건 관찰 (스코프 밖 — 대표 판단 요청)

`/news`는 라우트로 존재하나(`app/news/page.tsx`, `app/news/[slug]/`) `lib/layout/domains.ts`의 `SITE_DOMAINS`에 없어 **사이트맵·내비 어디에서도 도달할 수 없다**. 인터넷신문 등록 심사와 연관될 수 있어 보고만 올린다. 이번 태스크에서 변경하지 않았다.

*© 2026 WorldCrown48 | 판정 보고 | CONFIDENTIAL*
