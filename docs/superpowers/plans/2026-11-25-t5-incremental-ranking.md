# T5 차트 증분 집계 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 발표(KST 09·21시)마다 대회의 `votes` 를 전부 다시 읽던 것을, 지난 발표 뒤 "셀 수 있게 된" 기록만 읽어 누적에 더하는 방식으로 바꾸고(PR 1), 공개 차트 문서·기사에서 선택 수·선택 비율을 빼고 차트 사진을 영구 보관한다(PR 2).

**Architecture:** 순수 계산부(`incrementalTally.ts`)가 구간·셀 수 있게 된 시각·누적 더하기를 맡고, 저장부(`rankingAccumStore.ts`)가 Firestore 읽기·쓰기 순서를 맡는다(db 주입 → 에뮬레이터 통합 시험 가능). 크론 `scheduleRankingCache` 는 대회마다 저장부를 부르고, 누적을 지금의 `tallies`/`RunsTally` 모양으로 바꿔 **`buildRankingUpdate` 를 그대로** 부른다. 큰 대회의 처음부터 다시 세기는 5분 도우미 크론이 이어서 센다.

**Tech Stack:** Firebase Functions v2(`onSchedule` · asia-northeast3) · firebase-admin 12 · Firestore · vitest(유닛: `functions/` · 에뮬레이터 통합: `npm run test:rules`) · Playwright 에뮬레이터 E2E(`bash scripts/e2e-emulator.sh`).

**Spec:** `outputs/T5_설계보고_2026-11-24.md`(1단계 설계 · (가′) 승인) + 대표 결정 2026-11-24·25(아래 Global Constraints에 옮김). 메모리 `project_t5_incremental_ranking`.

## Global Constraints

- 산식(Crown Score v1.0 · `computeCrownRankings`) · `tallyRuns` · `tallyVotes` **코드를 고치지 않는다.** 게스트 판 제외 = `isGuest === true` 하나라도 있으면 판 전체 제외 · 칸 없는 옛 기록은 포함(앞으로만) · `runIndex` 없으면 1 · 완주 = 라운드 5 선택 있음. 게스트 거르기는 **메모리**에서만 — `where("isGuest","!=",…)` 금지.
- 발표 시각 `"0 9,21 * * *"` + `timeZone: "Asia/Seoul"` · 집계 창(마감 + 13시간 · `core/rankingWindow.ts`) · 화면 · 화면 문구 · 배너 · `onVote` 트랜잭션 구조 **변경 없음**.
- 구간 끝 = 발표 시작 − **2분**(`PUBLISH_LAG_MS = 120_000`). 구간은 **정수 ms 반열린 구간 `[start, end)`**(Review Focus 1).
- 그림자 비교 한계 = 대회 기록 **50,000건 미만**(`SHADOW_MAX_VOTES = 50_000`) · 전체 스위치 한 곳(`SHADOW_ENABLED = true`).
- 처음부터 다시 세기: `userId` 순 **5,000건씩**(`RECOUNT_PAGE = 5_000`) · 한 실행 예산 **400초**(`RECOUNT_BUDGET_MS = 400_000`) · 도우미 크론 **5분마다**.
- 새 서버 전용 자리(규칙 read·write 모두 false): `ranking_accum/{tid}`(+ `/history/{seq}` PR 2) · `ranking_recount_requests/{tid}` · `ranking_recount_jobs/{tid}` · `ranking_archive/{tid}/gens/{seq}`(PR 2).
- 차트 사진(`ranking_archive`)은 **영구 · 지우는 코드를 어디에도 만들지 않는다**(대회 삭제 때도 남긴다 · 대표 2026-11-25 "명예의 전당 재료").
- 공개 `ranking_cache`(PR 2 뒤): `voteCount` · `totalVotes` · `rate` **없음**. Crown Score와 세 비율 · 이름 · 아바타 재료 · `runsTotal` 은 그대로.
- 기사: `rate`(퍼센트) 금지 · 숫자 칸 라벨 허용 목록 = `CONTESTANTS` · `DEADLINE · KST` · `LANGUAGES` · `ACTIVE TOURNAMENTS`(허용 = 엔트리 수 · 날짜 · 순위 · 이름 · **대회 수** — 대표 결정 2026-11-25) · Crown Score를 기사 숫자 칸에 **새로 넣지 않는다**.
- 일괄 삭제 · 소급 고침 · 익명 계정 정리 금지. 옛 공개 `history` 문서는 지우지 않고 규칙으로 읽기만 막는다.
- `git push origin main` 금지. 브랜치 → PR → 대표 병합. PR 2는 PR 1 브랜치 위에 쌓고(base = PR 1 브랜치), PR 1 병합 뒤 base를 `main` 으로 바꾼다.
- PR 설명에 적을 것: 원장 D-52(런칭일) 고침은 A줄 문서 PR 몫이라 손대지 않음.
- 배포 순서: **색인 → (만들어짐 확인) → 규칙 → 함수.** 대표에게 주는 명령은 한 줄에 하나씩 따로 코드 상자로.
- 원장 번호는 **D-103부터**. 네 줄 형식(무엇 · 정의 · 왜 · 아니라고 한 것).
- 이 저장소 tsc는 Map/Set 직접 순회를 막는다(TS2802) — `Array.from(...)` 으로 받는다. 시험 파일까지 다 쓴 뒤 `npx tsc --noEmit`(루트) + `cd functions && npm run build` 를 다시 돌린다.
- 대표 화면용 글 · 커밋 · PR 설명에 금지 낱말(LANGUAGE.md: 표 · 투표 · 참가자 · 후보자 · 48명 · FIFA · 경기 · 배틀) 0건.

## Review Focus

1. **ms 경계** — Firestore 시각은 마이크로초까지 있다. `toMillis()` 는 내림이므로, 구간을 정수 ms `[start, end)` 로 두고 쿼리도 `>= Timestamp.fromMillis(start)` · `< Timestamp.fromMillis(end)` 로 맞춰야 `end` 바로 뒤 0.5ms 의 기록이 두 구간 모두에서 빠지지 않는다. → Task 2 통합 시험 `boundary-sub-ms`.
2. **나눠 옮긴 전환 판이 두 발표에 걸침** — 500건 조각 중 앞 조각만 옮겨진 채 발표가 돌면 판을 세지 않고, 마지막 조각의 `relinkedAt` 구간에서 한 번만 센다. → Task 1 유닛 `split-relink` + Task 5 통합.
3. **다시 세는 도중에 새 다시 세기 요청**(계정 삭제가 진행 중 다시 세기와 겹침) — 요청이 지워지지 않고 다음 발표에서 또 다시 센다. → Task 3 통합 `request-during-recount`.
4. **기록 0건 · 처음 발표되는 대회** — 누적 문서가 없으면 처음부터 다시 세기(0건)로 시작하고, 차트 캐시는 지금과 같은 빈 목록 · `runsTotal 0` 으로 쓰인다. → Task 4 통합 `empty-tournament`.
5. **같은 발표가 두 번 돌거나 중간에 죽음** — 누적 + 커서는 문서 하나 쓰기. 두 번째 실행은 빈 구간이라 값이 같다. 캐시 쓰기 직전 실패해도 다음 실행이 누적에서 다시 만든다. → Task 4 통합 `rerun-idempotent` · `crash-before-cache`.

