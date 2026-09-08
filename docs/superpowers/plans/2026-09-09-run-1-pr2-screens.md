# RUN-1 PR 2 — 화면·문구 + 게스트 정책 v2.1 + 마감 강제 복원 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 팬 화면이 회차(runIndex)를 이해하게 만들고, 게스트 정책 v2.1(하루 통틀어 3판 · 공유 개방 · 저장 잠금 · `isGuest` 기록)을 적용하며, PR 1에서 껐던 마감 강제를 "마감됐어요" 안내와 **한 쌍으로** 되살린다.

**Architecture:** 활성 회차는 `voteStore.loadTournament` 가 **단독으로** 정한다 — 게이트·화면·구독이 각자 읽으면 §9 함정 5가 클라이언트 안에서 재현된다. 판정은 전부 `lib/run/` 순수 모듈이고, `functions/scripts/copy-run.mjs` 가 그것을 `functions/src/_run/` 으로 미러링해 **서버와 클라이언트가 문자 그대로 같은 코드**를 돌린다. 화면은 순수 함수 `resolveActiveRun` 의 출력 한 개를 그린다.

**Tech Stack:** Next.js 14 App Router · TypeScript 5.5 · Zustand 5 · Firebase (Firestore + Cloud Functions v2) · vitest · CSS Modules + CSS 변수 (Tailwind·framer-motion **없음**) · npm

**Spec:** `outputs/HANDOFF_RUN-1_참가규칙v2.0_2026-09-03.md` (v1.1) — §3 Phase 2 · §4 AC 17개 · §5 DO/DON'T · §8 문구표 · §9 함정 12건 · §14 · §16
보조 정본: `outputs/참가규칙_정본v2.1_판Run_2026-09-07.html` §4 · `LANGUAGE.md` §1·§2·§7 · `marketing/00_strategy/EVENT_SPEC.md` v1.2

---

## Global Constraints

이 절의 요구는 **모든 태스크에 암묵적으로 포함된다.**