## 대표 결정 (2026-11-25 · 계획 승인 때)

- 주간 기사 `ACTIVE TOURNAMENTS`(진행 중인 대회 수) 칸은 **남긴다.** 잠금 시험 허용 목록 = 엔트리 수 · 날짜 · 순위 · 이름 · 대회 수.
- 주간 기사에서 여러 대회의 1위를 늘어놓는 순서 = 각 대회 차트 1위의 Crown Score 큰 순 · 같으면 대회 제목 순(코티오 판단 · 숫자는 싣지 않음).

---

## 파일 지도

| 파일 | 책임 | PR |
|---|---|---|
| `functions/src/core/incrementalTally.ts` (새) | 순수: 셀 수 있게 된 시각 · 구간 · 선택 수 증분 · 판 증분 · 누적 더하기/변환 · 마지막 발표 판정 | 1 |
| `functions/src/core/rankingAccumStore.ts` (새) | Firestore: 누적 문서 · 증분 읽기 · 판 따로 읽기 · 다시 세기(이어 세기) · 요청 · 그림자 비교 · 실행 기록 | 1 |
| `functions/src/core/rankingCacheWrite.ts` (새) | 지금 크론의 "캐시 · history · 경보 쓰기"를 옮긴 것(동작 그대로) — 크론과 도우미가 함께 부른다 | 1 (PR 2에서 바뀜) |
| `functions/src/scheduleRankingCache.ts` | 얇은 포장: 집계 창 대회 → `publishTournament` | 1 |
| `functions/src/continueRankingRecount.ts` (새) | 5분 도우미 크론 | 1 |
| `functions/src/linkSessionVote.ts` | `relinkedAt` 찍기 · 충돌로 지운 옛 기록 → 다시 세기 요청 | 1 |
| `functions/src/onUserDelete.ts` | 지우는 조각과 같은 batch 에 다시 세기 요청 | 1 |
| `functions/src/core/tournamentAdminStore.ts` | 대회 삭제에 누적 · 요청 · 진행 문서 추가(사진은 **안 지움**) | 1 |
| `functions/src/index.ts` | 새 함수 내보내기 | 1 |
| `firestore.indexes.json` · `firestore.rules` | 색인 3개 · 새 자리 막기(PR 2: 공개 history 읽기 막기 · archive) | 1 · 2 |
| `functions/scripts/compare-ranking-accum.mjs` (새) | 관리자 비교(기본 dry-run) + 옛 기록(`runIndex`·`isGuest` 없음) 세기 | 1 |
| `lib/ranking/rankingTypes.ts` | `PublicRankingEntry` · `RankingCache` 에서 `totalVotes` 제거 | 2 |
| `functions/src/core/rankingArchive.ts` (새) | 순수: 캐시 → 사진 문서 모양 | 2 |
| `functions/src/core/newsDigestCore.ts` · `newsPrompts.ts` · `newsDraftAssembly.ts` | rate 제거 · 지시문 · 서버 그물 | 2 |
| `functions/scripts/survey-rate-articles.mjs` (+ `.lib.mjs`) (새) | 읽기 전용: 기존 기사 중 %/RATE 칸 목록 | 2 |
| 시드 · 시험 · E2E (아래 Task 12 목록) | `voteCount`·`totalVotes`·`rate` 빼기 | 2 |
| `outputs/DECISIONS_결정원장_v1.0_2026-09-11.md` · `CLAUDE.md` · `LANGUAGE.md` | 원장 D-103~ · 쓸어 맞추기 | 문서 |

---

# PR 1 — 증분 집계 (브랜치 `feat/t5-incremental-ranking`)

### Task 1: 순수 계산부 `incrementalTally.ts`

**Files:**
- Create: `functions/src/core/incrementalTally.ts`
- Test: `functions/src/__tests__/incrementalTally.test.ts`

**Interfaces:**
- Consumes: `tallyRuns`, `RunVote`, `RunsTally`, `ContestantAccum` (`../_ranking/tallyRuns`) · `tallyVotes` (`./rankingAggregator`) · `PUBLISH_INTERVAL_HOURS`, `CLOSED_GRACE_HOURS` (`./rankingWindow`)
- Produces:
  ```ts
  export const PUBLISH_LAG_MS = 120_000;
  export const RUN_VOTES = 46;
  export interface AccumVote extends RunVote { id: string; createdAtMs: number; relinkedAtMs: number | null; }
  export interface RankingAccum { voteCounts: Record<string, number>; runsTotal: number; byContestant: Record<string, ContestantAccum>; }
  export function countableAtMs(v: AccumVote): number;            // relinkedAtMs ?? createdAtMs
  export function inWindow(ms: number, startMs: number, endMs: number): boolean; // startMs <= ms < endMs
  export function windowEndMs(nowMs: number): number;              // nowMs - PUBLISH_LAG_MS
  export function runKeyOf(v: { userId: string; runIndex?: number }): string; // 같은 규칙: `${userId}\u0000${runIndex ?? 1}`
  export function emptyAccum(): RankingAccum;
  export function addAccum(a: RankingAccum, b: RankingAccum): RankingAccum;   // 새 객체, 입력 불변
  export function accumEquals(a: RankingAccum, b: RankingAccum): boolean;     // 0 값 키는 없는 것과 같다
  export function voteCountDelta(votes: AccumVote[], startMs: number, endMs: number): Record<string, number>;
  export function candidateRunKeys(votes: AccumVote[], startMs: number, endMs: number): string[];
  export function runDelta(runs: Map<string, AccumVote[]>, startMs: number, endMs: number): RankingAccum; // voteCounts = {}
  export function accumToRankingInputs(a: RankingAccum): { counts: Map<string, number>; runs: RunsTally };
  export function isLastPublishInWindow(deadlineMs: number, nowMs: number): boolean;
  ```

규칙(시험이 못 정하는 것만):
- `voteCountDelta`: 같은 `id` 는 한 번만(두 쿼리 결과를 합쳐 넣어도 됨) · `countableAtMs` 가 구간 안 · 그다음 `tallyVotes` 를 **그대로** 불러 셈(게스트 거르기 재구현 금지).
- `candidateRunKeys`: 구간 안 기록 중 `round === 5` 이거나 `relinkedAtMs` 가 구간 안인 것의 `runKeyOf`, 중복 없이.
- `runDelta`: 판마다 `max(countableAtMs)` 가 구간 안일 때만 그 판 기록 전부를 모아 **한 번의 `tallyRuns`** 에 넣고 결과를 `RankingAccum` 으로.
- `isLastPublishInWindow`: `nowMs + PUBLISH_INTERVAL_HOURS*3_600_000 > deadlineMs + CLOSED_GRACE_HOURS*3_600_000`.

- [ ] **Step 1: 실패하는 시험 작성** — 시험 안에 `makeRun({userId, runIndex, guest?, startMs, stepMs, relinkAt?})` 도우미(라운드 1~5 = 24·12·6·3·1 = 46건, 다음 라운드 출전자 = 앞 라운드 승자)를 두고:

```ts
it("golden: 증분을 여러 구간으로 나눠 더한 값 = 끝 시점 한 번에 센 값", () => {
  // 로그인 판 20 · 게스트 판 3 · runIndex 없는 옛 판 1 · isGuest 없는 옛 판 1 · 미완주 판 2
  // · 발표 경계에 걸친 판 2 · 게스트였다가 relink 된 완주 판 2 · 전환 뒤 이어서 끝낸 판 1
  const all = buildCorpus();
  const E = maxCountable(all) + 1;
  const full = addAccum({ ...emptyAccum(), voteCounts: voteCountDelta(all, 0, E) }, runDelta(groupByRun(all), 0, E));
  for (const cuts of [[E], [T1, E], [T1, T2, T3, E], randomCuts(seed, 7, E)]) {
    let acc = emptyAccum(), start = 0;
    for (const end of cuts) {
      const win = all.filter((v) => inWindow(v.createdAtMs, start, end) || (v.relinkedAtMs != null && inWindow(v.relinkedAtMs, start, end)));
      const keys = new Set(candidateRunKeys(win, start, end));
      const runs = groupByRun(all.filter((v) => keys.has(runKeyOf(v))));   // 판 따로 읽기 흉내
      acc = addAccum(acc, { ...runDelta(runs, start, end), voteCounts: voteCountDelta(win, start, end) });
      start = end;
    }
    expect(accumEquals(acc, full)).toBe(true);
  }
});
it("split-relink: 판의 앞 조각만 옮겨진 구간에서는 그 판을 세지 않는다", …); // runsTotal 0 → 다음 구간 1
it("guest run excluded but isGuest-missing legacy run counted", …);
it("runIndex 없는 기록은 회차 1 로 묶인다", …);
it("inWindow 은 [start,end) — end 와 같은 ms 는 다음 구간", () => { expect(inWindow(100, 0, 100)).toBe(false); expect(inWindow(100, 100, 200)).toBe(true); });
it("accumToRankingInputs → buildRankingUpdate 결과가 기존 전량 집계와 같다", …); // counts/runs 를 tallyVotes/tallyRuns(all) 과 비교
it("isLastPublishInWindow: 마감 2시간 전 발표 false · 마감 1시간 뒤 발표 true", …);
```

- [ ] **Step 2: 실패 확인** — `cd functions && npx vitest run src/__tests__/incrementalTally.test.ts` → FAIL(모듈 없음)
- [ ] **Step 3: 구현** — 위 시그니처대로. `tallyRuns`·`tallyVotes` 는 import 해서 부르기만.
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS. `cd functions && npm run build` 오류 0.
- [ ] **Step 5: 커밋** — `git commit -m "T5 PR 1 · 증분 계산부(셀 수 있게 된 시각 · [start,end) 구간 · 누적 더하기) + 골든 시험"`

### Task 2: 저장부 — 누적 문서 · 증분 한 번 (`rankingAccumStore.ts` 1/3)

**Files:**
- Create: `functions/src/core/rankingAccumStore.ts`
- Test: `tests/rules/ranking-accum.store.test.ts` (에뮬레이터 · `npm run test:rules`)

**Interfaces:**
- Consumes: Task 1 전부.
- Produces:
  ```ts
  export const ACCUM = "ranking_accum", REQUESTS = "ranking_recount_requests", JOBS = "ranking_recount_jobs";
  export interface AccumDoc { tournamentId: string; cursorMs: number; accum: RankingAccum; updatedAtMs: number; }
  export interface ReadCounts { created: number; relinked: number; runFetch: number; recount: number; shadow: number; }
  export function voteFromDoc(id: string, data: FirebaseFirestore.DocumentData): AccumVote; // Timestamp → ms (toMillis), relinkedAt 없으면 null
  export async function readAccum(db: Firestore, tid: string): Promise<AccumDoc | null>;
  export async function applyIncrement(db: Firestore, tid: string, base: AccumDoc, endMs: number, reads: ReadCounts): Promise<AccumDoc>;
  ```
- `applyIncrement` 순서: ① `votes where tournamentId==tid, createdAt >= fromMillis(base.cursorMs), createdAt < fromMillis(endMs)` ② 같은 조건의 `relinkedAt` ③ id로 합침 ④ `candidateRunKeys` ⑤ 판마다 구간 안 기록이 `RUN_VOTES` 미만이면 따로 읽기 — 회차가 있으면 `where userId, tournamentId, runIndex`(있는 색인), 회차 없는 옛 판이면 `where userId, tournamentId` 로 읽고 메모리에서 `runIndex` 없음/1만 ⑥ 누적 + `cursorMs = endMs` 를 **`set` 한 번**으로 `ranking_accum/{tid}` 에 쓴다. `endMs <= base.cursorMs` 면 아무것도 안 하고 `base` 를 돌려준다.

- [ ] **Step 1: 실패하는 통합 시험** — 에뮬레이터에 기록을 `createdAt: Timestamp.fromMillis(x)` 로 직접 심는다:
  - `increment-equals-full`: Task 1 골든 묶음을 심고 구간 3개로 `applyIncrement` → 마지막 `accum` 이 `accumEquals(…, 한 번에 센 값)`.
  - `boundary-sub-ms`: `createdAt = new Timestamp(Math.floor(E/1000), (E%1000)*1e6 + 500_000)`(= E ms + 0.5ms) 인 기록이 `[S,E)` 에서는 빠지고 `[E,F)` 에서 세어진다.
  - `straddling-run-fetch`: 라운드 1~4는 앞 구간, 라운드 5는 다음 구간 → 다음 구간에서 판 따로 읽기 1번(`reads.runFetch === 46`) · `runsTotal` 1.
  - `noop-when-end-not-after-cursor`.