- **회차의 정본은 문서 "필드" `runIndex`** 다. 문서 id의 `_r{n}` 접미사는 키 충돌 방지용이고, 로직은 언제나 필드를 읽는다 (§5 DO 1).
- **문서 이름을 만드는 곳은 `lib/run/runDocId.ts` 하나뿐이다.** 어디서도 문자열을 직접 조합하지 않는다 (§3.0 B안 조건 1). 1회차는 접미사 없음 · 2회차부터 `_r{n}`.
- **문서 id를 `split('_')` 로 잘라 tournamentId를 복원하지 않는다** — 실제 슬러그가 `gen4_idol_48` 처럼 `_` 를 포함한다 (§9 함정 2). uid 추출(`[0]`)은 안전하다.
- **한도 판정은 서버가 최종**이고 클라이언트 게이트는 UX용이다. 둘은 **같은 순수 함수**를 돌린다 (§5 DO 2).
- **게스트 한도 숫자 3은 `GUEST_DAILY_RUN_LIMIT` 한 곳에서만** 정의한다 (§5 DO 3).
- **KST 날짜는 `lib/run/kstReset.ts` 의 `todayKST()` 하나로만** 센다. ❌ `new Date().toISOString().slice(0,10)` 신규 사용 금지 (§3.0 조건 1).
- 순수 함수는 **시계를 읽지 않는다** — `todayKST` · `nowMs` 를 주입받는다 (§3.0 조건 2).
- **`lib/run/*.ts` 는 import를 갖지 않거나 상대 경로 import만** 갖는다 (`@/` 금지, 브라우저 API 금지) — `copy-run.mjs` 가 functions로 복사한다. 새 파일을 만들면 **`copy-run.mjs` 의 `files` 배열에 반드시 추가**한다.
- **색은 토큰만** — 컴포넌트에 raw hex 금지, `var(--color-…)` 만 (CLAUDE.md 불변 원칙 #2-1, 가드 `npm run check:hex`).
- **새 색·새 컴포넌트 금지** (§5 DON'T 7). 기존 버튼 스타일을 재사용한다.
- **Arena UI 대수술 금지** (§5 DON'T 6) — 재입장 화면에 버튼·목록을 얹는 것까지가 범위.
- **`bracket_seeds` create-once 완화 금지** (§5 DON'T 4). 새 판은 새 문서 id로 만든다.
- **`firestore.rules` 의 `daily_participation` 블록을 지우지 않는다** — Phase 3(PR 3)이다.
- **`rankingAggregator` 집계 필터는 PR 3.** 이 PR은 `isGuest` **필드까지만**.
- **마이그레이션 스크립트 금지** (§5 DON'T 3). 0단계 데이터 정리는 예외였고 이미 끝났다(커밋 `c3a026c`).

### 금지어 (LANGUAGE.md §7 · 2026-09-07 "표" 낱말 금지 승격)

- 🚫 **"표"는 낱말 자체가 금지어다.** "게스트 표"·"내 표"·"1일 5표"·"46표"·"투표 무제한" 전부. 대체어 = **"선택"**. `votes`·`Vote`·`onVote` 는 DB·코드 내부 이름으로만 존치.
- 🚫 **"예측"·"배당"·"베팅"** 표현 금지.
- 화면 글에서 **'판'은 "참여 / N번 참여 / 참여 횟수"로 순화**한다 (표시 용어 층 v2.2). 시스템 용어 Run(판)은 코드·문서에서 그대로.
- **Tournament · Crown Card · Contestant · Champion 은 3언어 원문 그대로** (RULE 1).
- 게이트 명령 (Task 18에서 실행):
  ```bash
  grep -rn "5표\|46표\|투표 무제한" app lib components          # 0건이어야 한다
  grep -rn "한 표\|표가 \|표를 " lib/i18n/messages.ts components app \
    --include=*.ts --include=*.tsx \
    | grep -v "표시\|목표\|대표\|발표\|도표\|표기\|표준\|표현\|표본"   # 팬 노출 문구 0건
  ```

### 문구 (§8 대표 승인 최종본 — 한 글자도 임의 변경 금지)

Task 11이 이 표를 `lib/i18n/messages.ts` 에 넣고 **글자 단위 테스트로 고정**한다. 다른 태스크는 이 키를 참조만 한다. **표 밖의 새 문구가 필요하면 구현하지 말고 대표님께 승인 요청한다.**

| 키 | ko | en | es |
|---|---|---|---|
| `arena.vote.dailyLimit` | 이 Tournament는 오늘 5번 참여를 모두 하셨어요 (5/5) | You've played all 5 runs of this Tournament today (5/5) | Ya has jugado las 5 partidas de este Tournament hoy (5/5) |
| `arena.vote.dailyLimitSub` | 한국 시간 자정에 참여 횟수가 다시 채워져요. 다른 Tournament는 지금 바로 참여하실 수 있어요. | Your 5 runs reset at Seoul midnight. Other Tournaments are open right now. | Tus 5 partidas se reinician a medianoche de Seúl. Otros Tournaments están abiertos ahora. |
| `arena.run.playAgain` | 다시 참여 ({n}/{limit}) | Play again ({n}/{limit}) | Jugar otra vez ({n}/{limit}) |
| `arena.run.pastCards` | 이전 참여의 Crown Card | Your earlier Crown Cards | Tus Crown Cards anteriores |
| `arena.vote.rateLimited` | 조금 빠르게 고르고 계시네요. 몇 초만 쉬었다 이어가 주세요. | You're choosing quickly. Take a few seconds, then keep going. | Estás eligiendo muy rápido. Espera unos segundos y continúa. |
| `arena.run.deadlinePassed` | 이 Tournament는 마감됐어요. 다른 Tournament에 참여해 보세요. | This Tournament has closed. Try a new run in another Tournament. | Este Tournament ha cerrado. Empieza una nueva partida en otro Tournament. |
| `login.guest_limit.title` | 오늘의 서비스(3번 참여)를 모두 소진하셨어요. | You've used all 3 of today's free entries. | Has usado tus 3 participaciones gratis de hoy. |
| `login.guest_limit.sub` | 로그인하면 Tournament마다 하루 5번까지 참여 — 내 선택이 랭킹에 반영돼요. | Sign in for up to 5 entries a day in every Tournament — and your picks count in the Ranking. | Inicia sesión: hasta 5 participaciones al día en cada Tournament — y tus elecciones cuentan en el Ranking. |
| `arena.guest.welcome` | 로그인 없이 하루 3번까지 참여가 가능해요! | Join up to 3 times a day — no sign-in needed! | ¡Participa hasta 3 veces al día — sin iniciar sesión! |
| `arena.guest.remaining` | 오늘 남은 참여 가능 횟수는 : {n}판 · 저장하려면 로그인 | Entries left today: {n} · Sign in to save | Participaciones restantes hoy: {n} · Inicia sesión para guardar |
| `pitch.hero.sub` 뒷부분 | 오직 팬의 선택. 당신의 선택이 왕관의 주인을 만듭니다. | Pure fan choice. Your pick crowns the Champion. | Solo la elección de los fans. Tu elección corona al Champion. |

> **`{n}` · `{limit}` 은 `resolveMessage` 의 보간 토큰**이다(`lib/i18n/messages.ts` `interpolate`). 승인본의 `(n/5)` 는 로그인 5 · 게스트 3을 주입해 렌더한다 — **2026-09-08 대표 확정**(한국어 낱말은 승인본과 한 글자도 다르지 않고 숫자만 사실에 맞춘다).
> `pitch.hero.sub` 앞부분("48 Contestants. Five Rounds. …")은 3언어 그대로 두고 **"예측도, 배당도 없이 —" 구절만 3언어 모두 삭제**한다.

---

## File Structure

**신규 (순수 · `copy-run.mjs` 미러 대상)**
- `lib/run/deadline.ts` — 마감 판정. 서버는 admin Timestamp, 클라는 web Timestamp라 **ms 숫자로 좁혀야** 두 곳이 같은 코드를 돌린다.
- `lib/run/activeRun.ts` — 원시 사실 → 화면 상태 한 덩어리. 완주 화면·첫 진입 안내·버튼 활성이 전부 이 출력이다.

**신규 (순수 · 클라 전용)**
- `lib/crown/crownActions.ts` — v2.1 공유/저장 분리를 한 곳에 못박는다.

**신규 (테스트)**
- `lib/__tests__/run/deadline.test.ts` · `lib/__tests__/run/activeRun.test.ts` · `lib/__tests__/crown/crownActions.test.ts`
- `functions/src/__tests__/guestRunMirror.test.ts` — 미러본이 같은 답을 내는지

**수정 (순수)**
- `lib/run/guestRun.ts` — 한도 3 · `isContinue` · `runTournamentId`/`tournamentId` 제거
- `lib/voteGate.ts` — 판정표 전면 교체, `DAILY_PARTICIPATION_LIMIT`·`GUEST_RUN_TID_KEY`·`getGuestRunState`·`getDailyParticipation` 폐기
- `functions/src/core/planRunWrite.ts` — `guestRuns` 에서 `tournamentId` 제거
- `functions/src/core/voteRecord.ts` — `VoteInput.isGuest`
- `functions/src/core/linkRoundProgress.ts` — 판정 단위를 (tid) → (tid, runIndex)

**수정 (서버)**
- `functions/src/onVote.ts` — `RATE_LIMIT` 40 · `isGuest` 기록 · 게스트 게이트 재배선 · (Task 18) 마감 실판정
- `functions/src/linkSessionVote.ts` — `GUEST_RUN_INDEX` 제거, 회차 1..N 이관, `isGuest: false`

**수정 (클라)**
- `lib/arena/voteStore.ts` · `lib/arena/useRoundTransition.ts` · `app/arena/[tournamentId]/page.tsx` · `app/arena/[tournamentId]/champion/page.tsx`
- `components/auth/LoginModal.tsx` · `components/crown/{CrownCardModal,ShareActions,ShareMenu,LoginPromptBanner}.tsx` · `components/crown/crown.module.css`
- `lib/i18n/messages.ts` · `lib/voteErrorCodes.ts` · `functions/scripts/copy-run.mjs`

---

## Task 순서와 커밋 규율

순수 → 서버 → 문구 → 클라 → 계측 → **마감(맨 끝)**.

> ⛔ **Task 18이 맨 끝인 것은 우연이 아니다.** §14의 규칙 — *"막는 것과 왜 막혔는지 알려주는 것은 한 쌍이다. 강제는 반드시 그 문구·화면과 같은 PR에서 켠다."* 마감 **렌더링**까지 Task 18로 미뤄, 서버 강제를 켜는 그 커밋 안에 문구·화면이 함께 들어가게 했다. **화면 처리 없이 `deadlinePassed` 만 `true` 로 돌리는 커밋을 만들지 마라.**

---

### Task 1: 게스트 한도 v2.1 — 하루 통틀어 3판

**Files:**
- Modify: `lib/run/guestRun.ts` (전면 재작성)
- Test: `lib/__tests__/run/guestRun.test.ts` (전면 재작성)

**Interfaces:**
- Consumes: `effectiveRunsToday` from `./decideRun`
- Produces:
  ```ts
  export const GUEST_DAILY_RUN_LIMIT = 3;
  export type GuestRunDecision = { status: "allow" } | { status: "login_required" };
  export function decideGuestRun(args: {
    lastRunDate: string | null;
    runsToday: number;
    todayKST: string;
    isContinue: boolean;
    limit?: number;
  }): GuestRunDecision;
  ```

**왜 `tournamentId` 를 지우는가 (§16 실측 3):** `guest_runs` 는 "마지막 Tournament 하나"만 기억했다. 3판·복수 Tournament 구조에서는 **A 미완주 → B → C(3판 소진) → A로 돌아와 이어하기** 가 거부된다. 이어하기 판정은 그 Tournament의 `decideRun` 이 이미 내리므로(`continue`), 호출자가 그 결과를 `isContinue` 로 넘긴다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`lib/__tests__/run/guestRun.test.ts` 를 통째로 교체:

```ts
/**
 * decideGuestRun — 비로그인은 하루 **통틀어 3판** (§5 DO 3 · v2.1 2026-09-06 대표 확정).
 *
 * v2.0의 "하루 1판 + 그 Tournament만"을 대체한다. 판정에서 Tournament를 아예 보지 않는
 * 것이 이 개정의 핵심이다 — 한도는 대회를 가로지르고(대회 수가 늘어도 3판 고정), 이어하기는
 * 그 Tournament의 decideRun 이 이미 내린 답(`continue`)을 그대로 받는다(§16 실측 3).
 *
 * §9 함정 4: 게스트 uid는 브라우저마다 새로 생겨 사람 단위 상한이 없다. v2.1은 한도를 늘리는
 * 대신 **게스트의 선택을 랭킹에서 제외**해(PR 3) 조작 동기를 없앤다.
 */
import { describe, expect, it } from "vitest";
import { decideGuestRun, GUEST_DAILY_RUN_LIMIT } from "@/lib/run/guestRun";

const TODAY = "2026-09-09";
const YESTERDAY = "2026-09-08";

const base = {
  lastRunDate: null as string | null,
  runsToday: 0,
  todayKST: TODAY,
  isContinue: false,
};

describe("decideGuestRun — 하루 통틀어 3판", () => {
  it("① 한도 상수는 3이다 — 이 숫자는 여기 한 곳에만 있다", () => {
    expect(GUEST_DAILY_RUN_LIMIT).toBe(3);
  });

  it("② 오늘 아직 안 돌았으면 허용한다", () => {
    expect(decideGuestRun(base)).toEqual({ status: "allow" });
  });

  it("③ 오늘 1판·2판을 썼어도 새 판이 열린다", () => {
    for (const used of [1, 2]) {
      expect(
        decideGuestRun({ ...base, lastRunDate: TODAY, runsToday: used }),
      ).toEqual({ status: "allow" });
    }
  });

  it("④ 3판을 다 쓰면 4판째는 로그인을 요구한다 (AC 6)", () => {
    expect(
      decideGuestRun({ ...base, lastRunDate: TODAY, runsToday: 3 }),
    ).toEqual({ status: "login_required" });
  });

  it("⑤ 3판을 다 썼어도 미완주 판은 이어할 수 있다 — 한도와 무관 (AC 6)", () => {
    // A 미완주 → B → C 로 3판 소진 → A로 돌아옴. isContinue 가 그 사실을 나른다.
    expect(
      decideGuestRun({
        ...base, lastRunDate: TODAY, runsToday: 3, isContinue: true,
      }),
    ).toEqual({ status: "allow" });
  });

  it("⑥ 자정이 지나면 3판이 다시 채워진다 (AC 7)", () => {
    // 리셋이 없으면 게스트가 첫날 3판을 쓴 뒤 영영 막힌다.
    expect(
      decideGuestRun({ ...base, lastRunDate: YESTERDAY, runsToday: 3 }),
    ).toEqual({ status: "allow" });
  });

  it("⑦ Tournament를 판정에 쓰지 않는다 — 대회 수가 늘어도 3판 고정", () => {
    // 인자에 tournamentId 자리가 없다는 것 자체가 계약이다. 같은 입력이면 어느 대회에서
    // 불러도 같은 답이 나온다(§16 실측 3이 고친 바로 그 지점).
    const args = { ...base, lastRunDate: TODAY, runsToday: 2 };
    expect(decideGuestRun(args)).toEqual(decideGuestRun({ ...args }));
    expect(Object.keys(args)).not.toContain("tournamentId");
    expect(Object.keys(args)).not.toContain("runTournamentId");
  });

  it("⑧ limit 을 주입해 경계를 확인할 수 있다", () => {
    expect(
      decideGuestRun({ ...base, lastRunDate: TODAY, runsToday: 1, limit: 1 }),
    ).toEqual({ status: "login_required" });
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npx vitest run lib/__tests__/run/guestRun.test.ts`
Expected: FAIL — `GUEST_DAILY_RUN_LIMIT` 이 1이고 `decideGuestRun` 이 아직 `isContinue` 를 모른다.

- [ ] **Step 3: 구현한다**

`lib/run/guestRun.ts` 전문:

```ts
/**
 * 게스트 한도 — 비로그인은 하루 **통틀어 3판** (§5 DO 3 · v2.1 2026-09-06 대표 확정).
 *
 * Tournament를 가로지르는 값이라 Tournament별 문서로는 못 센다 → `guest_runs/{uid}` 하나로 센다.
 * (회차 번호 자체는 게스트도 `tournament_runs` 에서 받는다 — 설계서 §1.4. 같은 브라우저의
 * 익명 계정은 유지되므로 내일 같은 Tournament를 또 돌면 그건 2회차다.)
 *
 * **v2.1에서 Tournament를 판정에서 뺐다 (§16 실측 3).** v2.0은 `guest_runs.tournamentId` 로
 * "마지막에 돌던 대회"를 기억해 이어하기를 판정했는데, 3판·복수 대회 구조에서는
 * A 미완주 → B → C(3판 소진) → A 이어하기가 거부된다. 이어하기는 그 Tournament의
 * `decideRun` 이 이미 `continue` 로 답하므로, 호출자가 그것을 `isContinue` 로 넘긴다.
 *
 * 자정 리셋은 `tournament_runs` 와 문자 그대로 같은 방식이다(읽을 때 날짜 비교) — §3.0 조건 3.
 * 날짜를 빠뜨리면 두 방향 모두 사고다: 리셋이 없으면 게스트가 영원히 막히고, 한도를 안 세면
 * 무제한이 되어 §9 함정 4(게스트 uid는 브라우저마다 새로 생긴다)로 직행한다.
 *
 * ⚠️ 이 파일은 `functions/src/_run/` 로 복사되므로 상대 경로 import만 가진다.
 */
import { effectiveRunsToday } from "./decideRun";

/** 비로그인 Voter가 하루(KST) 통틀어 돌 수 있는 판 수. **이 숫자는 여기에만 있다** (§5 DO 3). */
export const GUEST_DAILY_RUN_LIMIT = 3;

export type GuestRunDecision =
  | { status: "allow" }
  | { status: "login_required" };

export function decideGuestRun(args: {
  lastRunDate: string | null;
  runsToday: number;
  todayKST: string;
  /** 그 Tournament의 `decideRun` 결과가 `continue` 인가 — 이어하기는 한도를 안 쓴다. */
  isContinue: boolean;
  limit?: number;
}): GuestRunDecision {
  const {
    lastRunDate,
    runsToday,
    todayKST,
    isContinue,
    limit = GUEST_DAILY_RUN_LIMIT,
  } = args;

  // ① 진행 중인 판은 한도와 무관하게 이어한다. 3판을 다 쓴 뒤 미완주 대회로 돌아와도 마찬가지다.
  if (isContinue) return { status: "allow" };

  // ② 오늘의 판이 남아 있는가. 날짜가 오늘이 아니면 그날 값은 없는 것으로 읽는다(AC 7).
  if (effectiveRunsToday({ lastRunDate, runsToday, todayKST }) < limit) {
    return { status: "allow" };
  }

  // ③ 소진. 막히는 모든 경우가 같은 이유라 화면 문구도 하나(login.guest_limit)로 묶인다.
  return { status: "login_required" };
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `npx vitest run lib/__tests__/run/guestRun.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/run/guestRun.ts lib/__tests__/run/guestRun.test.ts
git commit -m "feat(run-1): 게스트 한도 1판 → 하루 통틀어 3판 (v2.1)"
```

---

### Task 2: 마감 판정 순수 모듈

**Files:**
- Create: `lib/run/deadline.ts`
- Create: `lib/__tests__/run/deadline.test.ts`
- Modify: `functions/scripts/copy-run.mjs` (`files` 배열에 `deadline.ts` 추가)

**Interfaces:**
- Produces:
  ```ts
  export function toDeadlineMs(value: unknown): number | null;
  export function isDeadlinePassed(deadlineMs: number | null, nowMs: number): boolean;
  ```

**왜 ms 숫자로 좁히는가:** 서버는 admin SDK Timestamp, 클라이언트는 web SDK Timestamp다. 타입이 달라 같은 코드를 못 돌린다 — **ms 하나로 좁히면** 두 곳이 문자 그대로 같은 판정을 한다(§9 함정 5). AC 9는 "유지"가 아니라 **신규 구현**이다(§9 함정 12: 마감 검사가 투표 경로에 아예 없었다).

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
/**
 * 마감(Tournament Deadline) 판정 — AC 9·16.
 *
 * §9 함정 12: `tournamentDeadline` 은 랭킹·Pitch 등 7개 파일에서 쓰이지만 Arena 진입과
 * onVote 에는 없었다. 마감 강제는 신규 구현이고, 2026-09-06 P0의 원인은 그 강제를 설명하는
 * 화면이 없었던 것이다(§14) — 판정 자체는 여기서 단순해야 한다.
 *
 * 값이 없으면 "마감 아님"이다. 0단계에서 마감 없는 대회를 전부 숨겼지만 코드는 방어한다.
 */
import { describe, expect, it } from "vitest";
import { isDeadlinePassed, toDeadlineMs } from "@/lib/run/deadline";

const NOW = Date.UTC(2026, 8, 9, 3, 0, 0); // 2026-09-09 12:00 KST

describe("toDeadlineMs — 세 가지 표현을 하나로 좁힌다", () => {
  it("Firestore Timestamp(admin·web 공통 toMillis)를 읽는다", () => {
    expect(toDeadlineMs({ toMillis: () => 1234 })).toBe(1234);
  });

  it("Date 를 읽는다", () => {
    const d = new Date(NOW);
    expect(toDeadlineMs(d)).toBe(NOW);
  });

  it("숫자를 그대로 읽는다", () => {
    expect(toDeadlineMs(NOW)).toBe(NOW);
  });

  it("없거나 모르는 값은 null — 마감 없음으로 읽힌다", () => {
    expect(toDeadlineMs(null)).toBeNull();
    expect(toDeadlineMs(undefined)).toBeNull();
    expect(toDeadlineMs("2026-11-30")).toBeNull();
    expect(toDeadlineMs({})).toBeNull();
  });
});

describe("isDeadlinePassed", () => {
  it("마감이 지났으면 true", () => {
    expect(isDeadlinePassed(NOW - 1, NOW)).toBe(true);
  });

  it("마감이 남았으면 false", () => {
    expect(isDeadlinePassed(NOW + 1, NOW)).toBe(false);
  });

  it("정확히 같은 순간은 아직 마감이 아니다 — 경계는 열려 있다", () => {
    expect(isDeadlinePassed(NOW, NOW)).toBe(false);
  });

  it("마감이 없으면(null) 절대 막지 않는다", () => {
    // 0단계에서 마감 없는 대회를 숨겼지만, 코드가 데이터를 믿고 막으면 그게 다음 P0다.
    expect(isDeadlinePassed(null, NOW)).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/__tests__/run/deadline.test.ts`
Expected: FAIL — `Cannot find module '@/lib/run/deadline'`

- [ ] **Step 3: 구현**

`lib/run/deadline.ts`:

```ts
/**
 * Tournament Deadline 판정 (AC 9·16) — 클라이언트와 서버가 **같은 코드**를 돌린다.
 *
 * 서버는 admin SDK Timestamp, 클라이언트는 web SDK Timestamp라 타입이 다르다. 그래서 판정을
 * **ms 숫자 하나**로 좁힌다 — 두 SDK의 Timestamp가 공통으로 갖는 `toMillis()` 만 쓰면
 * 나머지는 같은 함수가 처리한다(§9 함정 5).
 *
 * §9 함정 12: 마감 검사는 투표 경로에 **존재하지 않았다.** AC 9는 "기존 원칙 유지"가 아니라
 * 신규 구현이다. 2026-09-06 P0는 이 강제를 설명하는 화면이 없어서 났다(§14) — 판정은 단순하게,
 * 설명은 화면에서.
 *
 * ⚠️ 이 파일은 `functions/src/_run/` 로 복사되므로 import를 가지지 않는다.
 */

/** Firestore Timestamp | Date | number → ms. 그 밖의 값은 **마감 없음**(null)으로 읽는다. */
export function toDeadlineMs(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === "object" && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    const ms = (value as { toMillis: () => number }).toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

/**
 * 마감이 지났는가. **마감이 없으면 절대 막지 않는다.**
 *
 * 경계(`deadlineMs === nowMs`)는 아직 마감이 아니다 — 마감 시각 정각에 고르는 팬을 끊지 않는다.
 */
export function isDeadlinePassed(deadlineMs: number | null, nowMs: number): boolean {
  return deadlineMs !== null && deadlineMs < nowMs;
}
```

- [ ] **Step 4: `copy-run.mjs` 에 등록한다**

`functions/scripts/copy-run.mjs` 의 `files` 배열을 고친다. **이걸 빠뜨리면 functions 빌드가 깨진다** (`_run/deadline` 을 못 찾는다):

```js
const files = ["kstReset.ts", "runDocId.ts", "decideRun.ts", "guestRun.ts", "deadline.ts"];
```

- [ ] **Step 5: 통과 확인 + functions 빌드**

```bash
npx vitest run lib/__tests__/run/deadline.test.ts   # PASS (8 tests)
cd functions && npm run build && cd ..              # copy-run 이 5개를 복사하고 tsc 통과
```

- [ ] **Step 6: 커밋**

```bash
git add lib/run/deadline.ts lib/__tests__/run/deadline.test.ts functions/scripts/copy-run.mjs
git commit -m "feat(run-1): 마감 판정 순수 모듈 — 클라·서버 공용 (AC 9)"
```

---

### Task 3: 화면 상태 순수 함수 `resolveActiveRun`

**Files:**
- Create: `lib/run/activeRun.ts`
- Create: `lib/__tests__/run/activeRun.test.ts`
- Modify: `functions/scripts/copy-run.mjs` (`files` 배열에 `activeRun.ts` 추가)

**Interfaces:**
- Consumes: `decideRun` · `normalizeRunIndex` · `effectiveRunsToday` · `DAILY_RUN_LIMIT` from `./decideRun`; `decideGuestRun` · `GUEST_DAILY_RUN_LIMIT` from `./guestRun`
- Produces:
  ```ts
  export type ArenaRunScreen =
    | "play" | "complete" | "daily_limit" | "guest_limit" | "deadline_passed";
  export interface ActiveRunFacts {
    runIndex: number; legacyRunExists: boolean;
    lastRunDate: string | null; runsToday: number;
    currentRunComplete: boolean; deadlinePassed: boolean; todayKST: string;
    isAnonymous: boolean;
    guestLastRunDate: string | null; guestRunsToday: number;
  }
  export interface ActiveRunState {
    screen: ArenaRunScreen;
    displayRunIndex: number;
    nextRunIndex: number;
    runsToday: number;
    limit: number;
    canPlayAgain: boolean;
    blockedReason: "daily_limit" | "guest_limit" | "deadline_passed" | null;
  }
  export function resolveActiveRun(facts: ActiveRunFacts): ActiveRunState;
  ```

**이 함수가 화면의 전부다.** 완주 화면·첫 진입 안내·[다시 참여] 활성 여부·표시할 숫자가 모두 여기서 나온다. 페이지에 분기를 흩뿌리면 §9 함정 5가 클라이언트 안에서 재현된다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
/**
 * resolveActiveRun — 아레나 화면이 그릴 상태 한 덩어리 (AC 1·2·6·7·8·9·16).
 *
 * 게이트·화면·구독이 각자 회차를 판정하면 §9 함정 5(두 판정이 어긋나면 P0)가 클라이언트
 * 안에서 재현된다. 그래서 판정은 여기 하나뿐이고 페이지는 출력을 그리기만 한다.
 *
 * 시계를 읽지 않는다 — `todayKST`·`deadlinePassed` 를 주입받는다(§3.0 조건 2).
 */
import { describe, expect, it } from "vitest";
import { resolveActiveRun, type ActiveRunFacts } from "@/lib/run/activeRun";

const TODAY = "2026-09-09";
const YESTERDAY = "2026-09-08";

const base: ActiveRunFacts = {
  runIndex: 0,
  legacyRunExists: false,
  lastRunDate: null,
  runsToday: 0,
  currentRunComplete: false,
  deadlinePassed: false,
  todayKST: TODAY,
  isAnonymous: false,
  guestLastRunDate: null,
  guestRunsToday: 0,
};

describe("첫 진입 · 이어하기", () => {
  it("한 판도 안 돈 팬은 1회차를 시작한다", () => {
    const s = resolveActiveRun(base);
    expect(s.screen).toBe("play");
    expect(s.displayRunIndex).toBe(1);
    expect(s.runsToday).toBe(0);
    expect(s.limit).toBe(5);
  });

  it("미완주 판은 그 회차를 이어한다 — 새 판이 아니다 (AC 8)", () => {
    const s = resolveActiveRun({
      ...base, runIndex: 3, lastRunDate: TODAY, runsToday: 3, currentRunComplete: false,
    });
    expect(s.screen).toBe("play");
    expect(s.displayRunIndex).toBe(3);
  });

  it("옛 문서(회차 필드 없음)를 가진 계정은 1회차로 집는다 (AC 11)", () => {
    // 폴백 분기가 아니라 §3.0 B안의 구조 — 접미사 없는 옛 문서가 곧 1회차 문서다.
    const s = resolveActiveRun({
      ...base, runIndex: 0, legacyRunExists: true, currentRunComplete: false,
    });
    expect(s.displayRunIndex).toBe(1);
    expect(s.screen).toBe("play");
  });
});

describe("완주 화면 (AC 1·4·5)", () => {
  it("완주하면 그 회차의 카드를 보여주고 다음 판을 열어 준다", () => {
    const s = resolveActiveRun({
      ...base, runIndex: 1, lastRunDate: TODAY, runsToday: 1, currentRunComplete: true,
    });
    expect(s.screen).toBe("complete");
    expect(s.displayRunIndex).toBe(1);
    expect(s.nextRunIndex).toBe(2);
    expect(s.canPlayAgain).toBe(true);
    expect(s.runsToday).toBe(1);
    expect(s.blockedReason).toBeNull();
  });

  it("5판을 소진하면 완주 화면은 남고 버튼만 잠긴다 (AC 1)", () => {
    const s = resolveActiveRun({
      ...base, runIndex: 5, lastRunDate: TODAY, runsToday: 5, currentRunComplete: true,
    });
    expect(s.screen).toBe("complete");
    expect(s.canPlayAgain).toBe(false);
    expect(s.blockedReason).toBe("daily_limit");
    expect(s.runsToday).toBe(5);
  });

  it("자정이 지나면 5판이 다시 채워진다 (AC 7)", () => {
    const s = resolveActiveRun({
      ...base, runIndex: 5, lastRunDate: YESTERDAY, runsToday: 5, currentRunComplete: true,
    });
    expect(s.canPlayAgain).toBe(true);
    expect(s.runsToday).toBe(0);
    expect(s.nextRunIndex).toBe(6); // 회차는 누적이라 되감기지 않는다
  });
});

describe("마감 (AC 9·16)", () => {
  it("한 판도 안 돈 팬의 첫 진입에도 안내가 뜬다 (AC 16)", () => {
    const s = resolveActiveRun({ ...base, deadlinePassed: true });
    expect(s.screen).toBe("deadline_passed");
  });

  it("진행 중인 판은 마감돼도 이어갈 수 있다 (AC 9)", () => {
    const s = resolveActiveRun({
      ...base, runIndex: 2, currentRunComplete: false, deadlinePassed: true,
    });
    expect(s.screen).toBe("play");
    expect(s.displayRunIndex).toBe(2);
  });

  it("마감된 대회의 완주 화면은 남고 [다시 참여]만 잠긴다", () => {
    const s = resolveActiveRun({
      ...base, runIndex: 1, lastRunDate: TODAY, runsToday: 1,
      currentRunComplete: true, deadlinePassed: true,
    });
    expect(s.screen).toBe("complete");
    expect(s.canPlayAgain).toBe(false);
    expect(s.blockedReason).toBe("deadline_passed");
  });
});

describe("게스트 (AC 6·17)", () => {
  const guest = { ...base, isAnonymous: true };

  it("게스트 한도는 3이다", () => {
    expect(resolveActiveRun(guest).limit).toBe(3);
  });

  it("게스트는 대회를 가로질러 센다 — 이 대회 0판이어도 오늘 3판이면 막힌다", () => {
    const s = resolveActiveRun({
      ...guest, guestLastRunDate: TODAY, guestRunsToday: 3,
    });
    expect(s.screen).toBe("guest_limit");
    expect(s.runsToday).toBe(3);
  });

  it("3판을 다 써도 미완주 판은 이어할 수 있다 (AC 6)", () => {
    const s = resolveActiveRun({
      ...guest, runIndex: 1, currentRunComplete: false,
      guestLastRunDate: TODAY, guestRunsToday: 3,
    });
    expect(s.screen).toBe("play");
  });

  it("완주 후 남은 판이 있으면 다시 참여할 수 있다", () => {
    const s = resolveActiveRun({
      ...guest, runIndex: 1, currentRunComplete: true,
      lastRunDate: TODAY, runsToday: 1,
      guestLastRunDate: TODAY, guestRunsToday: 1,
    });
    expect(s.screen).toBe("complete");
    expect(s.canPlayAgain).toBe(true);
    expect(s.runsToday).toBe(1);
    expect(s.limit).toBe(3);
  });

  it("3판을 쓰고 완주한 게스트는 버튼이 잠기고 이유가 guest_limit 이다", () => {
    const s = resolveActiveRun({
      ...guest, runIndex: 1, currentRunComplete: true,
      lastRunDate: TODAY, runsToday: 1,
      guestLastRunDate: TODAY, guestRunsToday: 3,
    });
    expect(s.screen).toBe("complete");
    expect(s.canPlayAgain).toBe(false);
    expect(s.blockedReason).toBe("guest_limit");
  });

  it("로그인 팬은 게스트 원장을 보지 않는다", () => {
    const s = resolveActiveRun({
      ...base, guestLastRunDate: TODAY, guestRunsToday: 3,
    });
    expect(s.screen).toBe("play");
    expect(s.limit).toBe(5);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/__tests__/run/activeRun.test.ts`
Expected: FAIL — `Cannot find module '@/lib/run/activeRun'`

- [ ] **Step 3: 구현**

`lib/run/activeRun.ts`:

```ts
/**
 * resolveActiveRun — 아레나 화면이 그릴 상태를 한 번에 정한다 (AC 1·2·6·7·8·9·16).
 *
 * 왜 한 곳인가. 게이트(`voteGate`)·화면(`page.tsx`)·구독(`useRoundTransition`)·
 * 씨앗(`bracketSeed`)이 전부 회차를 알아야 한다. 각자 판정하면 §9 함정 5(두 판정이 어긋나면
 * P0)가 클라이언트 내부에서 재현된다 — 게이트는 2회차라고 믿는데 화면은 1회차를 그리는 식.
 * 그래서 판정은 여기 하나뿐이고, `voteStore` 가 이 출력을 실어 나르며, 페이지는 그리기만 한다.
 *
 * 서버와의 정합은 `decideRun`·`decideGuestRun` 을 **그대로 호출**해서 얻는다. 이 파일은 그 둘을
 * 조합해 "화면이 필요로 하는 모양"으로 바꾸는 층이지, 새로운 판정을 만들지 않는다.
 *
 * ⚠️ 이 파일은 `functions/src/_run/` 로 복사되므로 상대 경로 import만 가진다.
 */
import {
  DAILY_RUN_LIMIT,
  decideRun,
  effectiveRunsToday,
  normalizeRunIndex,
} from "./decideRun";
import { decideGuestRun, GUEST_DAILY_RUN_LIMIT } from "./guestRun";

export type ArenaRunScreen =
  | "play"
  | "complete"
  | "daily_limit"
  | "guest_limit"
  | "deadline_passed";

export interface ActiveRunFacts {
  /** `tournament_runs.runIndex` (문서가 없으면 0). */
  runIndex: number;
  /** 접미사 없는 옛 `roundProgress` 가 있는가 — 있으면 그게 1회차다 (AC 11). */
  legacyRunExists: boolean;
  lastRunDate: string | null;
  runsToday: number;
  /** `roundProgress/{uid}_{tid}[_r{n}]`.complete === true */
  currentRunComplete: boolean;
  deadlinePassed: boolean;
  todayKST: string;
  isAnonymous: boolean;
  /** `guest_runs/{uid}` — 게스트만 쓴다. 대회를 가로지른다. */
  guestLastRunDate: string | null;
  guestRunsToday: number;
}

export interface ActiveRunState {
  screen: ArenaRunScreen;
  /** 화면이 그릴 회차 — votes 필터 · 씨앗 · roundProgress 구독이 전부 이 값을 쓴다. */
  displayRunIndex: number;
  /** [다시 참여] 가 열 회차. */
  nextRunIndex: number;
  /** 팬에게 보이는 숫자 n — 오늘 쓴 판 수(자정 리셋 반영). 누적 회차가 아니다. */
  runsToday: number;
  /** 로그인 5 · 게스트 3. */
  limit: number;
  canPlayAgain: boolean;
  blockedReason: "daily_limit" | "guest_limit" | "deadline_passed" | null;
}

export function resolveActiveRun(facts: ActiveRunFacts): ActiveRunState {
  const runIndex = normalizeRunIndex({
    runIndex: facts.runIndex,
    legacyRunExists: facts.legacyRunExists,
  });

  const runDecision = decideRun({
    runIndex,
    lastRunDate: facts.lastRunDate,
    runsToday: facts.runsToday,
    todayKST: facts.todayKST,
    currentRunComplete: facts.currentRunComplete,
    deadlinePassed: facts.deadlinePassed,
  });
  const isContinue = runDecision.status === "continue";

  // 게스트 한도는 이 Tournament가 아니라 `guest_runs` 로 센다 — 대회를 가로지른다.
  const guestDecision = facts.isAnonymous
    ? decideGuestRun({
        lastRunDate: facts.guestLastRunDate,
        runsToday: facts.guestRunsToday,
        todayKST: facts.todayKST,
        isContinue,
      })
    : ({ status: "allow" } as const);
  const guestBlocked = guestDecision.status === "login_required";

  const limit = facts.isAnonymous ? GUEST_DAILY_RUN_LIMIT : DAILY_RUN_LIMIT;
  const runsToday = effectiveRunsToday(
    facts.isAnonymous
      ? {
          lastRunDate: facts.guestLastRunDate,
          runsToday: facts.guestRunsToday,
          todayKST: facts.todayKST,
        }
      : {
          lastRunDate: facts.lastRunDate,
          runsToday: facts.runsToday,
          todayKST: facts.todayKST,
        },
  );

  // 회차 0(= 아직 한 판도 안 돈 계정)도 화면은 1회차를 그린다. 실제 카운트는 첫 선택 때
  // 서버가 한다(§5 DO 4의 구현 정의) — 들어왔다 안 고르고 나가면 아무것도 소모되지 않는다.
  const displayRunIndex = runIndex === 0 ? 1 : runIndex;
  const nextRunIndex = runIndex + 1;

  // 새 판을 열 수 있는가 — 마감·한도·게스트 한도가 모두 통과해야 한다.
  const canPlayAgain = runDecision.status === "new_run" && !guestBlocked;
  const blockedReason: ActiveRunState["blockedReason"] = canPlayAgain
    ? null
    : guestBlocked
      ? "guest_limit"
      : runDecision.status === "deadline_passed"
        ? "deadline_passed"
        : runDecision.status === "limit_reached"
          ? "daily_limit"
          : null;

  const common = { displayRunIndex, nextRunIndex, runsToday, limit, canPlayAgain, blockedReason };

  // ① 진행 중인 판이 최우선이다 — 마감도 한도도 이걸 막지 않는다(AC 8·9).
  if (isContinue) return { ...common, screen: "play", canPlayAgain: false, blockedReason: null };

  // ② 완주한 판이 있으면 그 카드를 계속 보여준다. 막힘은 버튼에만 반영한다 —
  //    완주 화면을 차단 화면으로 바꿔 버리면 팬이 방금 만든 Crown Card를 못 본다.
  if (runIndex > 0 && facts.currentRunComplete) return { ...common, screen: "complete" };

  // ③ 한 판도 안 돈(또는 카운트 전인) 팬에게는 막힌 이유를 화면으로 말한다.
  if (guestBlocked) return { ...common, screen: "guest_limit" };
  if (runDecision.status === "deadline_passed") return { ...common, screen: "deadline_passed" };
  if (runDecision.status === "limit_reached") return { ...common, screen: "daily_limit" };

  return { ...common, screen: "play" };
}
```

- [ ] **Step 4: `copy-run.mjs` 에 등록**

```js
const files = ["kstReset.ts", "runDocId.ts", "decideRun.ts", "guestRun.ts", "deadline.ts", "activeRun.ts"];
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run lib/__tests__/run/activeRun.test.ts`
Expected: PASS (14 tests)

- [ ] **Step 6: 커밋**

```bash
git add lib/run/activeRun.ts lib/__tests__/run/activeRun.test.ts functions/scripts/copy-run.mjs
git commit -m "feat(run-1): 아레나 화면 상태 순수 함수 resolveActiveRun"
```

---

### Task 4: `planRunWrite` — `guestRuns` 에서 `tournamentId` 제거

**Files:**
- Modify: `functions/src/core/planRunWrite.ts`
- Test: `functions/src/__tests__/planRunWrite.test.ts`

**Interfaces:**
- Produces: `RunWritePlan.guestRuns: { runsToday: number; lastRunDate: string } | null`
- `planRunWrite(args)` 의 `tournamentId` 인자는 **더 이상 쓰이지 않으므로 제거**한다.

**왜:** v2.1에서 게스트 한도는 대회를 가로지른다. `guest_runs.tournamentId` 는 "마지막 대회 하나"만 기억해 §16 실측 3의 버그를 만든 필드다 — 판정에서 뺐으니 **쓰기에서도 뺀다.** 남겨 두면 다음 사람이 그 필드를 보고 다시 판정에 쓴다.

- [ ] **Step 1: 테스트를 고친다**

`functions/src/__tests__/planRunWrite.test.ts` 에서 `guestRuns` 를 검증하는 케이스를 아래로 교체하고, `planRunWrite` 호출의 `tournamentId` 인자를 지운다:

```ts
  it("새 판이면 게스트 원장에 판 수와 날짜만 쓴다 — Tournament는 기억하지 않는다 (v2.1)", () => {
    const plan = planRunWrite({
      decision: { status: "new_run", runIndex: 2 },
      todayKST: "2026-09-09",
      runsTodayBefore: 1,
      guestRunsTodayBefore: 2,
    });
    expect(plan.guestRuns).toEqual({ runsToday: 3, lastRunDate: "2026-09-09" });
    // §16 실측 3: 이 필드가 있으면 "마지막 대회 하나"로 이어하기를 판정하는 버그가 되살아난다.
    expect(plan.guestRuns).not.toHaveProperty("tournamentId");
  });

  it("이어하기는 아무것도 쓰지 않는다 (AC 8)", () => {
    const plan = planRunWrite({
      decision: { status: "continue", runIndex: 3 },
      todayKST: "2026-09-09",
    });
    expect(plan).toEqual({ runIndex: 3, tournamentRuns: null, guestRuns: null });
  });
```

- [ ] **Step 2: 실패 확인**

Run: `cd functions && npx vitest run src/__tests__/planRunWrite.test.ts`
Expected: FAIL — `guestRuns` 에 `tournamentId` 가 아직 있고, 인자 타입이 `tournamentId` 를 요구한다.

- [ ] **Step 3: 구현**

`functions/src/core/planRunWrite.ts` 에서:
1. `RunWritePlan.guestRuns` 타입을 `{ runsToday: number; lastRunDate: string } | null` 로.
2. `planRunWrite` 인자에서 `tournamentId: string` 를 제거하고 구조분해에서도 뺀다.
3. 반환의 `guestRuns` 에서 `tournamentId` 를 뺀다.
4. 파일 상단 주석에 한 줄 추가:

```
 * **v2.1 (2026-09-06)**: `guestRuns` 에서 `tournamentId` 를 뺐다. 게스트 한도가 대회를
 * 가로지르게 되면서 "마지막 대회 하나"를 기억할 이유가 사라졌고, 남겨 두면 다음 사람이
 * 그 필드로 이어하기를 판정해 §16 실측 3의 버그를 되살린다.
```

- [ ] **Step 4: 통과 확인**

Run: `cd functions && npx vitest run src/__tests__/planRunWrite.test.ts` → PASS
(이 시점에 `onVote.ts` 가 `tournamentId` 를 넘기고 있어 **tsc는 아직 깨진다** — Task 9가 고친다. 커밋은 해도 된다: 브랜치 중간 상태이고 CI는 PR 단위로 돈다.)

- [ ] **Step 5: 커밋**

```bash
git add functions/src/core/planRunWrite.ts functions/src/__tests__/planRunWrite.test.ts
git commit -m "refactor(run-1): guestRuns 에서 tournamentId 제거 (v2.1)"
```

---

### Task 5: `voteRecord` — vote 문서에 `isGuest`

**Files:**
- Modify: `functions/src/core/voteRecord.ts`
- Test: `functions/src/__tests__/voteRecord.test.ts`

**Interfaces:**
- Produces: `VoteInput` 에 `isGuest: boolean` 추가. `buildVoteDoc` 이 그대로 실어 반환한다.

**왜 PR 2인가 (§16 실측 1):** 랭킹 제외 자체는 PR 3이지만, **필드가 PR 2에 없으면 PR 2 이후 기록도 게스트인지 구분할 수 없다.** 판별은 서버가 `sign_in_provider === "anonymous"` 로 한다 — **클라이언트가 보낸 플래그가 아니다.**

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`functions/src/__tests__/voteRecord.test.ts` 에 추가:

```ts
describe("isGuest (v2.1) — 게스트의 선택을 랭킹에서 뺄 수 있게 하는 표식", () => {
  const valid = {
    userId: "u1",
    tournamentId: "gen4_idol_48",
    round: 1,
    matchId: "gen4_idol_48:r1:m0",
    contestantId: "c1",
    date: "2026-09-09",
    runIndex: 1,
  };

  it("익명이면 true 로 기록된다", () => {
    expect(buildVoteDoc({ ...valid, isGuest: true }).isGuest).toBe(true);
  });

  it("로그인 계정이면 false 로 기록된다", () => {
    expect(buildVoteDoc({ ...valid, isGuest: false }).isGuest).toBe(false);
  });

  it("불리언이 아니면 거부한다 — 이 필드는 랭킹 집계가 읽는다", () => {
    // 값이 흐릿하면 PR 3의 필터가 조용히 빗나간다. 문자열 "false" 같은 값을 막는다.
    expect(() =>
      buildVoteDoc({ ...valid, isGuest: "false" as unknown as boolean }),
    ).toThrow(/isGuest/);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd functions && npx vitest run src/__tests__/voteRecord.test.ts`
Expected: FAIL — `isGuest` 가 반환 문서에 없다(`undefined`).

- [ ] **Step 3: 구현**

`functions/src/core/voteRecord.ts`:

1. `VoteInput` 에 추가:
```ts
  /**
   * 이 선택이 익명(게스트) 계정에서 나왔는가 (v2.1).
   *
   * **서버가 `sign_in_provider === "anonymous"` 로 판정해 넣는다 — 클라이언트 플래그가 아니다.**
   * PR 3의 랭킹 집계가 이 필드로 게스트의 선택을 건너뛴다(소급 없음: 필드가 없는 옛 기록은
   * 그대로 집계된다). PR 2에 넣지 않으면 PR 2 이후 기록도 구분할 수 없다(§16 실측 1).
   */
  isGuest: boolean;
```

2. 구조분해와 검증에 추가:
```ts
  const { userId, tournamentId, round, matchId, contestantId, date, runIndex, isGuest } = input;
  ...
  if (typeof isGuest !== "boolean")
    throw new VoteValidationError("isGuest", `isGuest는 불리언이어야 합니다 (받음: ${typeof isGuest}).`);
```

3. 반환에 `isGuest` 추가.

- [ ] **Step 4: 통과 확인**

Run: `cd functions && npx vitest run src/__tests__/voteRecord.test.ts` → PASS

- [ ] **Step 5: 커밋**

```bash
git add functions/src/core/voteRecord.ts functions/src/__tests__/voteRecord.test.ts
git commit -m "feat(run-1): vote 문서에 isGuest 필드 (v2.1 · 랭킹 제외 준비)"
```

---

### Task 6: 클라이언트 게이트 `decideVoteGate` 전면 교체

**Files:**
- Modify: `lib/voteGate.ts`
- Test: `lib/__tests__/voteGate.test.ts` (전면 재작성)

**Interfaces:**
- Consumes: `RunDecision` from `@/lib/run/decideRun`; `GuestRunDecision` from `@/lib/run/guestRun`
- Produces:
  ```ts
  export type VoteGateResult =
    | { status: "allowed" }
    | { status: "login_required"; reason: "vote" | "share" | "guest_limit" }
    | { status: "daily_limit_reached" }
    | { status: "deadline_passed" };
  export function decideVoteGate(args: {
    isAnonymous: boolean;
    runDecision: RunDecision;
    guestDecision: GuestRunDecision;
  }): VoteGateResult;
  ```
- **폐기**: `DAILY_PARTICIPATION_LIMIT` · `GUEST_RUN_TID_KEY` · `markGuestRunTournament` · `getGuestRunState` · `getDailyParticipation` · `useVoteGate().onVoteSuccess`

**왜 판정을 인자로 받는가:** 게이트가 스스로 Firestore를 읽으면 `voteStore` 와 두 번 읽고 두 답이 갈린다. **읽기는 `voteStore` 가 한 번 하고**, 게이트는 그 판정을 받아 화면 언어로 번역만 한다. 이것이 §9 함정 5를 클라이언트 안에서 막는 방법이다.

**순서 규칙 (서버와 동일):** 게스트 한도가 먼저다. `onVote` 도 게스트 게이트를 `decideRun` 블록보다 먼저 던진다 — 두 곳의 우선순위가 다르면 화면과 서버가 다른 이유를 말한다.

- [ ] **Step 1: 테스트 전면 재작성**

`lib/__tests__/voteGate.test.ts` 를 통째로 교체:

```ts
/**
 * decideVoteGate — 클라이언트 게이트 (v2.1).
 *
 * HF-1의 "하루 새 대회 5개"(`daily_participation`)와 HF-3의 sessionStorage 마커는 v2.0/v2.1로
 * **폐기**됐다. 이제 게이트는 스스로 읽지 않는다 — `voteStore` 가 한 번 읽어 만든
 * `decideRun`·`decideGuestRun` 판정을 받아 화면 언어로 번역만 한다. 읽기가 두 곳이면 답도
 * 두 개가 되고, 그게 §9 함정 5다.
 *
 * 우선순위는 서버(`onVote`)와 같다: 게스트 한도 → 마감 → 일일 한도.
 */
import { describe, expect, it } from "vitest";
import { decideVoteGate } from "../voteGate";

const allowGuest = { status: "allow" } as const;
const blockGuest = { status: "login_required" } as const;

describe("로그인 팬", () => {
  it("새 판이면 통과", () => {
    expect(
      decideVoteGate({
        isAnonymous: false,
        runDecision: { status: "new_run", runIndex: 2 },
        guestDecision: allowGuest,
      }),
    ).toEqual({ status: "allowed" });
  });

  it("이어하기도 통과 — 한도를 쓰지 않는다 (AC 8)", () => {
    expect(
      decideVoteGate({
        isAnonymous: false,
        runDecision: { status: "continue", runIndex: 3 },
        guestDecision: allowGuest,
      }),
    ).toEqual({ status: "allowed" });
  });

  it("5판 소진이면 daily_limit_reached (AC 1)", () => {
    expect(
      decideVoteGate({
        isAnonymous: false,
        runDecision: { status: "limit_reached" },
        guestDecision: allowGuest,
      }),
    ).toEqual({ status: "daily_limit_reached" });
  });

  it("마감이면 deadline_passed (AC 9)", () => {
    expect(
      decideVoteGate({
        isAnonymous: false,
        runDecision: { status: "deadline_passed" },
        guestDecision: allowGuest,
      }),
    ).toEqual({ status: "deadline_passed" });
  });

  it("게스트 원장이 막혀 있어도 로그인 팬에게는 영향이 없다", () => {
    expect(
      decideVoteGate({
        isAnonymous: false,
        runDecision: { status: "new_run", runIndex: 1 },
        guestDecision: blockGuest,
      }),
    ).toEqual({ status: "allowed" });
  });
});

describe("게스트 (AC 6·17)", () => {
  it("3판을 다 쓰면 guest_limit 이유로 로그인을 요구한다", () => {
    // reason 이 "vote" 가 아니라 "guest_limit" 인 것이 핵심이다 — 왜 막혔는지를 말해야
    // Google 버튼이 있는 전환 화면으로 간다(2026-09-05 대표 확정).
    expect(
      decideVoteGate({
        isAnonymous: true,
        runDecision: { status: "new_run", runIndex: 1 },
        guestDecision: blockGuest,
      }),
    ).toEqual({ status: "login_required", reason: "guest_limit" });
  });

  it("게스트 한도가 마감보다 먼저다 — 서버와 같은 순서", () => {
    expect(
      decideVoteGate({
        isAnonymous: true,
        runDecision: { status: "deadline_passed" },
        guestDecision: blockGuest,
      }),
    ).toEqual({ status: "login_required", reason: "guest_limit" });
  });

  it("한도가 남았으면 통과", () => {
    expect(
      decideVoteGate({
        isAnonymous: true,
        runDecision: { status: "new_run", runIndex: 1 },
        guestDecision: allowGuest,
      }),
    ).toEqual({ status: "allowed" });
  });

  it("3판을 다 썼어도 이어하기는 통과 (AC 6)", () => {
    expect(
      decideVoteGate({
        isAnonymous: true,
        runDecision: { status: "continue", runIndex: 1 },
        guestDecision: allowGuest,
      }),
    ).toEqual({ status: "allowed" });
  });
});

describe("폐기된 HF-1/HF-3 표면", () => {
  it("옛 상수·헬퍼가 남아 있지 않다", async () => {
    // 남겨 두면 다음 사람이 "하루 새 대회 5개"로 되돌린다 (Stale-Doc Guard는 코드에도 적용).
    const mod = await import("../voteGate");
    for (const gone of [
      "DAILY_PARTICIPATION_LIMIT",
      "GUEST_RUN_TID_KEY",
      "markGuestRunTournament",
      "getGuestRunState",
      "getDailyParticipation",
    ]) {
      expect(mod, gone).not.toHaveProperty(gone);
    }
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/__tests__/voteGate.test.ts`
Expected: FAIL — 옛 시그니처(`user`/`participationCount` 등)를 요구한다.

- [ ] **Step 3: 구현**

`lib/voteGate.ts` 를 아래로 교체 (`useShareGate` 는 Task 16에서 다시 손대므로 지금은 그대로 둔다):

```ts
/**
 * Vote gate — The Arena의 클라이언트 인가 (RUN-1 v2.1).
 *
 * **게이트는 스스로 읽지 않는다.** `voteStore.loadTournament` 가 판 원장(`tournament_runs`)·
 * 게스트 원장(`guest_runs`)·진행(`roundProgress`)·마감을 한 번에 읽어 `decideRun`/
 * `decideGuestRun` 판정을 만들고, 이 함수는 그것을 화면 언어로 번역만 한다. 읽기가 두 곳이면
 * 답도 두 개가 되고 그게 §9 함정 5다(2026-07-05 사고가 정확히 이 유형이었다).
 *
 * 서버(`onVote`)가 최종 판정자이고 이건 UX용이다(§5 DO 2). 두 곳은 **같은 순수 함수**를
 * 돌리므로 같은 답에 도달한다.
 *
 * ⚠️ 폐기된 것들: HF-1의 `daily_participation`("하루 새 대회 5개")과 HF-3의 sessionStorage
 * 마커(`GUEST_RUN_TID_KEY`)·`getGuestRunState`. 규칙이 v2.0에서 **판(Run)** 기준으로 바뀌면서
 * 정의 자체가 폐기됐다(LANGUAGE.md §7 금지어).
 */
import { useCallback } from "react";
import type { RunDecision } from "@/lib/run/decideRun";
import type { GuestRunDecision } from "@/lib/run/guestRun";
import { useAuthStore } from "./authStore";

export type VoteGateResult =
  | { status: "allowed" }
  | { status: "login_required"; reason: "vote" | "share" | "guest_limit" }
  | { status: "daily_limit_reached" }
  | { status: "deadline_passed" };

/**
 * 순수 판정. 우선순위는 서버와 **같은 순서**여야 한다 — 화면과 서버가 다른 이유를 말하면
 * 팬은 둘 중 하나를 고장으로 읽는다.
 */
export function decideVoteGate(args: {
  isAnonymous: boolean;
  runDecision: RunDecision;
  guestDecision: GuestRunDecision;
}): VoteGateResult {
  const { isAnonymous, runDecision, guestDecision } = args;

  // ① 게스트 한도가 먼저다. 대회를 가로지르는 한도라 "이 대회의 사정"보다 상위다.
  //    막히는 모든 경우가 같은 이유(오늘 3판을 다 썼다)라 문구도 하나로 묶인다.
  if (isAnonymous && guestDecision.status === "login_required") {
    return { status: "login_required", reason: "guest_limit" };
  }
  // ② 이어하기는 마감·한도와 무관하게 통과한다(AC 8·9).
  if (runDecision.status === "continue" || runDecision.status === "new_run") {
    return { status: "allowed" };
  }
  if (runDecision.status === "deadline_passed") return { status: "deadline_passed" };
  return { status: "daily_limit_reached" };
}

/**
 * 공유 게이트 — v2.1에서 **공유는 게스트에게 열렸다.** 저장(다운로드)만 로그인이 필요하다.
 * 판정 자체는 `lib/crown/crownActions.ts` 에 있고 여기는 로그인 여부만 나른다.
 */
export function useShareGate() {
  const user = useAuthStore((s) => s.user);
  const isSignedIn = Boolean(user && !user.isAnonymous);
  const checkCanShare = useCallback((): VoteGateResult => {
    // 공유는 언제나 열려 있다. 저장 잠금은 Crown Card 화면이 crownActionState 로 처리한다.
    return { status: "allowed" };
  }, []);
  return { checkCanShare, isSignedIn };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run lib/__tests__/voteGate.test.ts` → PASS (10 tests)
(`app/arena/[tournamentId]/page.tsx` 가 아직 옛 `useVoteGate` 를 부르므로 **tsc는 깨진다** — Task 13·14가 고친다.)

- [ ] **Step 5: 커밋**

```bash
git add lib/voteGate.ts lib/__tests__/voteGate.test.ts
git commit -m "refactor(run-1): 클라 게이트를 판 기준으로 교체 · HF-1 참가 한도 폐기"
```

---

### Task 7: Crown Card 공유/저장 게이트 순수 판정

**Files:**
- Create: `lib/crown/crownActions.ts`
- Create: `lib/__tests__/crown/crownActions.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface CrownActionState { canShare: boolean; canSave: boolean }
  export function crownActionState(args: { isSignedIn: boolean }): CrownActionState;
  ```

**왜 한 줄짜리 함수를 파일로 두는가:** 지금은 `canShare` 하나가 공유와 저장을 **함께** 잠그고 있고, 그 판정이 `CrownCardModal`·`ShareActions`·CSS 세 곳에 흩어져 있다. v2.1은 둘을 갈라야 하는데, 판정이 흩어진 채로 가르면 한 곳을 빠뜨려 "공유는 열렸는데 버튼은 비활성" 같은 상태가 남는다(§11.2가 이 테스트를 따로 요구한 이유다).

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
/**
 * crownActionState — v2.1 공유 개방 / 저장 잠금 (§16 2·3).
 *
 * v2.0까지는 `canShare` 하나가 공유·저장을 함께 잠갔다(HF-2 공유 게이트). v2.1에서 게스트의
 * 공유를 여는 이유는 유입이다 — 공유 링크에 uid가 없어(§16 실측 4) 열어도 안전하고, 게스트의
 * 선택은 어차피 랭킹에서 빠진다(PR 3). 로그인 유인은 "간직하려면"(저장)으로 옮겼다.
 */
import { describe, expect, it } from "vitest";
import { crownActionState } from "@/lib/crown/crownActions";

describe("crownActionState", () => {
  it("게스트도 공유할 수 있다 — v2.1의 핵심 변경", () => {
    expect(crownActionState({ isSignedIn: false })).toEqual({
      canShare: true,
      canSave: false,
    });
  });

  it("게스트는 저장(다운로드)할 수 없다", () => {
    expect(crownActionState({ isSignedIn: false }).canSave).toBe(false);
  });

  it("로그인하면 둘 다 열린다", () => {
    expect(crownActionState({ isSignedIn: true })).toEqual({
      canShare: true,
      canSave: true,
    });
  });

  it("공유는 로그인 여부와 무관하게 언제나 열려 있다", () => {
    for (const isSignedIn of [true, false]) {
      expect(crownActionState({ isSignedIn }).canShare).toBe(true);
    }
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/__tests__/crown/crownActions.test.ts`
Expected: FAIL — `Cannot find module '@/lib/crown/crownActions'`

- [ ] **Step 3: 구현**

`lib/crown/crownActions.ts`:

```ts
/**
 * Crown Card 액션 게이트 — v2.1 공유 개방 / 저장 잠금 (§16 2·3, 2026-09-06 대표 확정).
 *
 * v2.0까지 `canShare` 하나가 공유와 저장을 **함께** 잠갔다(C-2 AC-9/10, HF-2 공유 게이트).
 * v2.1은 둘을 가른다:
 *   - **공유**(X · 네이티브 공유 시트 · 링크)는 게스트에게 **열린다.** 공유 링크 규격은
 *     로그인과 동일하고(`withShareUtm` 그대로) uid를 노출하지 않는다(§16 실측 4).
 *   - **저장(다운로드)**만 로그인 게이트로 남는다 — v2.1의 로그인 유인은 "간직하려면"이다.
 *
 * 판정을 한 함수로 모으는 이유: 지금 이 판정이 모달·버튼·CSS 세 곳에 흩어져 있어서, 가르다가
 * 한 곳을 빠뜨리면 "공유는 열렸는데 버튼은 비활성"이 남는다.
 */
export interface CrownActionState {
  /** 공유 — v2.1부터 언제나 열려 있다. */
  canShare: boolean;
  /** 저장·다운로드 — 로그인(비익명)만. */
  canSave: boolean;
}

export function crownActionState(args: { isSignedIn: boolean }): CrownActionState {
  return { canShare: true, canSave: args.isSignedIn };
}
```

- [ ] **Step 4: 통과 확인 + 커밋**

```bash
npx vitest run lib/__tests__/crown/crownActions.test.ts   # PASS (4 tests)
git add lib/crown/crownActions.ts lib/__tests__/crown/crownActions.test.ts
git commit -m "feat(run-1): Crown Card 공유/저장 게이트 분리 순수 판정 (v2.1)"
```

---

### Task 8: `linkRoundProgress` — 판정 단위를 (대회) → (대회, 회차)

**Files:**
- Modify: `functions/src/core/linkRoundProgress.ts`
- Test: `functions/src/__tests__/linkRoundProgress.test.ts`

**Interfaces:**
- Produces: `RoundProgressFacts` 에 `runIndex: number` 추가. `RoundProgressDecision` 에도 `runIndex` 추가. `conflictTournamentIds(facts)` 는 **대회 단위 그대로** (중복 제거된 tid 목록).

**왜 (§16이 만든 새 구멍):** `linkSessionVote.ts:49` 의 `GUEST_RUN_INDEX = 1` 은 *"게스트는 하루 통틀어 1판이므로 이관 대상은 정의상 1회차"* 라는 근거로 박혀 있다. **한도가 3이 되는 순간 그 전제가 깨진다** — 게스트가 같은 대회를 2·3판째 돌고 로그인하면 그 판들의 진행·씨앗·카드가 이관되지 않고 사라진다. 게스트→로그인은 v2.1의 주 전환 경로라 그 자리에서의 데이터 손실은 PR 지연보다 비싸다 (2026-09-08 대표 확정).

**충돌 판정은 대회 단위로 남긴다.** Google 계정에 그 대회의 1회차 진행 문서가 있으면 그 계정은 그 대회에 이미 판이 있다는 뜻이다(회차는 단조 증가라 1회차 없이 2회차가 생기지 않는다). 그러면 게스트 판 **전부**를 버린다 — HF-3.1 케이스 2 무변경. 충돌이 아니면 게스트 r1..R이 Google r1..R로 **충돌 없이 1:1** 착지한다.

- [ ] **Step 1: 테스트를 쓴다**

`functions/src/__tests__/linkRoundProgress.test.ts` 에 추가 (기존 케이스의 `facts` 객체에는 `runIndex: 1` 을 채워 넣는다):

```ts
describe("회차 단위 이관 (v2.1 — 게스트 3판)", () => {
  it("한 대회의 여러 회차를 각각 계획한다", () => {
    // 게스트가 같은 대회를 3판 돌고 로그인한 경우. v2.0(1판)에서는 있을 수 없었다.
    const plan = planRoundProgressTransfer([
      { tournamentId: "A", runIndex: 1, guestExists: true, guestComplete: true, googleExists: false, googleComplete: false },
      { tournamentId: "A", runIndex: 2, guestExists: true, guestComplete: true, googleExists: false, googleComplete: false },
      { tournamentId: "A", runIndex: 3, guestExists: true, guestComplete: false, googleExists: false, googleComplete: false },
    ]);
    expect(plan.map((d) => [d.runIndex, d.action])).toEqual([
      [1, "refire"], [2, "refire"], [3, "copy"],
    ]);
  });

  it("완주한 회차마다 카드가 다시 발화된다 (AC 4·5)", () => {
    // refire 는 2단계 쓰기로 onChampionConfirmed 를 깨워 그 회차의 Crown Card를 만든다.
    const plan = planRoundProgressTransfer([
      { tournamentId: "A", runIndex: 1, guestExists: true, guestComplete: true, googleExists: false, googleComplete: false },
      { tournamentId: "A", runIndex: 2, guestExists: true, guestComplete: true, googleExists: false, googleComplete: false },
    ]);
    expect(plan.filter((d) => d.action === "refire")).toHaveLength(2);
  });

  it("충돌은 대회 단위다 — Google이 그 대회에 판이 있으면 게스트 회차 전부를 버린다", () => {
    const facts = [
      { tournamentId: "A", runIndex: 1, guestExists: true, guestComplete: true, googleExists: true, googleComplete: true },
      { tournamentId: "A", runIndex: 2, guestExists: true, guestComplete: true, googleExists: true, googleComplete: true },
    ];
    expect(planRoundProgressTransfer(facts).every((d) => d.action === "skip")).toBe(true);
    // 대회 id는 중복 없이 한 번만 나온다 — 호출자가 votes 삭제 판정에 쓰는 집합이다.
    expect(conflictTournamentIds(facts)).toEqual(["A"]);
  });

  it("서로 다른 대회의 회차가 섞여도 각각 판정된다", () => {
    const plan = planRoundProgressTransfer([
      { tournamentId: "A", runIndex: 1, guestExists: true, guestComplete: true, googleExists: false, googleComplete: false },
      { tournamentId: "B", runIndex: 1, guestExists: true, guestComplete: false, googleExists: false, googleComplete: false },
      { tournamentId: "A", runIndex: 2, guestExists: true, guestComplete: false, googleExists: false, googleComplete: false },
    ]);
    expect(plan.map((d) => [d.tournamentId, d.runIndex, d.action])).toEqual([
      ["A", 1, "refire"], ["B", 1, "copy"], ["A", 2, "copy"],
    ]);
  });

  it("응답에는 대회당 한 줄만 나간다 — 착지는 대회 단위다", () => {
    // 클라이언트는 "어느 대회의 카드로 갈까"를 고르지 회차를 고르지 않는다. 완주한 회차가
    // 있으면 그 대회는 complete 이고, 가장 마지막 완주 회차가 최신 카드다.
    const plan = planRoundProgressTransfer([
      { tournamentId: "A", runIndex: 1, guestExists: true, guestComplete: true, googleExists: false, googleComplete: false },
      { tournamentId: "A", runIndex: 2, guestExists: true, guestComplete: false, googleExists: false, googleComplete: false },
    ]);
    expect(transferredTournaments(plan)).toEqual([
      { tournamentId: "A", complete: true, source: "guest" },
    ]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd functions && npx vitest run src/__tests__/linkRoundProgress.test.ts`
Expected: FAIL — `runIndex` 가 결정에 없고, `transferredTournaments` 가 대회당 여러 줄을 낸다.

- [ ] **Step 3: 구현**

`functions/src/core/linkRoundProgress.ts`:

1. 상단 주석에 추가:
```
 * **v2.1 (2026-09-06)**: 게스트 한도가 3판이 되면서 한 대회에 **여러 회차**가 생길 수 있다.
 * 판정 단위를 (대회) → (대회, 회차)로 넓혔다. 충돌 판정만 대회 단위로 남는다 — Google 계정에
 * 그 대회의 1회차 문서가 있으면 그 계정은 이미 그 대회에 판이 있다는 뜻이고(회차는 단조
 * 증가라 1회차 없이 2회차가 생기지 않는다), 그러면 게스트 회차 전부를 버린다.
```

2. `RoundProgressFacts` 와 `RoundProgressDecision` 에 `runIndex: number` 추가.
3. `planRoundProgressTransfer` 는 `f.runIndex` 를 결정에 실어 그대로 map 한다(로직 자체는 무변경).
4. `transferredTournaments` 를 **대회 단위로 접는다**:

```ts
/**
 * linkSessionVote 응답 — **대회당 한 줄.** 클라이언트는 "어느 대회의 카드로 착지할까"를
 * 고르지 회차를 고르지 않는다. 완주한 회차가 하나라도 있으면 그 대회는 complete 이고,
 * `source` 는 게스트 판이 실제로 옮겨졌는지를 말한다(HF-3.1 W2 우선순위 + 배너).
 */
export function transferredTournaments(
  plan: RoundProgressDecision[],
): Array<{ tournamentId: string; complete: boolean; source: RoundProgressSource }> {
  const byTid = new Map<string, { tournamentId: string; complete: boolean; source: RoundProgressSource }>();
  for (const d of plan) {
    const prev = byTid.get(d.tournamentId);
    if (!prev) {
      byTid.set(d.tournamentId, {
        tournamentId: d.tournamentId,
        complete: d.responseComplete,
        source: d.source,
      });
      continue;
    }
    // 완주한 회차가 하나라도 있으면 그 대회는 완주다. `guest` 는 `existing` 을 이긴다 —
    // 방금 옮겨온 판이 옛 카드보다 우선한다(HF-3.1).
    prev.complete = prev.complete || d.responseComplete;
    if (d.source === "guest") prev.source = "guest";
  }
  return [...byTid.values()];
}
```

- [ ] **Step 4: 통과 확인 + 커밋**

```bash
cd functions && npx vitest run src/__tests__/linkRoundProgress.test.ts && cd ..
git add functions/src/core/linkRoundProgress.ts functions/src/__tests__/linkRoundProgress.test.ts
git commit -m "refactor(run-1): 게스트 이관 판정을 (대회, 회차) 단위로 (v2.1)"
```

---

### Task 9: `onVote` — 속도 제한 40 · `isGuest` · 게스트 게이트 재배선

> ⚠️ **이 태스크는 마감 강제를 켜지 않는다.** `deadlinePassed: false` 는 그대로 둔다 — Task 18이 문구·화면과 **같은 커밋**에서 되살린다 (§14).

**Files:**
- Modify: `functions/src/onVote.ts`
- Test: `functions/src/__tests__/onVote.test.ts`

**Interfaces:**
- Consumes: `decideGuestRun({ lastRunDate, runsToday, todayKST, isContinue })` (Task 1) · `planRunWrite` (Task 4, `tournamentId` 없음) · `buildVoteDoc({ …, isGuest })` (Task 5)
- Produces: `export const RATE_LIMIT = 40;`

**바뀌는 것 4가지:**
1. `RATE_LIMIT` 20 → **40** (2026-09-03 대표 확정). 근거: 5판 = 선택 230번인데 분당 20이면 규칙이 최소 11.5분을 강제해 "결과물을 늘린다"는 설계와 충돌한다. 40이면 1.5초에 한 번까지 허용.
2. **판정 순서를 바꾼다** — `decideRun` 을 **먼저** 부르고 그 결과(`continue` 여부)를 `decideGuestRun` 에 `isContinue` 로 넘긴다. 그 다음 게스트 차단 → 판 차단 순으로 던진다(차단 우선순위는 기존과 동일).
3. `buildVoteDoc` 에 `isGuest: isAnonymous` 를 넘긴다.
4. `planRunWrite` 호출에서 `tournamentId` 인자를 뺀다.

- [ ] **Step 1: 테스트를 쓴다**

`functions/src/__tests__/onVote.test.ts` 에 추가:

```ts
describe("속도 제한 (AC 13)", () => {
  beforeEach(() => __resetRateBucketsForTest());

  it("분당 40번까지 허용한다", () => {
    // 5판 = 선택 230번. 분당 20이면 규칙이 최소 11.5분을 강제해 설계와 충돌했다(09-03 확정).
    const now = Date.now();
    for (let i = 1; i <= 40; i++) {
      expect(checkRateLimit("u1", now), `${i}번째`).toBe(true);
    }
  });

  it("41번째에 막는다", () => {
    const now = Date.now();
    for (let i = 0; i < 40; i++) checkRateLimit("u1", now);
    expect(checkRateLimit("u1", now)).toBe(false);
  });

  it("창이 지나면 다시 채워진다", () => {
    const now = Date.now();
    for (let i = 0; i < 40; i++) checkRateLimit("u1", now);
    expect(checkRateLimit("u1", now + RATE_WINDOW_MS)).toBe(true);
  });

  it("상수가 40이다", () => {
    expect(RATE_LIMIT).toBe(40);
  });
});
```

import 줄에 `RATE_LIMIT`·`RATE_WINDOW_MS`·`__resetRateBucketsForTest`·`checkRateLimit` 이 포함돼 있는지 확인한다.

- [ ] **Step 2: 실패 확인**

Run: `cd functions && npx vitest run src/__tests__/onVote.test.ts`
Expected: FAIL — 21번째에서 막힌다 (`RATE_LIMIT` 이 20).

- [ ] **Step 3: 구현**

`functions/src/onVote.ts` 에서:

1. 상수와 주석:
```ts
// Per-uid token bucket — 40 calls / uid / minute / instance.
// RUN-1 (2026-09-03 대표 확정): 20 → 40. 5판 = 선택 230번인데 분당 20이면 규칙이 최소
// 11.5분을 강제해 "판을 늘려 결과물을 늘린다"는 v2.0 설계와 정면으로 충돌했다. 40이면
// 1.5초에 한 번까지 허용된다 — 사람이 고르는 속도는 넘지 않으면서 홍수는 막는다.
export const RATE_LIMIT = 40;
```

2. 트랜잭션 안에서 **`decideRun` 을 게스트 검사보다 먼저** 부른다. 기존의 `if (isAnonymous) { … }` 블록을 `decideRun` 호출 **뒤로** 옮기고, `decideGuestRun` 인자를 교체한다:

```ts
      // ── 회차·한도 판정이 먼저다 — 게스트 게이트가 그 결과(이어하기 여부)를 입력으로 받는다.
      //    v2.1: 게스트 한도는 대회를 가로지르므로 "마지막 대회"로는 이어하기를 판정할 수
      //    없다(§16 실측 3). 이어하기는 이 판정의 `continue` 가 사실의 원천이다.
      const decision = decideRun({
        runIndex,
        lastRunDate: (stored.lastRunDate as string | undefined) ?? null,
        runsToday: Number(stored.runsToday ?? 0),
        todayKST: date,
        currentRunComplete,
        // 🔴 2026-09-06 P0 대응 — 마감 강제는 아직 꺼져 있다. PR 2가 §8 문구·AC 16 화면과
        // 함께 되살린다. ⚠️ 화면 처리 없이 이 줄만 true 로 돌리지 말 것(§14).
        deadlinePassed: false,
      });

      // ── 게스트 한도 (§5 DO 3 · v2.1: 하루 통틀어 3판) ──────────────────
      const guest = guestSnap.data() ?? {};
      const guestRunsTodayBefore = effectiveRunsToday({
        lastRunDate: (guest.lastRunDate as string | undefined) ?? null,
        runsToday: Number(guest.runsToday ?? 0),
        todayKST: date,
      });
      if (isAnonymous) {
        const guestDecision = decideGuestRun({
          lastRunDate: (guest.lastRunDate as string | undefined) ?? null,
          runsToday: Number(guest.runsToday ?? 0),
          todayKST: date,
          isContinue: decision.status === "continue",
        });
        if (guestDecision.status === "login_required") {
          // 화면은 이 코드로 login.guest_limit 문구를 고른다 — Google 버튼이 함께 뜨는
          // 전환 지점이다(AC 17). 이유 없이 "로그인이 필요해요"만 던지지 않는다.
          throw new HttpsError(
            "permission-denied",
            "Guest daily run limit reached — sign in to keep playing.",
            { code: VOTE_ERROR_CODES.GUEST_LIMIT },
          );
        }
      }

      if (decision.status === "limit_reached") { /* 기존 그대로 */ }
```

3. `planRunWrite` 호출에서 `tournamentId` 를 뺀다:
```ts
      const plan = planRunWrite({
        decision,
        todayKST: date,
        runsTodayBefore,
        guestRunsTodayBefore,
      });
```

4. `buildVoteDoc` 호출에 `isGuest` 추가:
```ts
          runIndex: plan.runIndex,
          // 서버가 로그인 제공자로 판정한다 — 클라이언트가 보낸 플래그가 아니다(§16 실측 1).
          isGuest: isAnonymous,
```

5. `functions/src/core/voteErrorCodes.ts` 와 `lib/voteErrorCodes.ts` **양쪽에** 코드를 추가한다 (둘은 의도적 중복이고 동기화가 계약이다 — ADR-B2 §4):
```ts
  /** RUN-1 v2.1 (AC 17): 게스트가 하루 3판을 다 썼다. 화면은 login.guest_limit 을 띄운다. */
  GUEST_LIMIT: "guest_limit",
```

6. 파일 상단 주석의 "게스트의 하루 1판"을 고친다:
```
 * 익명 uid는 허용된다(게스트는 하루 **통틀어 3판** — v2.1 · D-1 linkSessionVote가 로그인 후
 * 재부모화한다). 게스트 한도는 Tournament를 가로지르므로 `guest_runs/{uid}` 로 따로 센다.
```

- [ ] **Step 4: 통과 확인**

Run: `cd functions && npx vitest run src/__tests__/onVote.test.ts` → PASS

- [ ] **Step 5: 커밋**

```bash
git add functions/src/onVote.ts functions/src/__tests__/onVote.test.ts \
        functions/src/core/voteErrorCodes.ts lib/voteErrorCodes.ts
git commit -m "feat(run-1): onVote 속도 제한 40 · isGuest 기록 · 게스트 게이트 v2.1 재배선"
```

---

### Task 10: `linkSessionVote` — 게스트 회차 1..N 전부 이관

**Files:**
- Modify: `functions/src/linkSessionVote.ts`

**Interfaces:**
- Consumes: `runDocId(uid, tid, runIndex)` · `tournamentRunsDocId` · `planRoundProgressTransfer` (Task 8, `runIndex` 포함) · `effectiveRunsToday`

**왜:** Task 8의 근거와 같다. `GUEST_RUN_INDEX = 1` 상수를 **삭제**하고, 게스트의 `tournament_runs/{anonUid}_{tid}.runIndex = R` 을 읽어 회차 1..R을 순회한다.

- [ ] **Step 1: 게스트 회차 수를 읽는 헬퍼를 추가한다**

```ts
/**
 * 게스트가 그 대회에서 돈 판의 수 R (= 마지막 회차). v2.1로 게스트 한도가 3판이 되면서
 * 한 대회에 여러 회차가 생길 수 있다 — R을 모르면 2·3판째의 진행·씨앗·카드가 이관되지 않고
 * 사라진다. votes는 통째로 재부모화되므로 그 판들의 선택만 남고 진행이 없어져, 로그인 직후
 * 팬이 완주했던 판이 사라진 것처럼 보인다.
 *
 * 문서가 없으면(회차 도입 전 게스트) 1이다 — 접미사 없는 옛 문서가 곧 1회차다(§3.0 B안).
 */
async function guestRunCount(anonUid: string, tid: string): Promise<number> {
  const snap = await adminDb.doc(`tournament_runs/${tournamentRunsDocId(anonUid, tid)}`).get();
  const n = Number(snap.get("runIndex") ?? 0);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
```

- [ ] **Step 2: `fetchRoundProgressFacts` 를 회차 단위로 넓힌다**

```ts
async function fetchRoundProgressFacts(
  anonUid: string,
  googleUid: string,
  tids: string[],
): Promise<RoundProgressFacts[]> {
  const perTid = await Promise.all(
    tids.map(async (tid) => {
      const runs = await guestRunCount(anonUid, tid);
      // 충돌 판정은 **대회 단위**다: Google이 1회차 문서를 가지고 있으면 그 계정은 이미 그
      // 대회에 판이 있다(회차는 단조 증가라 1회차 없이 2회차가 생기지 않는다). 그러면 게스트
      // 회차 전부를 버린다 — HF-3.1 케이스 2 무변경.
      const googleFirst = await adminDb
        .doc(`roundProgress/${runDocId(googleUid, tid, 1)}`)
        .get();
      const googleExists = googleFirst.exists;
      const googleComplete = googleFirst.get("complete") === true;

      return Promise.all(
        Array.from({ length: runs }, (_, i) => i + 1).map(async (runIndex) => {
          const guestSnap = await adminDb
            .doc(`roundProgress/${runDocId(anonUid, tid, runIndex)}`)
            .get();
          return {
            tournamentId: tid,
            runIndex,
            guestExists: guestSnap.exists,
            guestComplete: guestSnap.get("complete") === true,
            googleExists,
            googleComplete,
          };
        }),
      );
    }),
  );
  return perTid.flat();
}
```

- [ ] **Step 3: `executeRoundProgressPlan` 이 회차를 쓰게 한다**

`decision.tournamentId` 를 쓰던 세 곳의 `runDocId(..., GUEST_RUN_INDEX)` 를 `runDocId(..., decision.runIndex)` 로 바꾼다. 그 외 로직(copy / 2단계 refire)은 **무변경** — 2단계 쓰기여야 `onDocumentUpdated` 가 false→true 모서리를 보고 그 회차의 Crown Card를 만든다.

- [ ] **Step 4: 씨앗 이관을 회차별로**

```ts
    // §8 Edge #1 — 씨앗은 판마다 다르다(AC 3). 회차별로 옮기지 않으면 2판째가 로그인 후
    // 새 씨앗을 뽑아 대진표가 다시 섞이고, 이미 이긴 Contestant가 되살아난다.
    const anonSeeds: AnonSeed[] = (
      await Promise.all(
        tids.map(async (tid) => {
          const runs = await guestRunCount(anonUid, tid);
          return Promise.all(
            Array.from({ length: runs }, (_, i) => i + 1).map(async (runIndex) => {
              const s = await adminDb
                .doc(`bracket_seeds/${runDocId(anonUid, tid, runIndex)}`)
                .get();
              return s.exists
                ? { tournamentId: tid, runIndex, seed: (s.data() as { seed: number }).seed }
                : null;
            }),
          );
        }),
      )
    ).flat();
```

`functions/src/core/linkSeeds.ts` 의 `AnonSeed` 에 `runIndex: number` 를 추가하고, `planSeedTransfer` 가 `runDocId(googleUid, tournamentId, runIndex)` 로 docId를 만들게 고친다. 그 파일의 테스트도 `runIndex` 를 채워 갱신한다.

- [ ] **Step 5: `mergeTournamentRuns` 가 R판을 반영하게 한다**

```ts
async function mergeTournamentRuns(
  googleUid: string,
  anonUid: string,
  transferredTids: string[],
): Promise<void> {
  if (transferredTids.length === 0) return;
  const date = kstDate();
  for (const tid of transferredTids) {
    try {
      const ref = adminDb.doc(`tournament_runs/${tournamentRunsDocId(googleUid, tid)}`);
      const snap = await ref.get();
      const stored = snap.data() ?? {};
      const existingRunIndex = Number(stored.runIndex ?? 0);
      // 이미 판이 있으면 충돌이었어야 한다 — 이관되지 않았을 것이므로 손대지 않는다.
      if (existingRunIndex > 0) continue;

      // v2.1: 게스트가 그 대회에서 돈 판이 여럿일 수 있다. 1로 고정하면 회차가 뒤로 감겨
      // 다음 판이 이미 있는 문서 위에 올라탄다.
      const runs = await guestRunCount(anonUid, tid);
      const runsToday = effectiveRunsToday({
        lastRunDate: (stored.lastRunDate as string | undefined) ?? null,
        runsToday: Number(stored.runsToday ?? 0),
        todayKST: date,
      });
      await ref.set(
        { runIndex: runs, runsToday: runsToday + runs, lastRunDate: date, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    } catch (err) {
      console.warn("[linkSessionVote] tournament_runs merge failed:", tid, err);
    }
  }
}
```

호출부도 `mergeTournamentRuns(googleUid, anonUid, tids.filter(...))` 로 고친다.

- [ ] **Step 6: 재부모화 시 `isGuest: false` (§16 5)**

PASS 2의 `batch.update` 를 고친다:

```ts
            batch.update(d.ref, {
              userId: googleUid,
              // v2.1: 로그인 계정으로 옮겨온 선택은 더 이상 게스트의 것이 아니다.
              // "로그인하면 내 선택이 랭킹에 반영된다"가 실제로 성립하려면 필수다 —
              // 이 줄이 없으면 이관된 선택이 PR 3의 필터에 계속 걸려 빠진다.
              isGuest: false,
              ...(hasRunIndex ? {} : { runIndex: 1 }),
            });
```

`GUEST_RUN_INDEX` 상수를 **삭제**하고, 남은 사용처(위 `runIndex: 1`)는 리터럴로 둔다 — 이건 "게스트는 1판"이 아니라 "회차 필드가 없는 옛 문서는 1회차"라는 §3.0 B안의 사실이다. 그 취지를 주석으로 남긴다.

- [ ] **Step 7: 상단 주석 갱신**

`GUEST_RUN_INDEX` 자리에 있던 설명을 지우고 파일 헤더에 추가:

```
 * **v2.1 (2026-09-06)**: 게스트 한도가 하루 3판이 되면서 한 대회에 여러 회차가 생길 수 있다.
 * `GUEST_RUN_INDEX = 1` 고정은 "게스트는 하루 1판"이라는 v2.0 전제에 기대고 있었고, 그 전제가
 * 깨지면 2·3판째의 진행·씨앗·카드가 이관되지 않고 사라진다. 이제 게스트의
 * `tournament_runs.runIndex` 를 읽어 회차 1..R을 전부 옮긴다.
```

- [ ] **Step 8: 빌드 + 전체 테스트**

```bash
cd functions && npm run build && npx vitest run && cd ..
```
Expected: 빌드 통과 · functions 테스트 전부 통과

- [ ] **Step 9: 커밋**

```bash
git add functions/src/linkSessionVote.ts functions/src/core/linkSeeds.ts \
        functions/src/__tests__/linkSeeds.test.ts
git commit -m "fix(run-1): 게스트→로그인 이관이 회차 1..N을 전부 옮긴다 (v2.1 데이터 손실 차단)"
```

---

### Task 11: 문구 3언어 — §8 승인본을 글자 단위로 고정

**Files:**
- Modify: `lib/i18n/messages.ts`
- Modify: `lib/voteErrorCodes.ts` (`guest_limit`·`deadline_passed` 매핑)
- Test: `lib/__tests__/messagesContent.test.ts`
- Test: `lib/__tests__/voteErrorCodes.test.ts`

**Interfaces:**
- Produces (신규 키): `arena.vote.dailyLimitSub` · `arena.run.playAgain` · `arena.run.pastCards` · `arena.run.deadlinePassed` · `arena.guest.welcome` · `arena.guest.remaining` · `login.guest_limit.title` · `login.guest_limit.sub`
- Produces (교체): `arena.vote.dailyLimit` · `arena.vote.rateLimited` · `pitch.hero.sub`

**왜 테스트로 고정하나:** §5 DO 7 — 문구는 대표 승인 완료본이고 **한 글자도 임의 변경 금지**다. 눈으로 대조하는 규율보다 CI가 강하다. AC 12("3언어가 §8 표와 글자 단위로 일치")를 만족시키는 유일하게 확실한 방법이다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`lib/__tests__/messagesContent.test.ts` 에 추가:

```ts
/**
 * RUN-1 §8 문구표 — 2026-09-07 대표 승인 최종본을 **글자 단위로** 고정한다 (AC 12).
 *
 * §5 DO 7: 문구는 승인 완료본이고 한 글자도 임의 변경 금지다. 아래 문자열이 흔들리면
 * 누군가 승인 없이 고쳤다는 뜻이다 — 눈으로 대조하는 규율보다 이 테스트가 강하다.
 *
 * 표시 용어 규칙(LANGUAGE.md §1 v2.2): 화면의 '판'은 "참여"로 순화하고, "표"는 낱말 자체가
 * 금지어다(§7). ko 값은 그 규칙을 반영한 최종본이다.
 */
describe("RUN-1 §8 문구표 (2026-09-07 대표 승인 최종본)", () => {
  const APPROVED = {
    "arena.vote.dailyLimit": {
      ko: "이 Tournament는 오늘 5번 참여를 모두 하셨어요 (5/5)",
      en: "You've played all 5 runs of this Tournament today (5/5)",
      es: "Ya has jugado las 5 partidas de este Tournament hoy (5/5)",
    },
    "arena.vote.dailyLimitSub": {
      ko: "한국 시간 자정에 참여 횟수가 다시 채워져요. 다른 Tournament는 지금 바로 참여하실 수 있어요.",
      en: "Your 5 runs reset at Seoul midnight. Other Tournaments are open right now.",
      es: "Tus 5 partidas se reinician a medianoche de Seúl. Otros Tournaments están abiertos ahora.",
    },
    "arena.run.playAgain": {
      ko: "다시 참여 ({n}/{limit})",
      en: "Play again ({n}/{limit})",
      es: "Jugar otra vez ({n}/{limit})",
    },
    "arena.run.pastCards": {
      ko: "이전 참여의 Crown Card",
      en: "Your earlier Crown Cards",
      es: "Tus Crown Cards anteriores",
    },
    "arena.vote.rateLimited": {
      ko: "조금 빠르게 고르고 계시네요. 몇 초만 쉬었다 이어가 주세요.",
      en: "You're choosing quickly. Take a few seconds, then keep going.",
      es: "Estás eligiendo muy rápido. Espera unos segundos y continúa.",
    },
    "arena.run.deadlinePassed": {
      ko: "이 Tournament는 마감됐어요. 다른 Tournament에 참여해 보세요.",
      en: "This Tournament has closed. Try a new run in another Tournament.",
      es: "Este Tournament ha cerrado. Empieza una nueva partida en otro Tournament.",
    },
    "login.guest_limit.title": {
      ko: "오늘의 서비스(3번 참여)를 모두 소진하셨어요.",
      en: "You've used all 3 of today's free entries.",
      es: "Has usado tus 3 participaciones gratis de hoy.",
    },
    "login.guest_limit.sub": {
      ko: "로그인하면 Tournament마다 하루 5번까지 참여 — 내 선택이 랭킹에 반영돼요.",
      en: "Sign in for up to 5 entries a day in every Tournament — and your picks count in the Ranking.",
      es: "Inicia sesión: hasta 5 participaciones al día en cada Tournament — y tus elecciones cuentan en el Ranking.",
    },
    "arena.guest.welcome": {
      ko: "로그인 없이 하루 3번까지 참여가 가능해요!",
      en: "Join up to 3 times a day — no sign-in needed!",
      es: "¡Participa hasta 3 veces al día — sin iniciar sesión!",
    },
    "arena.guest.remaining": {
      ko: "오늘 남은 참여 가능 횟수는 : {n}판 · 저장하려면 로그인",
      en: "Entries left today: {n} · Sign in to save",
      es: "Participaciones restantes hoy: {n} · Inicia sesión para guardar",
    },
  } as const;

  for (const [key, langs] of Object.entries(APPROVED)) {
    for (const [lang, text] of Object.entries(langs)) {
      it(`${key}.${lang} 이 승인본과 글자 단위로 같다`, () => {
        expect(MESSAGES[key as keyof typeof MESSAGES][lang as "ko" | "en" | "es"]).toBe(text);
      });
    }
  }
});

describe("히어로 문구 정정 (2026-09-07 승인)", () => {
  it("'예측도, 배당도 없이' 구절이 3언어 모두에서 사라졌다", () => {
    // 예측·배당은 도박·투기를 연상시킨다(대표) — 서비스 정체성 금지 항목이다.
    const sub = MESSAGES["pitch.hero.sub"];
    expect(sub.ko).not.toContain("예측");
    expect(sub.ko).not.toContain("배당");
    expect(sub.en).not.toContain("No predictions");
    expect(sub.en).not.toContain("odds");
    expect(sub.es).not.toContain("predicciones");
    expect(sub.es).not.toContain("apuestas");
  });

  it("뒷부분이 승인본으로 교체됐다", () => {
    expect(MESSAGES["pitch.hero.sub"].ko).toContain(
      "오직 팬의 선택. 당신의 선택이 왕관의 주인을 만듭니다.",
    );
    expect(MESSAGES["pitch.hero.sub"].en).toContain(
      "Pure fan choice. Your pick crowns the Champion.",
    );
    expect(MESSAGES["pitch.hero.sub"].es).toContain(
      "Solo la elección de los fans. Tu elección corona al Champion.",
    );
  });

  it("앞부분은 3언어 그대로 남는다", () => {
    expect(MESSAGES["pitch.hero.sub"].ko).toContain("48 Contestants. Five Rounds.");
    expect(MESSAGES["pitch.hero.sub"].en).toContain("48 Contestants. Five Rounds.");
    expect(MESSAGES["pitch.hero.sub"].es).toContain("48 Contestants. Cinco Rounds.");
  });

  it("금지어 '표'가 팬 노출 문구에 없다 (LANGUAGE.md §7)", () => {
    // "당신의 한 표가 Champion을 만듭니다" 가 이 정정의 직접 대상이었다.
    expect(MESSAGES["pitch.hero.sub"].ko).not.toContain("표");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/__tests__/messagesContent.test.ts`
Expected: FAIL — 신규 키가 없고 `pitch.hero.sub` 에 "예측도, 배당도 없이"가 있다.

- [ ] **Step 3: 구현**

`lib/i18n/messages.ts`:

1. `pitch.hero.sub` 를 교체 (앞부분 유지 · 뒷부분 승인본):
```ts
  // 2026-09-07 대표 승인: "예측도, 배당도 없이 —" 삭제(도박·투기 연상) + 뒷부분 교체.
  // 금지어 정정: "당신의 한 표가" → "당신의 선택이" ("표"는 낱말 자체가 금지 — LANGUAGE.md §7).
  "pitch.hero.sub": {
    ko: "48 Contestants. Five Rounds. Match를 거치며 하나의 Crown만 남을 때까지 전진합니다. 오직 팬의 선택. 당신의 선택이 왕관의 주인을 만듭니다.",
    en: "48 Contestants. Five Rounds. You advance Match by Match until one Crown remains. Pure fan choice. Your pick crowns the Champion.",
    es: "48 Contestants. Cinco Rounds. Avanzas Match a Match hasta que queda una sola Crown. Solo la elección de los fans. Tu elección corona al Champion.",
  },
```

2. `arena.vote.dailyLimit` · `arena.vote.rateLimited` 값을 승인본으로 교체.

3. Arena vote errors 블록 뒤에 신규 키를 추가 (위 테스트의 `APPROVED` 값을 그대로 옮긴다). 블록 주석:
```ts
  // ── 판(Run) 화면 · 게스트 안내 (RUN-1 v2.1) ──
  // §8 대표 승인 최종본(2026-09-07). 표시 용어 v2.2: 화면의 '판'은 "참여"로 순화하고
  // "표"는 낱말 자체가 금지어다. {n}·{limit} 은 resolveMessage 의 보간 토큰 —
  // 로그인 5 · 게스트 3을 주입한다(2026-09-08 대표 확정).
```

- [ ] **Step 4: `voteErrorCodes` 매핑 추가**

`lib/voteErrorCodes.ts` 의 `voteErrorMessageKey` 에:
```ts
  if (detailCode === VOTE_ERROR_CODES.DEADLINE_PASSED) return "arena.run.deadlinePassed";
```
> `guest_limit` 은 토스트가 아니라 **모달**로 간다(AC 17) — 여기서 매핑하지 않는다. 페이지가 `details.code` 를 보고 `setModal("guest_limit")` 한다.

`lib/__tests__/voteErrorCodes.test.ts` 에 추가:
```ts
  it("deadline_passed 는 마감 안내로 간다 — 일반 실패 배너가 아니다", () => {
    // 2026-09-06 P0: 마감 거부가 "투표에 실패했어요"로 보였다. 그게 사고의 전부였다.
    expect(
      voteErrorMessageKey({ code: "functions/failed-precondition", details: { code: "deadline_passed" } }),
    ).toBe("arena.run.deadlinePassed");
  });
```

- [ ] **Step 5: 통과 확인 + 커밋**

```bash
npx vitest run lib/__tests__/messagesContent.test.ts lib/__tests__/voteErrorCodes.test.ts
git add lib/i18n/messages.ts lib/voteErrorCodes.ts lib/__tests__/messagesContent.test.ts lib/__tests__/voteErrorCodes.test.ts
git commit -m "feat(run-1): §8 문구 3언어 승인본 + 히어로 정정 · 글자 단위 테스트로 고정"
```

---

### Task 12: `voteStore` — 회차를 단독으로 결정하고 실어 나른다

**Files:**
- Modify: `lib/arena/voteStore.ts`
- Test: `lib/__tests__/arena/voteStore.test.ts`

**Interfaces:**
- Consumes: `resolveActiveRun` (Task 3) · `toDeadlineMs`/`isDeadlinePassed` (Task 2) · `todayKST` (`lib/run/kstReset`) · `runDocId`/`tournamentRunsDocId` · `loadOrCreateBracketSeed(db, uid, tid, runIndex)`
- Produces (스토어 상태 추가):
  ```ts
  run: ActiveRunState | null;   // resolveActiveRun 의 출력 그대로
  loadTournament: (tournamentId: string, userId: string, isAnonymous: boolean) => Promise<void>;
  startNextRun: () => void;      // [다시 참여] — 표시 회차를 nextRunIndex 로 올리고 votes를 비운다
  ```

**읽기 순서 (2단계인 이유):** votes 쿼리에 `where("runIndex","==",n)` 을 걸려면 **먼저** n을 알아야 하고, n은 `tournament_runs` + 진행 문서를 읽어야 나온다. 그래서 1단계(대회·후보·판 원장·게스트 원장·옛 진행) 병렬 → 회차 확정 → 2단계(현재 회차 진행·votes·씨앗) 병렬.

**🔴 §9 함정 9 (클라이언트 쪽):** 지금 `loadTournament` 는 `where(userId, tournamentId)` 로 **그 대회의 모든 판의 선택 기록을 통째로** 불러온다. 회차 필터가 없으면 2판째가 화면에서 곧바로 완주 상태가 된다.

- [ ] **Step 1: 테스트를 쓴다**

`lib/__tests__/arena/voteStore.test.ts` 에 추가 (순수 선택자만 테스트하는 기존 관례 유지 — Firestore I/O는 E2E 담당):

```ts
describe("회차 상태 (RUN-1)", () => {
  it("startNextRun 은 표시 회차를 올리고 이전 판의 선택을 비운다", () => {
    // 비우지 않으면 2판째가 1판째 선택을 물려받아 시작하자마자 완주 상태가 된다(§9 함정 9).
    useVoteStore.setState({
      votes: [{ round: 1, matchId: "t:r1:m0", contestantId: "c1" }],
      run: {
        screen: "complete", displayRunIndex: 1, nextRunIndex: 2,
        runsToday: 1, limit: 5, canPlayAgain: true, blockedReason: null,
      },
      seed: 111,
    });
    useVoteStore.getState().startNextRun();
    const s = useVoteStore.getState();
    expect(s.votes).toEqual([]);
    expect(s.run?.displayRunIndex).toBe(2);
    expect(s.run?.screen).toBe("play");
  });

  it("다시 참여할 수 없으면 startNextRun 은 아무것도 하지 않는다", () => {
    useVoteStore.setState({
      votes: [{ round: 1, matchId: "t:r1:m0", contestantId: "c1" }],
      run: {
        screen: "complete", displayRunIndex: 5, nextRunIndex: 6,
        runsToday: 5, limit: 5, canPlayAgain: false, blockedReason: "daily_limit",
      },
    });
    useVoteStore.getState().startNextRun();
    expect(useVoteStore.getState().run?.displayRunIndex).toBe(5);
    expect(useVoteStore.getState().votes).toHaveLength(1);
  });

  it("reset 은 회차 상태도 지운다", () => {
    useVoteStore.setState({
      run: {
        screen: "play", displayRunIndex: 2, nextRunIndex: 3,
        runsToday: 1, limit: 5, canPlayAgain: false, blockedReason: null,
      },
    });
    useVoteStore.getState().reset();
    expect(useVoteStore.getState().run).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/__tests__/arena/voteStore.test.ts`
Expected: FAIL — `startNextRun` 이 없다.

- [ ] **Step 3: 구현**

`lib/arena/voteStore.ts`:

1. import 추가:
```ts
import { resolveActiveRun, type ActiveRunState } from "@/lib/run/activeRun";
import { isDeadlinePassed, toDeadlineMs } from "@/lib/run/deadline";
import { todayKST } from "@/lib/run/kstReset";
import { runDocId, tournamentRunsDocId } from "@/lib/run/runDocId";
```

2. `VoteSlice` 에 `run: ActiveRunState | null` 추가, `EMPTY` 에 `run: null` 추가.

3. `startNextRun` 액션:
```ts
  /**
   * [다시 참여] — 다음 회차로 화면을 옮긴다.
   *
   * 서버는 아직 아무것도 모른다. 회차 카운트는 **그 판의 첫 선택** 때 `onVote` 가 한다
   * (§5 DO 4의 구현 정의) — 들어왔다 한 번도 안 고르고 나가면 한도가 깎이지 않는다.
   * 그래서 여기서는 표시 회차만 올리고 선택 기록을 비운다. 씨앗은 다음 렌더의 로드가 새
   * 문서 id(`_r{n+1}`)로 만든다 — create-once는 그대로다(§5 DON'T 4).
   */
  startNextRun: () =>
    set((s) => {
      if (!s.run?.canPlayAgain) return s;
      return {
        votes: [],
        seed: 0,
        run: { ...s.run, displayRunIndex: s.run.nextRunIndex, screen: "play", canPlayAgain: false },
      };
    }),
```

> ⚠️ `seed: 0` 으로 두면 `selectCurrentMatch` 가 씨앗 없이 대진을 만든다. **씨앗을 다시 받아오는 것은 페이지의 effect 책임**이다 — Task 14가 `run.displayRunIndex` 변화를 보고 `loadOrCreateBracketSeed` 를 다시 부르는 effect를 넣는다.

4. `loadInto` 를 2단계로:
```ts
async function loadInto(
  tournamentId: string,
  userId: string,
  isAnonymous: boolean,
  set: (partial: Partial<VoteState>) => void,
): Promise<void> {
  const db = getDb();
  const today = todayKST();

  // ── 1단계: 회차를 정하는 데 필요한 사실들 (병렬) ────────────────────────
  // votes 쿼리에 회차 필터를 걸려면 먼저 회차를 알아야 한다 — 그래서 두 단계다.
  const [tSnap, cSnap, runsSnap, guestSnap, legacySnap] = await Promise.all([
    getDoc(doc(db, "tournaments", tournamentId)),
    getDocs(query(collection(db, "contestants"), where("tournamentId", "==", tournamentId), orderBy("order"))),
    getDoc(doc(db, "tournament_runs", tournamentRunsDocId(userId, tournamentId))),
    getDoc(doc(db, "guest_runs", userId)),
    getDoc(doc(db, "roundProgress", runDocId(userId, tournamentId, 1))),
  ]);

  if (!tSnap.exists()) throw NOT_FOUND;
  const tournament = { id: tSnap.id, ...tSnap.data() } as Tournament;
  const contestants = cSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Contestant);

  const stored = runsSnap.exists() ? runsSnap.data() : {};
  const guest = guestSnap.exists() ? guestSnap.data() : {};
  const storedRunIndex = Number(stored.runIndex ?? 0);

  // 현재 회차의 완주 여부 — 이어하기와 새 판을 가르는 유일한 사실.
  // 회차 0이면 접미사 없는 옛 문서(= 1회차)를 그대로 본다(§3.0 B안 · AC 11).
  const currentSnap =
    storedRunIndex > 1
      ? await getDoc(doc(db, "roundProgress", runDocId(userId, tournamentId, storedRunIndex)))
      : legacySnap;

  const run = resolveActiveRun({
    runIndex: storedRunIndex,
    legacyRunExists: legacySnap.exists(),
    lastRunDate: (stored.lastRunDate as string | undefined) ?? null,
    runsToday: Number(stored.runsToday ?? 0),
    currentRunComplete: currentSnap.exists() && currentSnap.data()?.complete === true,
    deadlinePassed: isDeadlinePassed(toDeadlineMs(tournament.tournamentDeadline), Date.now()),
    todayKST: today,
    isAnonymous,
    guestLastRunDate: (guest.lastRunDate as string | undefined) ?? null,
    guestRunsToday: Number(guest.runsToday ?? 0),
  });

  // ── 2단계: 그 회차의 선택 기록과 씨앗 (병렬) ────────────────────────────
  // 🔴 §9 함정 9: 회차 필터가 없으면 2판째가 1판째 24건을 물려받아 시작하자마자 완주된다.
  const [vSnap, seed] = await Promise.all([
    getDocs(
      query(
        collection(db, "votes"),
        where("userId", "==", userId),
        where("tournamentId", "==", tournamentId),
        where("runIndex", "==", run.displayRunIndex),
      ),
    ),
    loadOrCreateBracketSeed(db, userId, tournamentId, run.displayRunIndex),
  ]);

  const votes: ArenaVote[] = vSnap.docs.map((d) => {
    const data = d.data() as { round: number; matchId: string; contestantId: string };
    return { round: data.round, matchId: data.matchId, contestantId: data.contestantId };
  });

  set({ tournament, contestants, votes, seed, run, loading: false, error: null });
}
```

> **옛 votes 문서에 `runIndex` 가 없다**(§3.0 조건 4). 배포 시점에 진행 중인 판은 **0건**으로 실측 확인됐고(0단계), 완주 기록·Crown Card는 `roundProgress`·`crown_cards` 에 있어 무사하다. `linkSessionVote` 는 이관 중 그 필드를 채운다.

5. `loadTournament` 시그니처에 `isAnonymous: boolean` 추가하고 `loadInto` 에 넘긴다.
6. `setData` 에 `run` 인자를 추가하거나, 테스트가 `setState` 를 직접 쓰므로 그대로 둔다(후자 권장 — 호출부가 하나뿐이다).

- [ ] **Step 4: 통과 확인 + 커밋**

```bash
npx vitest run lib/__tests__/arena/voteStore.test.ts
git add lib/arena/voteStore.ts lib/__tests__/arena/voteStore.test.ts
git commit -m "feat(run-1): voteStore가 회차를 단독 결정 · votes에 회차 필터 (§9 함정 9)"
```

---

### Task 13: 라운드 전환 구독 · Champion 페이지 회차화

**Files:**
- Modify: `lib/arena/useRoundTransition.ts`
- Modify: `app/arena/[tournamentId]/champion/page.tsx`

**Interfaces:**
- Produces: `useRoundTransition(userId, tournamentId, runIndex)` — 세 번째 인자 추가

**왜:** 구독이 1회차 문서에 고정돼 있으면 2판째의 라운드 전환 안내가 영영 안 뜨고 THE FINAL에서 멈춘다 — 2026-07-06 HF-1.6과 **정확히 같은 유형**의 P0다.

- [ ] **Step 1: 훅에 회차를 넣는다**

```ts
export function useRoundTransition(
  userId: string | undefined,
  tournamentId: string | undefined,
  runIndex: number | undefined,
): RoundProgressEvent | null {
  const [event, setEvent] = useState<RoundProgressEvent | null>(null);

  useEffect(() => {
    if (!userId || !tournamentId || !runIndex) return;
    // 회차마다 진행 문서가 다르다. 1회차에 고정하면 2판째의 라운드 전환이 영영 안 뜨고
    // THE FINAL에서 멈춘다 — 2026-07-06 HF-1.6과 같은 유형의 P0다.
    const ref = doc(getDb(), "roundProgress", runDocId(userId, tournamentId, runIndex));
    const unsub = onSnapshot(
      ref,
      (snap) => setEvent(snap.exists() ? (snap.data() as RoundProgressEvent) : null),
      (err) => {
        // HF-1.6: 절대 조용히 삼키지 않는다 — 여기서 permission-denied 가 나면 리스너가
        // 죽고 라운드 전환 오버레이가 안 뜬다.
        console.error("[useRoundTransition] onSnapshot error", err);
        setEvent(null);
      },
    );
    return unsub;
  }, [userId, tournamentId, runIndex]);

  return event;
}
```
import 에 `import { runDocId } from "@/lib/run/runDocId";` 추가. 파일 상단 주석의 `roundProgress/{uid}_{tid}` 도 회차 표기로 갱신한다.

- [ ] **Step 2: Champion 페이지를 회차에 맞춘다**

`app/arena/[tournamentId]/champion/page.tsx`:
```ts
  const run = useVoteStore((s) => s.run);
  const progress = useRoundTransition(uid, tournamentId, run?.displayRunIndex);
  ...
  useEffect(() => {
    if (uid) void loadTournament(tournamentId, uid, Boolean(user?.isAnonymous));
  }, [uid, tournamentId, loadTournament, user?.isAnonymous]);
```
그리고 `canShare` 를 v2.1 게이트로 교체:
```ts
  const { canShare, canSave } = crownActionState({ isSignedIn: Boolean(user && !user.isAnonymous) });
  ...
  <CrownCardModal data={data} canShare={canShare} canSave={canSave} onSignIn={() => setLoginOpen(true)} tournamentId={tournamentId} category={tournament.category} />
```

- [ ] **Step 3: 빌드 확인 + 커밋**

```bash
npx tsc --noEmit   # Task 14가 page.tsx 를 고치기 전이라 아레나 페이지 오류는 남아 있을 수 있다
git add lib/arena/useRoundTransition.ts "app/arena/[tournamentId]/champion/page.tsx"
git commit -m "feat(run-1): roundProgress 구독·Champion 페이지를 회차 단위로"
```

---

### Task 14: 아레나 완주 화면 — [다시 참여] + 이전 참여 Crown Card 목록

**Files:**
- Modify: `app/arena/[tournamentId]/page.tsx`
- Create: `components/arena/RunCompleteActions.tsx`
- Create: `lib/crown/pastCards.ts`
- Create: `lib/__tests__/crown/pastCards.test.ts`

**Interfaces:**
- Consumes: `run: ActiveRunState` from `voteStore` · `crownActionState` (Task 7) · `runDocId`
- Produces:
  ```ts
  // lib/crown/pastCards.ts
  export interface PastCard { runIndex: number; championContestantId: string }
  export function pastRunIndices(displayRunIndex: number): number[];   // [1..displayRunIndex-1]
  ```

**§6 디자인 참조 — 기존 구조 위에 액션 영역만 얹는다:**
```
[ Crown Card (이번 판 결과) ]
[ 공유 ] [ 저장 ]
──────────────────────────────
[ 다시 참여 (2/5) ]          ← 신설. 한도 소진이면 비활성 + 보조 안내문
▸ 이전 참여의 Crown Card (1장) ← 신설. 접힘 목록, 각 카드 조회·공유
```
**새 색·새 컴포넌트 금지**(§5 DON'T 7) — 기존 버튼 스타일(`crown.module.css` 의 `.shareBtn`)을 재사용하고 색은 `var(--color-…)` 토큰만 쓴다.

**🔴 이전 카드는 쿼리하지 않는다.** `crown_cards` 규칙은 `cardId.split('_')[0] == uid` 로 소유자를 판정하는데, **list 연산에서는 와일드카드가 null이라 `split` 이 터져 거부된다**(voteGate 주석에 남은 §확인 필요 1, 2026-07-08 에뮬레이터 검증). 그래서 회차별 **`get` ≤5회**로 집는다.

- [ ] **Step 1: 순수 헬퍼 테스트를 쓴다**

```ts
/**
 * pastRunIndices — 완주 화면의 "이전 참여" 목록에 넣을 회차들 (AC 5).
 *
 * crown_cards 는 **쿼리하지 않는다.** 규칙이 `cardId.split('_')[0] == uid` 로 소유자를
 * 판정하는데 list 연산에서는 와일드카드가 null이라 split이 터져 거부된다(2026-07-08
 * 에뮬레이터 검증). 그래서 회차별 get으로 집으며, 그 회차 목록을 여기서 만든다.
 */
import { describe, expect, it } from "vitest";
import { pastRunIndices } from "@/lib/crown/pastCards";

describe("pastRunIndices", () => {
  it("1회차만 돌았으면 이전 카드가 없다", () => {
    expect(pastRunIndices(1)).toEqual([]);
  });

  it("3회차를 보고 있으면 1·2회차가 이전 카드다", () => {
    expect(pastRunIndices(3)).toEqual([1, 2]);
  });

  it("5회차면 네 장이 쌓인다 (AC 4·5)", () => {
    expect(pastRunIndices(5)).toEqual([1, 2, 3, 4]);
  });

  it("0이나 음수는 빈 목록 — 방어", () => {
    expect(pastRunIndices(0)).toEqual([]);
    expect(pastRunIndices(-1)).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인 → 구현**

`lib/crown/pastCards.ts`:
```ts
/**
 * 완주 화면의 "이전 참여의 Crown Card" 목록 (AC 5 — 지난 판의 카드는 전부 보존된다).
 *
 * ⚠️ `crown_cards` 를 **쿼리하지 마라.** 규칙이 문서 id 접두사로 소유자를 판정하는데,
 * list 연산에서는 와일드카드가 null이 되어 `split('_')` 이 터지고 읽기가 거부된다
 * (2026-07-08 에뮬레이터 검증 — voteGate 의 §확인 필요 1과 같은 함정). 회차마다 get 하며,
 * 한도가 5라 최대 4번이다.
 */
export interface PastCard {
  runIndex: number;
  championContestantId: string;
}

/** 지금 보고 있는 회차 이전의 회차들 — 오래된 순. */
export function pastRunIndices(displayRunIndex: number): number[] {
  if (!Number.isInteger(displayRunIndex) || displayRunIndex < 2) return [];
  return Array.from({ length: displayRunIndex - 1 }, (_, i) => i + 1);
}
```

Run: `npx vitest run lib/__tests__/crown/pastCards.test.ts` → PASS

- [ ] **Step 3: 완주 화면 액션 컴포넌트**

`components/arena/RunCompleteActions.tsx` — [다시 참여] 버튼 + 접힘 목록. 요구사항:
- 버튼 라벨 = `t("arena.run.playAgain", { n: run.runsToday, limit: run.limit })`
- `disabled = !run.canPlayAgain`
- 비활성일 때 보조 안내 한 줄:
  - `blockedReason === "daily_limit"` → `t("arena.vote.dailyLimit")` + `t("arena.vote.dailyLimitSub")`
  - `blockedReason === "deadline_passed"` → `t("arena.run.deadlinePassed")` *(Task 18에서 배선)*
  - `blockedReason === "guest_limit"` → 버튼 대신 로그인 모달을 여는 버튼(`onSignIn`)
- 게스트에게는 `t("arena.guest.remaining", { n: run.limit - run.runsToday })` 한 줄 (AC 6 안내 3지점 중 ②)
- 이전 카드가 있으면 `<details>` 로 접고 `<summary>` 는 `t("arena.run.pastCards")`
- 스타일은 `crown.module.css` 의 기존 클래스 재사용 · raw hex 금지

- [ ] **Step 4: 페이지 배선**

`app/arena/[tournamentId]/page.tsx`:

1. `useVoteGate` 사용을 교체한다. 게이트는 이제 스토어의 판정을 쓴다:
```ts
  const run = useVoteStore((s) => s.run);
  const progress = useRoundTransition(uid, tournamentId, run?.displayRunIndex);
  const isGuest = Boolean(user?.isAnonymous);
  const { canShare, canSave } = crownActionState({ isSignedIn: !isGuest });
```

2. 로드 effect에 `isAnonymous` 를 넘긴다:
```ts
  useEffect(() => {
    if (uid) void loadTournament(tournamentId, uid, isGuest);
  }, [uid, tournamentId, loadTournament, isGuest]);
```

3. **회차가 바뀌면 씨앗을 다시 받는다** (Task 12 Step 3의 ⚠️):
```ts
  // [다시 참여]로 회차가 올라가면 씨앗도 그 회차 문서에서 새로 받아야 한다 — 안 그러면
  // seed 0으로 대진이 만들어져 판마다 대진표가 달라진다는 AC 3이 깨진다.
  const seed = useVoteStore((s) => s.seed);
  useEffect(() => {
    const idx = run?.displayRunIndex;
    if (!uid || !idx || seed !== 0) return;
    void loadOrCreateBracketSeed(getDb(), uid, tournamentId, idx).then((s) =>
      useVoteStore.setState({ seed: s }),
    );
  }, [uid, tournamentId, run?.displayRunIndex, seed]);
```

4. `vote()` 의 게이트 호출을 교체:
```ts
      const gate = decideVoteGate({
        isAnonymous: isGuest,
        runDecision: /* voteStore 가 실어 온 판정 */,
        guestDecision: /* 동 */,
      });
```
> **더 단순한 길:** `run.screen` 이 이미 그 답이다. `run.screen !== "play"` 면 그 화면을 그리고 있으므로 `vote()` 는 애초에 호출되지 않는다. 따라서 `vote()` 안의 클라이언트 게이트는 **제거**하고, 서버 오류(`details.code`)로만 분기한다 — 판정이 한 곳(스토어)에만 남아 §9 함정 5가 구조로 막힌다. `decideVoteGate` 는 서버 오류 해석에 쓰지 않으므로 `voteGate.ts` 는 순수 판정 + 테스트로만 남는다(다른 호출부가 생길 때를 위한 계약).

5. `catch` 를 서버 코드 기준으로:
```ts
      } catch (e) {
        const detail = voteErrorDetailCode(e);
        if (detail === VOTE_ERROR_CODES.GUEST_LIMIT) {
          setModal("guest_limit");           // Google 버튼이 함께 뜬다 (AC 17)
        } else if (detail === VOTE_ERROR_CODES.DAILY_LIMIT) {
          setModal("daily_limit");
        } else {
          // deadline_passed 는 voteErrorMessageKey 가 마감 안내로 매핑한다 —
          // 일반 실패 배너가 아니다(2026-09-06 P0의 교훈).
          showToast(t(voteErrorMessageKey(e)), "error");
        }
        void loadTournament(tournamentId, uid!, isGuest);  // 서버 판정과 화면을 다시 맞춘다
      }
```

6. 완주 화면에 액션 영역을 얹는다:
```tsx
    if (champ && tournament) {
      const data = toCrownData(champ, tournament);
      return (
        <div className={styles.arena} data-arena-surface="champion">
          <CrownCardModal data={data} canShare={canShare} canSave={canSave} onSignIn={() => setModal("share")} tournamentId={tournamentId} category={tournament.category} />
          <RunCompleteActions
            run={run}
            isGuest={isGuest}
            contestants={contestants}
            tournament={tournament}
            onPlayAgain={() => useVoteStore.getState().startNextRun()}
            onSignIn={() => setModal("guest_limit")}
          />
          {loginModal}
        </div>
      );
    }
```

7. **게스트 첫 진입 안내** (AC 6 안내 3지점 중 ①) — 매치 화면 위에 한 줄:
```tsx
      {isGuest && run?.runsToday === 0 ? (
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--color-text-muted)", margin: "8px 0 0" }}>
          {t("arena.guest.welcome")}
        </p>
      ) : null}
```

8. `guest_limit` 화면 (`run.screen === "guest_limit"`) — 모달을 열고 Center 안내를 그린다.

- [ ] **Step 5: 검증 + 커밋**

```bash
npx tsc --noEmit && npx vitest run && npm run check:hex
git add "app/arena/[tournamentId]/page.tsx" components/arena/RunCompleteActions.tsx \
        lib/crown/pastCards.ts lib/__tests__/crown/pastCards.test.ts
git commit -m "feat(run-1): 완주 화면 [다시 참여] + 이전 참여 Crown Card 목록 · 게스트 안내"
```

---

### Task 15: `LoginModal` — `guest_limit` 신설 + 문구 교체 + 폐기 주석 정정

**Files:**
- Modify: `components/auth/LoginModal.tsx`

**Interfaces:**
- Produces: `export type LoginReason = "vote" | "share" | "daily_limit" | "guest_limit";`

**(b) 버튼 노출:** `showGoogleButton = reason !== "daily_limit"` 를 **그대로 두면** `guest_limit` 에서 Google 버튼이 자동으로 보인다 — `daily_limit` 과 달리 여기엔 갈 길이 있다(2026-09-05 대표 확정).

**(c) 상단 주석 정정 (필수):** 지금 파일 1~26줄이 **폐기된 HF-1 규칙**으로 적혀 있다 — `"5 NEW Tournaments / KST day"` · `"Voting inside an already-joined Tournament is unlimited"` · `"You've joined all 5 Tournaments for today (5/5)"`. **안 고치면 다음 사람이 주석을 읽고 옛 규칙으로 되돌린다** (대표). Stale-Doc Guard는 코드 주석에도 적용된다.

- [ ] **Step 1: 타입·주석·문구를 함께 고친다**

1. 상단 주석 블록을 교체:
```
 * LoginModal — 팬이 게이트에 걸렸을 때 뜨는 로그인 안내.
 *
 * 네 가지 이유:
 *   - "vote"        → 계속하려면 로그인 + Google 버튼
 *   - "share"       → Crown Card 저장(다운로드)에 로그인이 필요할 때 + Google 버튼
 *                     (v2.1: **공유는 게스트에게 열려 있다** — 잠긴 것은 저장뿐이다)
 *   - "guest_limit" → 게스트가 오늘 3판을 다 썼다 + Google 버튼 (v2.1의 주 전환 지점)
 *   - "daily_limit" → 로그인 팬이 이 Tournament의 하루 5판을 다 썼다 + 닫기만
 *
 * `daily_limit` 만 Google 버튼을 숨긴다 — 이미 로그인 상태라 버튼이 할 일이 없다. 나머지
 * 셋은 실제로 갈 길이 있어 버튼을 노출한다(차단 문구 원칙: 막고 나서 길을 열어준다).
 *
 * ⚠️ 참가 규칙은 **일일 판 한도**다 (LANGUAGE.md §2 · 2026-09-03 v2.0 · 09-06 v2.1):
 * 로그인 = 계정당·대회당 하루 5판 · 게스트 = 하루 통틀어 3판. HF-1의 "하루 새 대회 5개"
 * (Daily Participation Limit)는 **폐기된 정의**이고 LANGUAGE.md §7 금지어다.
```

2. `LoginReason` 에 `"guest_limit"` 추가.

3. `ModalStrings` 에 `guest_limit: string` · `guestLimitSub: string` 추가하고, 3언어 STRINGS를 §8 승인본으로 교체:
```ts
  ko: {
    ...
    daily_limit: "이 Tournament는 오늘 5번 참여를 모두 하셨어요 (5/5)",
    dailyLimitSub: "한국 시간 자정에 참여 횟수가 다시 채워져요. 다른 Tournament는 지금 바로 참여하실 수 있어요.",
    guest_limit: "오늘의 서비스(3번 참여)를 모두 소진하셨어요.",
    guestLimitSub: "로그인하면 Tournament마다 하루 5번까지 참여 — 내 선택이 랭킹에 반영돼요.",
  },
```
(en·es도 §8 표 그대로. `share` 의 ko는 v2.1 의미에 맞춰 "저장하려면 로그인이 필요해요"로 — **이건 표 밖 문구이므로 Task 16의 배너와 함께 대표 승인을 받는다. 승인 전에는 기존 문구를 그대로 둔다.**)

4. 부제 분기:
```ts
          <p style={{ ... }}>
            {reason === "daily_limit"
              ? t.dailyLimitSub
              : reason === "guest_limit"
                ? t.guestLimitSub
                : t.subtitle}
          </p>
```
(기존의 `reason !== "daily_limit" ? … : …` 이중 분기를 이 하나로 대체한다.)

5. `trigger_point` 매핑에 `guest_limit` 추가 (EVENT_SPEC v1.2):
```ts
      // v2.1에서 회원 전환의 주 지점이 "공유 잠금"에서 "3판 소진"으로 옮겨갔다.
      // "share"       → Crown Card의 **저장 잠금** 배너 → "card_modal" (이름 유지, 의미만 변경)
      // "guest_limit" → 게스트 3판 소진 모달 → "guest_limit" (신설)
      // "daily_limit" → 로그인 팬의 일일 한도 → "quota_limit" (버튼이 숨겨져 실제론 거의 0)
      // "vote"        → 전용 버킷 없음 → "other"
      const triggerPoint =
        reason === "share"
          ? "card_modal"
          : reason === "guest_limit"
            ? "guest_limit"
            : reason === "daily_limit"
              ? "quota_limit"
              : "other";
```

- [ ] **Step 2: 검증 + 커밋**

```bash
npx tsc --noEmit && npx vitest run
git add components/auth/LoginModal.tsx
git commit -m "feat(run-1): LoginModal guest_limit 신설 · 문구 승인본 · 폐기된 HF-1 주석 정정"
```

---

### Task 16: Crown Card — 공유 개방 / 저장 잠금

**Files:**
- Modify: `components/crown/CrownCardModal.tsx` · `ShareActions.tsx` · `ShareMenu.tsx` · `LoginPromptBanner.tsx` · `crown.module.css`

**Interfaces:**
- Consumes: `crownActionState` (Task 7)
- Produces: `CrownCardModal` 이 `canShare: boolean` + **`canSave: boolean`** 두 prop을 받는다. `ShareActions` 는 `canSave` 로 Download만 잠근다.

**핵심 CSS 변경:** 지금 `crown.module.css:209` 가 `[data-crown="unauth"] .shareActions { opacity: 0.4; pointer-events: none; }` 로 **버튼 세 개를 통째로** 잠근다. v2.1은 Download 하나만 잠가야 한다:
```css
/* v2.1 (2026-09-06): 공유는 게스트에게 열렸고 저장만 잠긴다. 예전에는 .shareActions 전체를
   잠갔다 — 그대로 두면 게스트가 공유 버튼을 눌러도 아무 일이 안 일어난다. */
.sfCrown[data-crown="unauth"] .shareBtn[data-locked="true"] { opacity: 0.4; pointer-events: none; }
```
`ShareActions` 의 Download 버튼에 `data-locked={!canSave}` 를 붙인다.

- [ ] **Step 1: `ShareActions` 를 고친다**

```tsx
interface ShareActionsProps {
  onDownload: () => void;
  onShareX: () => void;
  onOpenMenu: () => void;
  /** v2.1: 저장(다운로드)만 로그인 게이트. 공유 두 개는 게스트에게도 열려 있다. */
  canSave?: boolean;
}

export function ShareActions({ onDownload, onShareX, onOpenMenu, canSave = true }: ShareActionsProps): JSX.Element {
  return (
    <div className={styles.shareActions}>
      <button type="button" className={`${styles.shareBtn} ${styles.primary}`} onClick={onDownload}
              disabled={!canSave} data-locked={!canSave} aria-label="Download Crown Card">
      ...
      {/* Share to X · Instagram 버튼에서 disabled 를 제거한다 */}
```

- [ ] **Step 2: `CrownCardModal` 에 `canSave` 를 넣는다**

- prop에 `canSave: boolean` 추가.
- `crownState` 를 `!canSave ? "unauth" : view` 로 (배너·잠금 표시는 저장 기준).
- `<ShareActions … canSave={canSave} />`.
- `<LoginPromptBanner onSignIn={onSignIn} />` 는 그대로 (문구는 Step 4).
- `share_locked_view` 주석을 v1.2 의미로 갱신:
```ts
  // share_locked_view (EVENT_SPEC v1.2 §7): **이름은 유지, 의미만 갱신.** v2.1부터 이 배너는
  // "공유 잠금"이 아니라 **"저장(다운로드) 잠금"**이다. 이름을 바꾸면 GA 과거 데이터와 끊긴다.
```
- `fireCardCreated` 의 `is_guest: !canShare` 를 `is_guest: !canSave` 로 (공유는 이제 모두에게 열려 `canShare` 가 항상 true라 게스트 판별이 안 된다).

- [ ] **Step 3: `ShareMenu` 의 저장 경로도 잠근다**

`ShareMenu` 에 `canSave?: boolean` prop을 추가하고 Download · "Save both" 버튼에 `disabled={!canSave}` 를 건다. **"Share…"(네이티브)와 "Post to X"는 잠그지 않는다.**
> ⚠️ `nativeShareCrown` 은 Web Share를 못 쓰면 **다운로드로 폴백**한다(`CrownCanvasPreview.tsx:102`). 게스트에게 그 폴백이 돌면 저장 잠금이 뚫린다. `nativeShareCrown` 에 `allowDownloadFallback: boolean` 인자를 추가하고, 게스트일 때는 폴백 대신 `"fallback"` 만 반환해 토스트로 안내한다.

- [ ] **Step 4: 배너 문구 — 대표 승인 대기**

`LoginPromptBanner` 의 현재 ko 문구는 **"미리보기는 자유 · 공유·저장은 로그인이 필요합니다"** 로, v2.1에서 **사실과 다르다**(공유는 열렸다). 올바른 취지는 "저장하려면 로그인"이다.

> 🛑 **이 문구는 §8 표에 없다.** §5 DO 7 / 프롬프트 §5에 따라 **구현하지 말고 대표님께 승인을 요청한다.** 승인 전까지는 배너를 **`arena.guest.remaining` 의 뒷부분("저장하려면 로그인")과 톤이 일치하는 임시 문구 없이** 두지 말고, 이 태스크를 여기서 멈추고 보고한다.
> 제안 초안 (승인용, 3언어):
> - ko: 미리보기와 공유는 자유 · 저장하려면 로그인
> - en: Preview and share freely · sign in to save
> - es: Previsualiza y comparte · inicia sesión para guardar
>
> 같은 요청에 `LoginModal` 의 `share` ko 문구("공유하려면 로그인이 필요해요" → "저장하려면 로그인이 필요해요")도 함께 올린다 — 둘 다 v2.1에서 사실과 어긋난 같은 문장이다.

- [ ] **Step 5: 호출부 2곳 갱신 + 검증 + 커밋**

`app/arena/[tournamentId]/page.tsx` 와 `champion/page.tsx` 의 `<CrownCardModal … canSave={canSave} />`.

```bash
npx tsc --noEmit && npx vitest run && npm run check:hex
git add components/crown/ "app/arena/[tournamentId]/page.tsx" "app/arena/[tournamentId]/champion/page.tsx"
git commit -m "feat(run-1): 게스트 공유 개방 · 저장만 로그인 게이트 (v2.1)"
```

---

### Task 17: 계측 — `guest_limit_view` 신설 · 공유 3이벤트 공통 파라미터

**Files:**
- Modify: `components/auth/LoginModal.tsx` (또는 모달을 여는 호출부)
- Modify: `components/crown/ShareMenu.tsx`
- Modify: `marketing/00_strategy/EVENT_SPEC.md` (구현 완료 표시)

**근거:** EVENT_SPEC v1.2 (2026-09-08 대표 확정) §5·§6·§7·§9.

**1) `guest_limit_view` 신설 (§9)** — 게스트가 3판 소진으로 `guest_limit` 모달을 본 시점에 **1회**. 파라미터 = 공통 4개 + `runs_today`(=3).
> v2.1에서 회원 전환의 주 지점이 "공유 잠금"에서 "3판 소진"으로 옮겨갔다. **이 이벤트가 전환율의 분모다** — 없으면 게스트 전환율 30% 판정이 불가능하다.

아레나 페이지에서 발화한다(모달은 tournament·category를 모른다):
```tsx
  const guestLimitFiredRef = useRef(false);
  useEffect(() => {
    if (modal !== "guest_limit" || !tournament || guestLimitFiredRef.current) return;
    guestLimitFiredRef.current = true;
    void trackWithConsent("guest_limit_view", {
      ...commonEventParams(tournament, isGuest, lang),
      runs_today: run?.runsToday ?? GUEST_DAILY_RUN_LIMIT,
    });
  }, [modal, tournament, isGuest, lang, run?.runsToday]);
```

**2) `trigger_point` 에 `guest_limit`** — Task 15 Step 1의 5번에서 이미 했다. 확인만 한다.

**3) 공유 3이벤트에 공통 4파라미터 (§5)** — 09-08 실측: `crown_shared_x` · `crown_shared_native` · `crown_downloaded` 에 `is_guest`·`category`·`lang` 이 **붙어 있지 않다**(`ShareMenu` 가 `track()` 에 `tournamentId` 만 넘긴다). v2.1에서 게스트 공유가 열리므로 **`is_guest` 없이는 공유율이 부풀려 보인다.**

`ShareMenu` 에 `category?: string` · `isGuest: boolean` prop을 추가하고 `track` → `trackWithConsent` 로 바꾼 뒤 공통 파라미터를 붙인다:
```ts
  // EVENT_SPEC v1.2 §5: 09-08 실측에서 이 3이벤트에 공통 파라미터가 없었다. v2.1로 게스트
  // 공유가 열렸으므로 is_guest 로 나눠 보지 않으면 회원 공유율이 부풀려 보인다.
  const shareParams = {
    is_guest: isGuest,
    lang,
    ...(tournamentId ? { tournament_id: tournamentId } : {}),
    ...(category ? { category: category.toLowerCase() } : {}),
  };
  ...
  void trackWithConsent("crown_downloaded", { ...shareParams, fmt });
  void trackWithConsent("crown_shared_native", { ...shareParams, fmt });
  void trackWithConsent("crown_shared_x", { ...shareParams });
```
`CrownCardModal` 이 `category`·`isGuest`(= `!canSave`)를 `ShareMenu` 에 내려준다.

**4) EVENT_SPEC 갱신** — §5·§7·§9의 "PR 2에서 추가" 표기를 구현 완료로 바꾸고 개정 이력에 한 줄 추가한다.

- [ ] 검증 + 커밋
```bash
npx tsc --noEmit && npx vitest run
git add components/ marketing/00_strategy/EVENT_SPEC.md
git commit -m "feat(run-1): guest_limit_view 신설 · 공유 3이벤트 공통 파라미터 (EVENT_SPEC v1.2)"
```

---

### Task 18: ⛔ 마감 강제 복원 — 서버·문구·화면을 **한 커밋에**

> 🔴 **이 태스크는 반드시 마지막이고, 반드시 한 커밋이다.** §14: *"막는 것과 왜 막혔는지 알려주는 것은 한 쌍이다. 강제는 반드시 그 문구·화면과 같은 PR에서 켠다."* 2026-09-06 P0는 서버 강제(PR 1)와 설명(PR 2)이 갈라져서 났다. **화면 처리 없이 `deadlinePassed` 만 `true` 로 돌리는 커밋을 만들지 마라.**
>
> 선행 조건 확인: 0단계 정리 완료(커밋 `c3a026c` — 노출 대회 4개 전부 마감 남음) · Task 11(문구) · Task 14(화면) 완료.

**Files:**
- Modify: `functions/src/onVote.ts` · `functions/src/__tests__/onVote.test.ts`
- Modify: `components/arena/RunCompleteActions.tsx` · `app/arena/[tournamentId]/page.tsx`

- [ ] **Step 1: 서버 — 트랜잭션 안에서 마감을 실제로 판정한다**

`onVote.ts`:
```ts
import { isDeadlinePassed, toDeadlineMs } from "./_run/deadline";
...
    const tournamentRef = adminDb.doc(`tournaments/${tid}`);
...
      // 읽기 묶음에 tournament 를 더한다 — 마감은 트랜잭션 안에서 확인해야 한다.
      const [runsSnap, guestSnap, legacySnap, tSnap] = await Promise.all([
        tx.get(runsRef), tx.get(guestRef), tx.get(legacyProgressRef), tx.get(tournamentRef),
      ]);
...
      const decision = decideRun({
        ...
        // 🟢 2026-09-09 복원 (§14). PR 1에서 껐던 것을 §8 arena.run.deadlinePassed 문구와
        // 첫 진입 안내(AC 16)가 올라온 **지금** 되살린다. 마감이 없는 문서는 "마감 아님"으로
        // 읽는다 — 0단계에서 그런 대회를 전부 숨겼지만 코드가 데이터를 믿고 막으면 그게
        // 다음 P0다.
        deadlinePassed: isDeadlinePassed(toDeadlineMs(tSnap.get("tournamentDeadline")), Date.now()),
      });
      ...
      if (decision.status === "deadline_passed") {
        throw new HttpsError("failed-precondition", "tournament deadline passed", {
          code: VOTE_ERROR_CODES.DEADLINE_PASSED,
        });
      }
```
상단 주석의 "⚠️ 2026-09-06: Tournament Deadline 강제는 **꺼져 있다**" 블록을 지우고 복원 사실을 적는다.

- [ ] **Step 2: 서버 테스트**

```ts
describe("마감 강제 (AC 9·16 · §14 복원)", () => {
  it("마감이 지난 대회의 새 판은 deadline_passed 를 던진다", () => {
    expect(
      decideRun({
        runIndex: 1, lastRunDate: null, runsToday: 0, todayKST: "2026-09-09",
        currentRunComplete: true, deadlinePassed: true,
      }),
    ).toEqual({ status: "deadline_passed" });
  });

  it("진행 중인 판은 마감돼도 이어간다 (AC 9)", () => {
    // 마감 직전에 시작한 팬을 중간에 끊지 않는다(2026-09-05 대표 확정).
    expect(
      decideRun({
        runIndex: 2, lastRunDate: "2026-09-09", runsToday: 1, todayKST: "2026-09-09",
        currentRunComplete: false, deadlinePassed: true,
      }),
    ).toEqual({ status: "continue", runIndex: 2 });
  });

  it("마감이 없는 대회는 막지 않는다", () => {
    expect(isDeadlinePassed(toDeadlineMs(undefined), Date.now())).toBe(false);
  });
});
```

- [ ] **Step 3: 화면 — 안내 2지점을 배선한다**

1. **첫 진입 (AC 16)** — `run.screen === "deadline_passed"` 일 때 (한 판도 안 돈 팬):
```tsx
  if (run?.screen === "deadline_passed") {
    return (
      <Center>
        <div>
          <p style={{ marginBottom: 16 }}>{t("arena.run.deadlinePassed")}</p>
          <a href="/" style={{ color: "var(--color-gold)" }}>{t("arena.load.home")}</a>
        </div>
      </Center>
    );
  }
```
`arenaScreenState` 분기들 **뒤**, 라운드 전환 분기 **앞**에 둔다.

2. **완주 화면 (AC 9)** — `RunCompleteActions` 의 `blockedReason === "deadline_passed"` 가지에 `t("arena.run.deadlinePassed")` 한 줄. Task 14에서 자리를 만들어 뒀다.

3. **서버 오류** — Task 14 Step 4의 `catch` 가 `voteErrorMessageKey` 로 `arena.run.deadlinePassed` 를 띄운다(Task 11에서 매핑 완료). 일반 실패 배너가 아니다.

- [ ] **Step 4: 전체 검증 (§10 종료 조건)**

```bash
npx vitest run                                   # root 전부
cd functions && npm run build && npx vitest run && cd ..
npx tsc --noEmit
npm run check:hex
npm run lint

# 금지어 게이트 — 둘 다 0건이어야 한다
grep -rn "5표\|46표\|투표 무제한" app lib components
grep -rn "한 표\|표가 \|표를 " lib/i18n/messages.ts components app \
  --include=*.ts --include=*.tsx \
  | grep -v "표시\|목표\|대표\|발표\|도표\|표기\|표준\|표현\|표본"
```

- [ ] **Step 5: 커밋 — 서버·문구·화면이 한 커밋에 들어 있는지 확인하고 커밋한다**

```bash
git add functions/src/onVote.ts functions/src/__tests__/onVote.test.ts \
        components/arena/RunCompleteActions.tsx "app/arena/[tournamentId]/page.tsx"
git commit -m "feat(run-1): 마감 강제 복원 — 문구·화면과 한 쌍으로 (§14 · AC 9·16)"
```

---

## Self-Review

**Spec coverage — AC 17개 대조**

| AC | 태스크 | 검증 |
|---|---|---|
| 1 같은 대회 5판 · 6판째 차단 | 3·9·12 | `activeRun.test` "5판 소진" · `onVote` |
| 2 대회별 별도 5판 | 3·12 | `tournament_runs` 가 대회당 문서 (구조로 만족) |
| 3 판마다 대진표 상이 | 12·14 | 회차별 `bracketSeedDocId` + 씨앗 재로드 effect |
| 4 판마다 카드 1장 | 10 (PR 1 기반) | `crownCardId(uid, tid, runIndex)` |
| 5 지난 카드 보존 | 14 | `pastRunIndices` + 회차별 get |
| 6 게스트 3판 · 안내 3지점 · 공유/저장 | 1·3·14·16 | `guestRun.test` · `activeRun.test` 게스트 6건 |
| 7 KST 자정 리셋 | 1·3 | `activeRun.test` "자정이 지나면" |
| 8 이어하기 | 1·3·6 | `activeRun.test` "미완주 판" |
| 9 마감 · 진행 중 판 계속 | 2·3·18 | `activeRun.test` 마감 3건 + `onVote` 테스트 |
| 10 랭킹 반영 (isGuest 필드까지) | 5·10 | `voteRecord.test` — 집계 필터는 PR 3 |
| 11 옛 문서 = 1회차 | 3·12 | `activeRun.test` "옛 문서" · `legacySnap` |
| 12 문구 3언어 글자 일치 | 11 | `messagesContent.test` 30건 |
| 13 분당 40 · 41번째 안내 | 9·11 | `onVote.test` 속도 제한 4건 |
| 16 첫 진입 마감 안내 | 3·18 | `activeRun.test` AC 16 + 화면 배선 |
| 17 게스트 차단 사유 + Google 버튼 | 6·9·15 | `voteGate.test` guest_limit · `showGoogleButton` |
| 신규 `isGuest` 기록 · 이관 후 false | 5·9·10 | `voteRecord.test` · `linkSessionVote` |
| 계측 3건 | 17 | EVENT_SPEC v1.2 §5·§6·§9 |

**AC 14·15(랭킹 12시간 주기 · 다음 발표 시각)는 Phase 3(PR 3)이다** — 이 계획의 범위가 아니다.

**빠진 것으로 보이는 것 점검**
- `firestore.rules` — 변경 불필요. `tournament_runs`·`guest_runs` 읽기 규칙은 PR 1이 넣었고, `daily_participation` 블록 삭제는 Phase 3다.
- 복합 인덱스 — PR 1이 3개를 배포했다(§13). `votes(userId, tournamentId, runIndex)` 가 Task 12의 쿼리를 덮는다.
- E2E — §11.3의 의무 대상("5판 완주 → 6판째 차단" · 비로그인 게이트)은 프리뷰가 필요하므로 §7 수동 검증(Task 18 이후)으로 대신한다.

**미해결 — 대표 승인 대기 1건**
Task 16 Step 4: `LoginPromptBanner` 와 `LoginModal.share` 의 ko 문구가 v2.1에서 **사실과 다르다**("공유·저장은 로그인이 필요합니다" — 공유는 열렸다). §8 표에 없는 문구라 구현하지 않고 승인을 요청한다.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-09-run-1-pr2-screens.md`.