- [ ] **Step 2: 실패 확인** — `npm run test:rules -- tests/rules/ranking-accum.store.test.ts` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS
- [ ] **Step 5: 커밋** — `"T5 PR 1 · 누적 문서 + 증분 한 번(문서 하나 쓰기) · 에뮬레이터 시험"`

### Task 3: 처음부터 다시 세기 · 이어 세기 · 요청 (`rankingAccumStore.ts` 2/3) + 도우미 크론

**Files:**
- Modify: `functions/src/core/rankingAccumStore.ts`
- Create: `functions/src/continueRankingRecount.ts`
- Modify: `functions/src/index.ts`
- Test: `tests/rules/ranking-accum.store.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const RECOUNT_PAGE = 5_000, RECOUNT_BUDGET_MS = 400_000;
  export interface RecountJob { tournamentId: string; asOfMs: number; lastUserId: string | null; partial: RankingAccum; final: boolean; startedAtMs: number; }
  export async function requestRecount(db: Firestore, tid: string, reason: "user-delete" | "relink-conflict" | "admin"): Promise<void>; // set merge {tournamentId, reason, requestedAt: serverTimestamp()}
  export function addRecountRequestToBatch(db: Firestore, batch: WriteBatch, tid: string, reason: …): void; // 같은 내용을 batch 에
  export async function runRecount(db: Firestore, tid: string, opts: { asOfMs: number; final: boolean; deadlineAtMs: number; nowMs: () => number }, reads: ReadCounts): Promise<{ done: true; accum: AccumDoc } | { done: false }>;
  ```
- 페이지: `votes where tournamentId==tid orderBy userId` (+ `startAfter(lastUserId)` · `limit(RECOUNT_PAGE)`). 페이지가 꽉 찼으면 마지막 `userId` 의 기록을 버리고(다음 페이지가 그 사람부터 다시 읽음) `lastUserId` = 그 앞 사람. 페이지 전체가 한 사람이면 `where userId==그 사람, tournamentId==tid` 로 그 사람만 따로 다 읽는다. 페이지마다 `[0, asOfMs)` 로 `voteCountDelta` + `runDelta` 를 `partial` 에 더한다.
- 예산(`nowMs() >= deadlineAtMs`)에 닿으면 `ranking_recount_jobs/{tid}` 에 진행 상태를 쓰고 `{done:false}`. 끝나면 트랜잭션 하나로: `ranking_accum/{tid}` = `{accum: partial, cursorMs: asOfMs}` · job 삭제 · 요청 문서는 **`requestedAt <= 다시 세기 시작 시각`일 때만** 삭제(그 뒤 들어온 요청은 남긴다).
- `continueRankingRecount`: `onSchedule({ schedule: "every 5 minutes", region: "asia-northeast3", timeoutSeconds: 540, memory: "512MiB" })` — `ranking_recount_jobs` 를 읽어(비었으면 끝) 각각 `runRecount` 이어 하기. `final: true` 인 job 이 끝나면 Task 4의 `writeCacheFromAccum` 을 불러 최종 차트를 쓴다.

- [ ] **Step 1: 실패하는 시험** — `recount-paging-carry`(`RECOUNT_PAGE` 를 시험에서 7로 낮춰 주입할 수 있게 `opts.pageSize?`) 결과 = 한 번에 센 값 · `recount-resume`(`nowMs` 가짜 시계로 첫 페이지 뒤 예산 초과 → job 문서 생김 → 두 번째 호출로 끝 → 값 같음 · job 없어짐) · `request-during-recount`(다시 세기 중간에 `requestRecount` → 끝난 뒤 요청 문서 **남아 있음**) · `request-before-recount-cleared`.
- [ ] **Step 2: 실패 확인** — `npm run test:rules -- tests/rules/ranking-accum.store.test.ts` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** → PASS · `cd functions && npm run build`
- [ ] **Step 5: 커밋** — `"T5 PR 1 · 처음부터 다시 세기(userId 순 5,000건 · 이어 세기 · 요청) + 5분 도우미 크론"`

### Task 4: 발표 흐름 · 그림자 비교 · 마지막 확정 · 실행 기록 (`rankingAccumStore.ts` 3/3 · 크론)

**Files:**
- Create: `functions/src/core/rankingCacheWrite.ts`
- Modify: `functions/src/core/rankingAccumStore.ts` · `functions/src/scheduleRankingCache.ts`
- Test: `tests/rules/ranking-accum.store.test.ts` · `functions/src/__tests__/scheduleRankingCacheCore.test.ts`(그대로 초록 확인)

**Interfaces:**
- Produces:
  ```ts
  // rankingCacheWrite.ts — 지금 scheduleRankingCache.ts 70~186행의 "contestants 읽기 → buildTallies → prevCache/history24 → buildRankingUpdate → history 회전 → cache set → admin_alerts" 를 옮긴 것. 동작 · 필드 그대로.
  export async function writeCacheFromAccum(db: Firestore, tid: string, accum: RankingAccum, nowMs: number): Promise<{ readsFixed: number }>;
  // rankingAccumStore.ts
  export const SHADOW_ENABLED = true, SHADOW_MAX_VOTES = 50_000;
  export interface PublishLog { tournamentId: string; mode: "increment" | "recount" | "recount-pending" | "final-recount"; reads: ReadCounts; ms: number; rssMb: number; shadow: "match" | "mismatch" | "skipped"; }
  export async function publishTournament(db: Firestore, tid: string, deadlineMs: number, nowMs: number, opts?: { clock?: () => number }): Promise<PublishLog>;
  ```
- `publishTournament` 순서:
  1. `endMs = windowEndMs(nowMs)`. 누적 · 요청 · job 을 읽는다.
  2. job 이 있으면 이어 세기, 없고 (누적 없음 · 요청 있음 · `isLastPublishInWindow`)이면 새 다시 세기(`asOfMs = endMs`, `final = isLastPublishInWindow`). 다 못 끝냈고 누적이 없으면 `mode: "recount-pending"` · 캐시를 안 쓰고 돌아간다(옛 캐시 유지). 다 못 끝냈지만 누적이 있으면 그 누적으로 4번부터.
  3. 누적이 있고 다시 세기로 이미 `cursorMs == endMs` 가 아니면 `applyIncrement`.
  4. 그림자: `SHADOW_ENABLED` 이고 `votes where tid count()` < `SHADOW_MAX_VOTES` 이면 `[0,endMs)` 전량을 한 번 읽어 `voteCountDelta`+`runDelta` 로 센 값과 `accumEquals`. 다르면 `admin_alerts.add({ type: "ACCUM_MISMATCH", tournamentId, detail, createdAt, resolved: false })` + 누적을 센 값으로 바꿔 쓴다(커서 그대로).
  5. 마지막 확정(`final-recount`)이 누적과 다르면 같은 경보(`detail` 에 "final").
  6. `writeCacheFromAccum` → `logger.info("rankingPublish", log)`.
- `scheduleRankingCache.ts`: 집계 창 대회 목록은 지금 코드 그대로, 루프 몸통은 `publishTournament(adminDb, id, deadlineMs, now.toMillis())` 하나. 대회 하나의 실패가 다른 대회를 막지 않게 `try/catch` + `logger.error`. 머리 주석에 T5 문단 추가.
- `ACCUM_MISMATCH` 는 `AnomalyTag` 가 아니다 — `admin_alerts` 문서 모양만 같다. 관리자 화면이 모르는 type 을 어떻게 보이는지 `components/admin` 에서 확인하고, 깨지면 그 화면은 고치지 말고 PR 설명에 적는다(범위 밖).

- [ ] **Step 1: 실패하는 시험** — `empty-tournament`(기록 0 · 누적 없음 → 캐시 `rankings: []` · `runsTotal: 0` · 누적 문서 `cursorMs = endMs`) · `rerun-idempotent`(같은 `nowMs` 로 두 번 → 캐시 `rankings` 같음 · 누적 같음) · `crash-before-cache`(`writeCacheFromAccum` 을 한 번 throw 하게 주입 → 누적은 진행 · 다음 호출에서 캐시가 맞음) · `shadow-mismatch-repairs`(누적 문서를 일부러 틀리게 써 둔 뒤 발표 → 경보 1건 + 캐시는 바른 값) · `final-recount-on-last-publish` · `cache-equals-legacy`(같은 기록으로 **옛 전량 방식**(`tallyVotes`+`tallyRuns`+`buildTallies`+`buildRankingUpdate`)이 만든 `rankings` 와 새 캐시 `rankings` 가 깊은 비교로 같음).
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현** (`writeCacheFromAccum` 는 먼저 옮기기만 하고 `scheduleRankingCacheCore.test.ts` 초록 확인)
- [ ] **Step 4: 통과 확인** — `npm run test:rules -- tests/rules/ranking-accum.store.test.ts` · `cd functions && npm test` → PASS
- [ ] **Step 5: 커밋** — `"T5 PR 1 · 발표 흐름(증분 · 그림자 비교 5만 건 미만 · 마지막 확정 · 실행 기록)"`

### Task 5: 전환 · 계정 삭제

**Files:**
- Modify: `functions/src/linkSessionVote.ts:313-355` · `functions/src/onUserDelete.ts:67-83`
- Test: `tests/rules/ranking-accum.store.test.ts`(전환 · 삭제 흐름을 저장부 + 함수 몸통 함수로) · 기존 `functions/src/__tests__/linkRoundProgress.test.ts` 등 초록 유지

**Interfaces:**
- Consumes: `addRecountRequestToBatch`, `requestRecount` (Task 3).
- 몸통을 시험하려고 함수 안 루프를 그대로 꺼낸다(동작 무변경): `export async function relinkGuestVotes(db, anonUid, googleUid, conflictTids: Set<string>): Promise<{ linked: number; legacyDeletedTids: string[] }>` (linkSessionVote.ts) · `export async function deleteUserVotes(db, uid): Promise<number>` (onUserDelete.ts).
- `relinkGuestVotes`: 옮기는 `update` 에 `data.isGuest === true` 일 때만 `relinkedAt: FieldValue.serverTimestamp()` 추가. 충돌로 지우는 기록 중 `isGuest !== true`(옛 기록)가 있던 대회 → 루프가 끝난 뒤 `requestRecount(db, tid, "relink-conflict")`.
- `deleteUserVotes`: `limit(BATCH_LIMIT)` 을 **450** 으로 낮추고, 같은 batch 에 그 조각의 대회마다 `addRecountRequestToBatch(…, "user-delete")`.

- [ ] **Step 1: 실패하는 시험** — `relink-guest-full-run`(게스트 완주 판을 발표 뒤 옮김 → 다음 발표에서 `runsTotal +1` 한 번 · 그다음 발표 그대로) · `relink-legacy-no-stamp`(`isGuest` 칸 없는 옛 기록은 `relinkedAt` 없음 · 두 번 안 셈) · `relink-split-pages`(`BATCH_LIMIT` 주입 10 → 조각 사이에 발표 끼움 → 마지막 조각 구간에서 1번) · `user-delete-requests-recount`(삭제 뒤 요청 문서 있음 → 다음 발표 `mode: "recount"` · 지운 판 빠짐) · `relink-conflict-legacy-request`.
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — `npm run test:rules` 전체 · `cd functions && npm test` → PASS
- [ ] **Step 5: 커밋** — `"T5 PR 1 · 전환 기록에 relinkedAt · 계정 삭제와 충돌 삭제는 다시 세기 요청"`

### Task 6: 대회 삭제 · 색인 · 규칙

**Files:**
- Modify: `functions/src/core/tournamentAdminStore.ts:107` · `firestore.indexes.json` · `firestore.rules`
- Test: `tests/rules/tournament-admin.store.test.ts` · `tests/rules/ranking-rules.test.ts`

- [ ] **Step 1: 실패하는 시험** — 삭제: `removeTournament` 뒤 `ranking_accum/{tid}`(+하위) · `ranking_recount_requests/{tid}` · `ranking_recount_jobs/{tid}` 없음. 규칙: 비로그인 · 로그인 · 관리자 클레임 모두 이 세 자리 read/write `assertFails`.
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현** — 삭제는 `recursiveDelete(ranking_accum/{tid})` + 두 문서 `delete`. 색인(`COLLECTION`): `votes (tournamentId ASC, createdAt ASC)` · `(tournamentId ASC, relinkedAt ASC)` · `(tournamentId ASC, userId ASC)`. 규칙: 세 `match` 블록에 `allow read, write: if false;` + 머리 목록 주석에 한 줄씩.
- [ ] **Step 4: 통과 확인** — `npm run test:rules` → PASS · 에뮬레이터 색인 경고 없음
- [ ] **Step 5: 커밋** — `"T5 PR 1 · 대회 삭제에 누적 자리 · 색인 3개 · 서버 전용 규칙"`

### Task 7: 관리자 비교 스크립트

**Files:**
- Create: `functions/scripts/compare-ranking-accum.mjs` · README 한 단락(`functions/scripts/README.md`)

- 쓰기 없음(코드에 `set`/`update`/`delete` 0 — 시험이 소스 글자로 확인). `functions/lib/core/…js`(빌드 결과)에서 `voteFromDoc` · `voteCountDelta` · `runDelta` · `accumEquals` 를 가져온다. 인자 `--project wc48-… --tournament <tid>`(대회 없으면 집계 창 안 전부). 출력: 대회마다 누적 vs 전량 일치 여부 · 다른 엔트리 · `runIndex` 없는 기록 수 · `isGuest` 없는 기록 수 · 읽은 건수.
- [ ] **Step 1: 실패하는 시험** — `functions/src/__tests__/compareRankingScript.test.ts`: 스크립트 소스에 `.set(` `.update(` `.delete(` `.add(` `batch(` 0건.
- [ ] **Step 2~4:** 구현 · 시험 통과 · 에뮬레이터 대고 한 번 실행해 출력 확인.
- [ ] **Step 5: 커밋** — `"T5 PR 1 · 관리자 비교 스크립트(읽기 전용)"`

### Task 8: PR 1 E2E · 점검 · PR

**Files:**
- Create: `e2e/emulator/t5-incremental-ranking.spec.ts` · 증거 폴더 `outputs/t5-evidence/`

- 시나리오: 대회 1개(마감 +30일) + 엔트리 48 + 로그인 판 12개(10판 기준 넘김)를 두 묶음으로 심는다 → `publishTournament(db, tid, deadline, T1)` → 묶음 2 + 게스트 판 2 + 경계에 걸친 판 1 → `publishTournament(…, T2)` → `/arena/{tid}/ranking?lang=ko` 열기 → Crown Score 줄 12개 이하 보임 · 화면 글에 선택 수 숫자 없음(기존 c3 단언 방식) · 콘솔 오류 0 · 1440·390 캡처 `t5-chart-1440.png`·`t5-chart-390.png` · 두 번째 `PublishLog`(읽은 건수)를 `outputs/t5-evidence/publish-log.json` 으로 저장 · 캐시 순서 = 옛 전량 방식 순서.
- [ ] **Step 1:** spec 작성 → `bash scripts/e2e-emulator.sh t5-incremental` FAIL(아직 연결 전이면) → 통과까지.
- [ ] **Step 2: 전체 점검** — 루트 `npx tsc --noEmit` · `npm test` · `npm run test:rules` · `cd functions && npm test && npm run build` · `bash scripts/e2e-emulator.sh t5-incremental` · `npm run check:docs`. 결과를 사전 점검 표로.
- [ ] **Step 3: PR** — `gh pr create --base main` 제목 "T5 PR 1 · 차트 증분 집계(셀 수 있게 된 시각 · 다시 세기 · 그림자 비교) — 화면 변경 없음". 설명: 무엇 · 왜 · 시험 증거 · 배포 순서(색인 → 규칙 → 함수 `scheduleRankingCache,continueRankingRecount,linkSessionVote,onUserDelete,` + 대회 삭제 콜러블 이름) · 되돌리기 · "원장 D-52는 A줄 문서 PR 몫이라 손대지 않음".

---

# PR 2 — 공개 칸 빼기 · 차트 사진 · 기사 rate 삭제 (브랜치 `feat/t5-public-fields`, base = PR 1 브랜치)

### Task 9: 공개 캐시에서 `voteCount`·`rate`·`totalVotes` 빼기 + 서버 전용 경보 기준선

**Files:**
- Modify: `lib/ranking/rankingTypes.ts` · `functions/src/core/rankingCacheWrite.ts` · `firestore.rules:368-379`
- Test: `tests/rules/ranking-accum.store.test.ts` · `tests/rules/ranking-rules.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type PublicRankingEntry = Omit<CrownRankingEntry, "voteCount" | "rate">;
  export function toPublicEntry(e: CrownRankingEntry): PublicRankingEntry;   // rankingTypes.ts 옆 순수 함수(lib/ranking/publicEntry.ts)
  export interface RankingCache { tournamentId: string; rankings: PublicRankingEntry[]; runsTotal: number; generationSequence: number; generatedAt: TimestampLike; previousGeneratedAt: TimestampLike | null; }  // RankingSnapshot 을 더는 extends 하지 않음 · totalVotes 없음
  ```
- `writeCacheFromAccum`: 공개 캐시는 `toPublicEntry` 로 쓴다. 경보 기준선은 `ranking_accum/{tid}/history/{seq}` 에 **이번 세대의 `RankingSnapshot`(voteCount·rate 포함)** 을 쓰고, `prev = seq−1` · `history24 = seq−2` 를 거기서 읽으며 `seq−3` 을 지운다. 그 자리에 문서가 없을 때만(배포 뒤 첫 발표) 옛 공개 `ranking_cache/{tid}` · `ranking_cache/{tid}/history/{seq−2}` 를 기준선으로 한 번 읽는다(`voteCount` 가 있을 때만). 공개 `history` 에는 더 쓰지 않는다. `generationSequence` 는 공개 캐시 값 + 1 그대로.
- 규칙: `ranking_cache/{tid}/history/{seq}` → `allow read, write: if false;`(주석: T5 PR 2 · 선택 수가 실린 옛 문서 · 지우지 않음).
- 루트 `npx tsc --noEmit` 로 화면 쪽 읽는 곳(`RankList` · `homeData` · `arenaHomeData` · `recordsData` · `lastRankingUpdate`)이 `voteCount`/`rate`/`totalVotes` 를 안 읽는지 확인. 읽는 곳이 나오면 멈추고 보고(화면 변경 = 범위 밖).

- [ ] **Step 1: 실패하는 시험** — `public-cache-has-no-counts`(캐시 행 키에 `voteCount`·`rate` 없음 · 문서에 `totalVotes` 없음) · `baseline-private-history`(세 번 발표 → `ranking_accum/{tid}/history` 에 2·1·0 중 최근 2~3개 · T-3 이 seq−2 를 씀) · `baseline-fallback-once`(옛 모양 공개 캐시만 있는 상태에서 발표 → T-4 경보 판정이 옛 값 사용) · 규칙: 공개 `history` 읽기 비로그인 `assertFails` · `ranking_cache/{tid}` 읽기는 그대로 `assertSucceeds`.
- [ ] **Step 2~4:** FAIL 확인 → 구현 → `npm run test:rules` · `npx tsc --noEmit` · `cd functions && npm test` PASS
- [ ] **Step 5: 커밋** — `"T5 PR 2 · 공개 차트에서 선택 수 · 비율 · 합계 빼기 · 경보 기준선은 서버 전용"`

### Task 10: 차트 사진 영구 보관

**Files:**
- Create: `functions/src/core/rankingArchive.ts`
- Modify: `functions/src/core/rankingCacheWrite.ts` · `firestore.rules`
- Test: `functions/src/__tests__/rankingArchive.test.ts` · `tests/rules/ranking-accum.store.test.ts` · `tests/rules/tournament-admin.store.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const ARCHIVE = "ranking_archive";
  export interface ArchiveRow { rank: number; contestantId: string; name: string; nameI18n?: NameI18n; crownScore: number; placementRate: number; winRate: number; shareRate: number; }
  export interface ArchiveDoc { tournamentId: string; seq: number; generatedAtMs: number; runsTotal: number; rows: ArchiveRow[]; }
  export function toArchiveDoc(cache: { tournamentId: string; generationSequence: number; runsTotal: number; rankings: PublicRankingEntry[] }, generatedAtMs: number): ArchiveDoc;
  ```
- 쓰기: 발표마다 `ranking_archive/{tid}/gens/{seq}` `set` 1건(같은 seq 다시 쓰면 덮어씀 = 다시 돌려도 같음). 지우는 코드 없음. 규칙 read·write false.
- [ ] **Step 1: 실패하는 시험** — 유닛: 행 키가 정확히 위 8개(+있으면 `nameI18n`)뿐 · `voteCount`·`rate`·`videoId`·`imageUrl` 없음. 통합: `two-publishes-two-archives`(발표 2번 → 문서 2개) · `archive-survives-tournament-delete`(`removeTournament` 뒤에도 `ranking_archive/{tid}/gens` 남음) · 규칙 3층 `assertFails`. 소스 검사: 저장소 전체 `git grep -n "ranking_archive"` 결과에 `delete`/`recursiveDelete` 가 같은 줄에 0건.
- [ ] **Step 2~4:** FAIL → 구현 → PASS
- [ ] **Step 5: 커밋** — `"T5 PR 2 · 차트 사진 영구 보관(지우는 장치 없음 · 대표 2026-11-25)"`

### Task 11: 기사에서 rate 삭제 · AI 지시문 · 서버 그물 · 잠금 시험

**Files:**
- Modify: `functions/src/core/newsDigestCore.ts` · `functions/src/core/newsPrompts.ts:90-105,145,153` · `functions/src/core/newsDraftAssembly.ts`(`parseNewsDraftReply`)
- Test: `functions/src/__tests__/newsDigestCore.test.ts` · `newsPrompts.test.ts` · 새 `newsNumberLock.test.ts` · 기존 `generateNewsDraft.core.test.ts`·`newsTriggers.core.test.ts` 고치기

**Interfaces:**
- `RankingRowLike`: `rate` 삭제 · `crownScore?: number` 추가(주간 순서에만 · 밖으로 안 나감). `rankingRowFromCache` 는 `rank`·`contestantId`·`name`·`nameEn`·`crownScore` 만.
- `DigestLeader`: `rate` 삭제. 키 허용 = `rank`·`contestantId`·`name`·`nameEn`·`isChampion`·`tournamentTitle`.
- `buildResultDigest`: `stats` = `[CONTESTANTS]` 만. `leaders` = 캐시 `rank` 순(= 차트 Crown Score 순) 상위 3.
- `buildWeeklyDigest`: 대회마다 `rank` 1 행 → `crownScore` 큰 순 · 같으면 `tournamentTitle` 순 · 상위 3. `stats` = `[ACTIVE TOURNAMENTS]`. `TOP MOMENTUM` 삭제.
- `export const ALLOWED_STAT_LABELS = ["CONTESTANTS", "DEADLINE · KST", "LANGUAGES", "ACTIVE TOURNAMENTS"] as const;`(newsDigestCore.ts)
- `newsPrompts.ts`: 근거 줄 `"선두(순위):"` + `"  - {rank}위 {name}{영어 이름 주석}"`(+ Champion · 대회 제목) — 퍼센트 없음. 145·153행 지시에서 "비율(%)" 문장을 "순위와 이름으로"로 바꾼다. `OUTPUT_SPEC` 규칙 줄에 덧붙임(글자 그대로): `"퍼센트·비율·선택 수를 쓰지 마라. stats 블록의 수치는 근거 데이터에 있는 수치(엔트리 수·날짜·대회 수)만 쓴다."`
- 서버 그물 `parseNewsDraftReply`: `stats` 블록 항목 중 `n` 또는 `l` 에 `%` · `/rate|비율|득표|선택 수|votes?/i` 가 있으면 그 항목을 버리고, 빈 블록이 되면 블록을 버린다.

- [ ] **Step 1: 실패하는 잠금 시험** (`newsNumberLock.test.ts`):
```ts
it("모든 근거의 숫자 칸 라벨은 허용 목록뿐", () => {
  for (const d of [openDigest, resultDigest, weeklyDigest]) for (const s of d.stats) expect(ALLOWED_STAT_LABELS).toContain(s.label);
});
it("근거 · AI 재료 어디에도 % 와 rate 가 없다", () => {
  for (const p of [buildOpenPrompt(…), buildResultPrompt(…), buildWeeklyPrompt(…), buildColumnPrompt(…)]) {
    expect(p.user ?? p).not.toMatch(/%/); expect(JSON.stringify(p)).not.toMatch(/\brate\b/i);
  }
  for (const l of [...resultDigest.leaders, ...weeklyDigest.leaders]) expect(Object.keys(l).every((k) => LEADER_KEYS.includes(k))).toBe(true);
});
it("rate 칸이 캐시에 남아 있어도 근거로 새지 않는다", …); // rankingRowFromCache({…, rate: 61.2, voteCount: 9})
it("결과 기사 선두 순서 = 차트 rank 순", …);
it("AI 지시문에 금지 문장이 들어 있다", () => expect(OUTPUT_SPEC_TEXT).toContain("퍼센트·비율·선택 수를 쓰지 마라"));
it("그물: AI 가 stats 에 61.2% 를 넣으면 그 항목이 빠진다", …);
```
(프롬프트 함수가 돌려주는 모양은 `newsPrompts.ts` 실제 반환형에 맞춰 단언을 고른다.)
- [ ] **Step 2: 실패 확인** — `cd functions && npx vitest run src/__tests__/newsNumberLock.test.ts` → FAIL
- [ ] **Step 3: 구현** + 머리 주석의 `TODO(ND-CROWN-SCORE)`·"rate (%)" 설명을 지금 규칙으로 고침
- [ ] **Step 4: 통과 확인** — `cd functions && npm test` → PASS · `npm run build`
- [ ] **Step 5: 커밋** — `"T5 PR 2 · 기사에서 선택 비율 삭제(TOP RATE · RUNNER-UP RATE · TOP MOMENTUM) · AI 지시문 · 서버 그물 · 잠금 시험"`

### Task 12: 시드 · 시험 정리 · 기존 기사 읽기 전용 조사 · PR 2 E2E

**Files:**
- Modify: `scripts/seed-chart-preview.mjs` · `functions/scripts/seed-preview.lib.mjs`(있으면 `.mjs` 도) · `e2e/c3-ranking.spec.ts` · `e2e/name-i18n-screens.spec.ts` · `e2e/emulator/image1-pr3-takedown.spec.ts` · `e2e/emulator/image1-stage-cover-chart-card.spec.ts` · `e2e/emulator/translate-crash.spec.ts` · `tests/rules/ranking-rules.test.ts` · `e2e/emulator/t5-incremental-ranking.spec.ts`
- Create: `functions/scripts/survey-rate-articles.lib.mjs` · `survey-rate-articles.mjs` · 시험 `functions/src/__tests__/surveyRateArticles.test.ts`

- 시드 · 시험의 캐시 행에서 `voteCount`·`rate`, 문서에서 `totalVotes` 를 뺀다(`git grep -n "voteCount\|totalVotes\|rate:" -- e2e scripts tests functions/scripts` 결과 0 — 경보 시험처럼 서버 전용 값이 필요한 곳 제외).
- 조사 스크립트: `news` 컬렉션을 읽기만 한다. 문서 모양은 `lib/news/articleDoc.ts` 를 보고 정한다. 걸리는 조건은 두 가지다. ① `evidence.stats` 라벨이 `/RATE|MOMENTUM/` 이거나 값에 `%` 가 있다. ② 본문 블록(언어마다)의 `stats` 항목에 `%` 가 있다. 출력은 제목(ko) · 상태 · 만든 날짜(KST) · 걸린 칸이다. 쓰기 0(Task 7과 같은 소스 검사). 실서비스 실행은 **읽기만** 하고, 결과는 PR 설명과 대표 보고에 표로 넣는다.
- E2E 덧붙임(t5 spec): 발표 2번 뒤 `ranking_cache/{tid}` 에 `totalVotes` 없음 · 행에 `voteCount`·`rate` 없음 · `ranking_archive/{tid}/gens` 문서 2개 · 차트 화면 캡처 다시(`t5-chart-pr2-1440.png`).
- [ ] **Step 1:** 조사 스크립트 순수 판정 시험 → FAIL → 구현 → PASS
- [ ] **Step 2:** 시드 · 시험 정리 → `npm run test:rules` · `npm test` PASS
- [ ] **Step 3:** E2E → `bash scripts/e2e-emulator.sh t5-incremental` PASS · CI 에서 도는 `c3-e2e` 는 PR 에서 확인
- [ ] **Step 4: 실서비스 읽기 전용 조사 실행** — `node functions/scripts/survey-rate-articles.mjs --project <실서비스 id>` (ADC · 읽기만) → 표 저장 `outputs/t5-evidence/rate-articles.md`
- [ ] **Step 5: 전체 점검 + PR** — Task 8 Step 2 명령 전부 + `gh pr create --base feat/t5-incremental-ranking`. 설명에 적을 것: 대표 결정 ④(rate 미사용 재확인 2026-11-25) · 조사 표 · 배포 순서(규칙 → 함수 `scheduleRankingCache,continueRankingRecount,generateNewsDraft,onChampionForNews,scheduleWeeklyNews`) · 배포 뒤 첫 발표 한 번은 경보 기준선을 옛 공개 문서에서 읽는다는 것.

---

# 문서 PR (브랜치 `docs/t5-ledger`, base = main)

### Task 13: 원장 D-103~ · CLAUDE.md · LANGUAGE.md

**Files:**
- Modify: `outputs/DECISIONS_결정원장_v1.0_2026-09-11.md`(끝에 추가) · `CLAUDE.md`(v2.16 머리줄 · 개정 이력 한 줄 · 서비스 정체성/대진 흐름 #8의 "선택 비율" 관련 문장이 있으면 맞춤) · `LANGUAGE.md`(새 낱말 "차트 사진"을 쓰면 정의 한 줄)

원장 항목(네 줄 · 무엇 · 정의 · 왜 · 아니라고 한 것), 번호는 그때 원장 끝 다음:
- **D-103 차트 증분 집계 (가′)** — 셀 수 있게 된 시각(relinkedAt 또는 createdAt · 판은 46건 중 가장 늦은 것) · 구간 `[커서, 발표 − 2분)` · 누적과 커서는 문서 하나 · 안전판 세 겹(그림자 비교 5만 건 미만 · 마지막 확정 · 다시 세기 요청) · 아니라고 한 것: 이미 더한 판 목록 · 판 끝날 때 더하기(onVote 변경) · 판 요약 문서.
- **D-104 차트 사진 영구 보관** — `ranking_archive` · 담는 것/안 담는 것 · 명예의 전당 재료 · 아니라고 한 것: 마감 뒤 1년 · 90일 · 대회 삭제 때 함께 지우기 · 지우는 장치.
- **D-105 선택 비율은 쓰지 않는다(공개 차트 · 기사)** — Vote Rate 폐기(2026-09-23) 재확인 2026-11-25 · 정의: rate = 엔트리 선택 수 ÷ 대회 선택 수 % · 왜: 차트와 다른 순서 · 잘못 읽히는 숫자가 기사로 나갈 위험 · 아니라고 한 것: TOP RATE 칸 유지 · Crown Score를 기사 숫자 칸에 넣기(대표 승인 전) · 옛 기사 고치기.
- **D-106 선택 수는 공개 문서에 싣지 않는다** — `voteCount`·`totalVotes` 는 서버 전용(경보 기준선) · 공개 history 읽기 막음 · 아니라고 한 것: 옛 문서 일괄 삭제.
- 번호 메모 한 줄(D-52 런칭일은 A줄 문서 PR 몫 · 손대지 않음).

- [ ] **Step 1:** 원장에 위 4항 추가(옮김용 줄 글자 그대로 — 메모리 `feedback_ledger_paste_by_pr`).
- [ ] **Step 2:** `git grep -n "rate\|득표율\|Vote Rate\|voteCount\|totalVotes" -- CLAUDE.md LANGUAGE.md CONTEXT_v0_6.md docs/lite-specs` 로 쓸어 맞출 곳을 찾고, 결정과 어긋난 문장만 고친다.
- [ ] **Step 3: 점검** — `npm run check:docs` PASS · 금지 낱말 0 · 새 링크 깨짐 0.
- [ ] **Step 4: 커밋 · PR** — `gh pr create --base main` "원장 D-103~D-106(T5 차트 증분 집계 · 차트 사진 영구 · 선택 비율 미사용 · 선택 수 비공개) · CLAUDE.md v2.16".

---

## 끝난 뒤 (대표 몫 · 병합 뒤)

PR 1 병합 → 색인 배포 → 콘솔에서 3개 "사용 설정됨" 확인 → 규칙 배포 → 함수 배포 → 다음 발표(09·21시) 뒤 `rankingPublish` 실행 기록과 차트 화면 확인. PR 2도 같은 순서(색인 없음). 명령은 그때 한 줄씩 따로 드린다(실서비스 배포는 메인 체크아웃을 `main` 으로 맞춘 뒤 — 배포 가드가 브랜치 이름 `main` 을 요구).
