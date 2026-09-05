# RUN-1 PR 1 — 서버 코어 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회차(runIndex)를 서버 코어 전체에 도입하되, **프로덕션 화면 동작은 이 PR로 바뀌지 않는다.**

**Architecture:** 순수 판정 모듈 `lib/run/` 3종을 만들고 기존 `copy-*.mjs` 관례로 `functions/src/_run/` 에 미러링해
클라이언트·서버가 같은 코드를 돌린다. 문서 이름은 `runDocId` 한 함수로만 만들며 **1회차는 접미사가 없다**(B안) —
그래서 옛 화면 + 새 서버 조합에서도 1회차 흐름이 그대로 돌아간다. 회차 인자는 전부 기본값 1이라 호출부가 안 바뀐다.

**Tech Stack:** TypeScript 5.5 · vitest · Firebase Functions v2 (Node) · Firestore · `@firebase/rules-unit-testing`

**Spec:** `docs/superpowers/specs/2026-09-05-run-1-participation-v2-design.md`
**정본 규칙:** `outputs/HANDOFF_RUN-1_참가규칙v2.0_2026-09-03.md` (§2 목표 · §3.0 구조 · §4 완료 조건 · §5 제약 · §9 함정)

## 진행 상황 — 세션이 끊겨도 여기만 보면 이어갈 수 있다

> 2026-09-05 대표 지시. **묶음이 끝날 때마다 커밋하고 아래 표를 갱신한다.**
> Task 9(onVote 재작성)가 가장 크므로 그 앞뒤로 특히 확실히 끊는다.
> 커밋한 뒤에는 **실제 파일 내용을 다시 읽어** 의도한 수정이 들어갔는지 확인하고 넘어간다
> (2026-09-05: 편집 스크립트가 중간에 죽어 커밋 메시지와 내용이 어긋난 사고가 있었다 —
> 커밋 메시지와 내용이 다른 건 가장 나쁜 종류의 사고다).

| 묶음 | 태스크 | 상태 | 커밋 |
|---|---|---|---|
| A | 1~4 순수 모듈 4종 (`kstReset`·`runDocId`·`decideRun`·`guestRun`) | ✅ **완료** (테스트 37건 · 루트 전체 812건 green · tsc 0) | `6a0bce2` |
| B | 5~8 미러링 배선 + `voteRecord`·`crownCardRecord`·`bracketSeed` | ☐ 미착수 | — |
| C | **9 `onVote` 재작성 + 옛 판정 모듈 삭제** | ☐ 미착수 | — |
| D | 10~12 `advanceRound`·`onChampionConfirmed`·`linkSessionVote` | ☐ 미착수 | — |
| E | 13~15 보안 규칙 + 인덱스 실측 + PR | ☐ 미착수 | — |

**이어받는 사람이 할 일**: 위 표에서 `☐ 미착수` 인 첫 묶음부터 시작한다.
직전 묶음의 커밋 해시로 `git show --stat` 해서 실제로 들어간 파일을 먼저 확인한다.

---

## Global Constraints

- **회차의 정본은 문서 "필드" `runIndex` 다.** id의 `_r{n}` 은 키 충돌 방지용일 뿐 — 로직은 **항상 필드를 읽는다** (§5 DO 1)
- **문서 id를 `split('_')` 로 잘라 tournamentId를 복원하는 코드를 새로 만들지 않는다** — 실제 슬러그가 `gen4_idol_48` 처럼 `_` 를 포함한다 (§5 DON'T 5 · §9 함정 2)
- **문서 이름을 만드는 곳은 `runDocId` 하나뿐이다.** 어디서도 문자열을 직접 조합하지 않는다 (§3.0 B안 조건 1)
- **1회차는 접미사 없음 · 2회차부터 `_r2`** (§3.0 B안)
- **순수 함수는 시계를 읽지 않는다.** `todayKST` 를 인자로 받는다. 날짜는 반드시 KST — `kstDate()`(서버) / `getTodayKST()`(클라)만 쓰고 `new Date().toISOString()` 은 금지 (§3.0 조건 1·2)
- **`bracket_seeds` 의 create-once 불변 규칙을 완화하지 않는다.** 새 판은 새 문서 id로 만든다 (§5 DON'T 4)
- **마이그레이션 스크립트 금지** (§5 DON'T 3)
- **"표"를 단위로 쓰는 문구를 만들지 않는다** — 사람에게 보이는 단위는 **판** 뿐 (§5 DON'T 1 · LANGUAGE.md 금지어)
- 이 PR은 **화면 문구를 건드리지 않는다** (문구는 PR 2)
- 커밋 메시지 말미: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

---

## File Structure

| 파일 | 역할 |
|---|---|
| `lib/run/kstReset.ts` (신규) | KST 자정 리셋 판정 **한 곳** — `isSameKstDay` |
| `lib/run/runDocId.ts` (신규) | 문서 이름을 만드는 **유일한 곳** |
| `lib/run/decideRun.ts` (신규) | 회차·한도·마감 판정 + `normalizeRunIndex` |
| `lib/run/guestRun.ts` (신규) | 게스트 하루 1판 판정 |
| `functions/scripts/copy-run.mjs` (신규) | `lib/run/` → `functions/src/_run/` 미러 |
| `functions/src/core/voteRecord.ts` | `runIndex` 검증 추가 |
| `functions/src/core/crownCardRecord.ts` | 카드 id·이미지 경로에 회차 |
| `lib/arena/bracketSeed.ts` | 씨앗 id·캐시 키에 회차 (기본값 1) |
| `functions/src/onVote.ts` | 회차 확정·카운터 기록 (participation·guestVoteGuard 대체) |
| `functions/src/advanceRound.ts` | 라운드 판정에 회차 필터 + roundProgress id |
| `functions/src/onChampionConfirmed.ts` | 카드 id·이미지 경로에 회차 |
| `functions/src/linkSessionVote.ts` | 게스트→로그인 이관 id 갱신 |
| `firestore.rules` | `tournament_runs` · `guest_runs` 규칙 신설 |
| **삭제** `functions/src/core/participation.ts` · `guestVoteGuard.ts` (+ 각 테스트) | 판정이 `_run/` 으로 이동 |

---

### Task 1: KST 리셋 판정 — `lib/run/kstReset.ts`

**Files:**
- Create: `lib/run/kstReset.ts`
- Test: `lib/__tests__/run/kstReset.test.ts`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: `isSameKstDay(lastRunDate: string | null, todayKST: string): boolean`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
// lib/__tests__/run/kstReset.test.ts
/**
 * kstReset — 자정 리셋 판정이 리포 전체에서 하나뿐임을 고정한다.
 * 1안(회차 누적 + 오늘 판 수)에서 자정 리셋은 문서 id가 아니라 코드 판정이 됐다.
 * 핸드오프 §3.0 조건 2가 지목한 "1안이 새로 만든 유일한 위험"이 여기다.
 */
import { describe, expect, it } from "vitest";
import { isSameKstDay } from "@/lib/run/kstReset";

describe("isSameKstDay", () => {
  it("① 같은 날이면 true", () => {
    expect(isSameKstDay("2026-09-05", "2026-09-05")).toBe(true);
  });

  it("② 어제면 false — 어제 값은 없는 것으로 본다", () => {
    expect(isSameKstDay("2026-09-04", "2026-09-05")).toBe(false);
  });

  it("③ 문서가 없어 날짜가 null이면 false", () => {
    expect(isSameKstDay(null, "2026-09-05")).toBe(false);
  });

  it("④ 빈 문자열도 false — 손상된 필드를 오늘로 읽지 않는다", () => {
    expect(isSameKstDay("", "2026-09-05")).toBe(false);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

```bash
npx vitest run lib/__tests__/run/kstReset.test.ts
```
Expected: FAIL — `Failed to resolve import "@/lib/run/kstReset"`

- [ ] **Step 3: 최소 구현**

```ts
// lib/run/kstReset.ts
/**
 * KST 자정 리셋 — 리포에서 이 판정을 하는 유일한 곳 (핸드오프 §3.0 조건 3).
 *
 * `tournament_runs` 와 `guest_runs` 는 자정에 문서를 지우거나 새로 만들지 않는다.
 * 대신 저장된 `lastRunDate` 가 오늘(KST)이 아니면 그날 값은 **없는 것으로 읽는다.**
 * 리셋 로직이 하나여야 테스트도 하나다.
 *
 * ⚠️ 이 파일은 `functions/src/_run/` 로 복사되므로 import를 가지지 않는다.
 */
export function isSameKstDay(
  lastRunDate: string | null,
  todayKST: string,
): boolean {
  return Boolean(lastRunDate) && lastRunDate === todayKST;
}
```

- [ ] **Step 4: 통과를 확인한다**

```bash
npx vitest run lib/__tests__/run/kstReset.test.ts
```
Expected: PASS — 4 passed

- [ ] **Step 5: 커밋**

```bash
git add lib/run/kstReset.ts lib/__tests__/run/kstReset.test.ts
git commit -m "feat(run-1): KST 자정 리셋 판정을 한 곳으로 (isSameKstDay)"
```

---

### Task 2: 문서 이름 — `lib/run/runDocId.ts`

핸드오프 §3.0 B안 조건 1. **"1회차만 예외"를 아는 코드는 이 파일 하나뿐이다.**

**Files:**
- Create: `lib/run/runDocId.ts`
- Test: `lib/__tests__/run/runDocId.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `runDocId(uid: string, tournamentId: string, runIndex: number): string`
  - `crownCardStoragePath(tournamentId: string, uid: string, runIndex: number): string`
  - `bracketSeedCacheKey(uid: string, tournamentId: string, runIndex: number): string`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
// lib/__tests__/run/runDocId.test.ts
/**
 * runDocId — 문서 이름을 만드는 유일한 곳 (핸드오프 §3.0 B안 조건 1).
 *
 * 1회차에 접미사를 붙이지 않는 이유는 PR 1(서버)만 배포된 구간을 없애기 위해서다 —
 * 옛 화면은 접미사 없는 roundProgress를 구독하므로, 1회차 이름이 바뀌면
 * 라운드 전환이 영영 안 뜨고 THE FINAL에서 멈춘다 (2026-07-06 HF-1.6과 같은 유형).
 *
 * 대표 경고: "1회차만 예외가 분기로 흩어지면 그게 다음 버그다." → 경계 3건을 여기 못 박는다.
 */
import { describe, expect, it } from "vitest";
import {
  bracketSeedCacheKey,
  crownCardStoragePath,
  runDocId,
} from "@/lib/run/runDocId";

const UID = "abc123";
// 실제 슬러그는 '_' 를 포함한다 (§9 함정 2) — 이름 규칙이 여기서 깨지면 안 된다.
const TID = "gen4_idol_48";

describe("runDocId", () => {
  it("① 1회차는 접미사가 없다 — 현행 문서 이름과 완전히 같다", () => {
    expect(runDocId(UID, TID, 1)).toBe("abc123_gen4_idol_48");
  });

  it("② 2회차는 _r2", () => {
    expect(runDocId(UID, TID, 2)).toBe("abc123_gen4_idol_48_r2");
  });

  it("③ 5회차는 _r5", () => {
    expect(runDocId(UID, TID, 5)).toBe("abc123_gen4_idol_48_r5");
  });

  it("④ 소유자 판정(docId.split('_')[0])이 회차와 무관하게 uid를 준다 — 보안 규칙이 여기 걸린다", () => {
    expect(runDocId(UID, TID, 1).split("_")[0]).toBe(UID);
    expect(runDocId(UID, TID, 4).split("_")[0]).toBe(UID);
  });

  it("⑤ 0회차·소수·NaN은 던진다 — 잘못된 회차로 만든 이름은 남의 판을 덮는다", () => {
    expect(() => runDocId(UID, TID, 0)).toThrow(/runIndex/);
    expect(() => runDocId(UID, TID, 1.5)).toThrow(/runIndex/);
    expect(() => runDocId(UID, TID, Number.NaN)).toThrow(/runIndex/);
  });
});

describe("crownCardStoragePath", () => {
  it("⑥ 1회차 이미지 경로는 현행과 같다", () => {
    expect(crownCardStoragePath(TID, UID, 1)).toBe("crown-cards/gen4_idol_48/abc123.png");
  });

  it("⑦ 2회차는 이미지가 따로 저장된다 — 1회차 그림을 덮으면 AC 5가 깨진다", () => {
    expect(crownCardStoragePath(TID, UID, 2)).toBe("crown-cards/gen4_idol_48/abc123_r2.png");
  });
});

describe("bracketSeedCacheKey", () => {
  it("⑧ 1회차 캐시 키는 현행과 같다", () => {
    expect(bracketSeedCacheKey(UID, TID, 1)).toBe("wc48_bracket_seed_abc123_gen4_idol_48");
  });

  it("⑨ 2회차는 다른 키 — 회차마다 씨앗이 달라야 대진표가 새로 섞인다 (AC 3)", () => {
    expect(bracketSeedCacheKey(UID, TID, 2)).toBe("wc48_bracket_seed_abc123_gen4_idol_48_r2");
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

```bash
npx vitest run lib/__tests__/run/runDocId.test.ts
```
Expected: FAIL — `Failed to resolve import "@/lib/run/runDocId"`

- [ ] **Step 3: 최소 구현**

```ts
// lib/run/runDocId.ts
/**
 * 회차가 붙는 문서 이름을 만드는 **유일한 곳** (핸드오프 §3.0 B안 조건 1).
 *
 * 규칙: **1회차는 접미사 없음 · 2회차부터 `_r{n}`**.
 * 1회차 이름을 현행과 같게 두는 것이 B안의 전부다 — PR 1(서버)만 배포된 구간에
 * 옛 화면이 접미사 없는 `roundProgress` 를 계속 구독해도 정상 동작한다.
 *
 * 호출부는 이 규칙을 몰라야 한다. 어디서도 문자열을 직접 조합하지 말고 이 함수를 통과시킨다.
 *
 * ⚠️ 이 파일은 `functions/src/_run/` 로 복사되므로 import를 가지지 않는다.
 */

/** 1회차는 빈 문자열. 이 규칙을 아는 코드는 이 파일 안뿐이다. */
function runSuffix(runIndex: number): string {
  if (!Number.isInteger(runIndex) || runIndex < 1) {
    throw new Error(`runIndex는 1 이상의 정수여야 합니다 (받음: ${runIndex}).`);
  }
  return runIndex === 1 ? "" : `_r${runIndex}`;
}

/** `bracket_seeds` · `roundProgress` · `crown_cards` 공통 문서 id. */
export function runDocId(
  uid: string,
  tournamentId: string,
  runIndex: number,
): string {
  return `${uid}_${tournamentId}${runSuffix(runIndex)}`;
}

/** Crown Card PNG의 Storage 경로 — 회차마다 파일이 따로여야 지난 카드가 보존된다(AC 5). */
export function crownCardStoragePath(
  tournamentId: string,
  uid: string,
  runIndex: number,
): string {
  return `crown-cards/${tournamentId}/${uid}${runSuffix(runIndex)}.png`;
}

/** 아직 서버가 확인해 주지 않은 씨앗의 localStorage 키. */
export function bracketSeedCacheKey(
  uid: string,
  tournamentId: string,
  runIndex: number,
): string {
  return `wc48_bracket_seed_${runDocId(uid, tournamentId, runIndex)}`;
}
```

- [ ] **Step 4: 통과를 확인한다**

```bash
npx vitest run lib/__tests__/run/runDocId.test.ts
```
Expected: PASS — 9 passed

- [ ] **Step 5: 커밋**

```bash
git add lib/run/runDocId.ts lib/__tests__/run/runDocId.test.ts
git commit -m "feat(run-1): 문서 이름을 만드는 유일한 함수 runDocId (1회차 접미사 없음)"
```

---

### Task 3: 회차·한도·마감 판정 — `lib/run/decideRun.ts`

**Files:**
- Create: `lib/run/decideRun.ts`
- Test: `lib/__tests__/run/decideRun.test.ts`

**Interfaces:**
- Consumes: `isSameKstDay` (Task 1)
- Produces:
  - `DAILY_RUN_LIMIT = 5`
  - `normalizeRunIndex(args: { runIndex: number; legacyRunExists: boolean }): number`
  - `effectiveRunsToday(args: { lastRunDate: string | null; runsToday: number; todayKST: string }): number`
  - `RunDecision = { status: "continue"; runIndex: number } | { status: "new_run"; runIndex: number } | { status: "limit_reached" } | { status: "deadline_passed" }`
  - `decideRun(args: { runIndex: number; lastRunDate: string | null; runsToday: number; todayKST: string; currentRunComplete: boolean; deadlinePassed: boolean; limit?: number }): RunDecision`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
// lib/__tests__/run/decideRun.test.ts
/**
 * decideRun — 회차·한도·마감을 판정하는 순수 함수. 클라이언트와 서버가 같은 코드를 돌린다.
 *
 * 핸드오프 §3.0 판정 순서:
 *   ① 진행 중인 판이 있으면 continue (마감·한도와 무관하게 이어간다)
 *   ② 마감 → deadline_passed  ③ 오늘 판 수가 한도 이상 → limit_reached  ④ 그 외 new_run
 *
 * 시계는 절대 읽지 않는다 — todayKST 를 주입받는다 (§3.0 조건 2).
 */
import { describe, expect, it } from "vitest";
import {
  DAILY_RUN_LIMIT,
  decideRun,
  effectiveRunsToday,
  normalizeRunIndex,
} from "@/lib/run/decideRun";

const TODAY = "2026-09-05";
const YESTERDAY = "2026-09-04";

/** 판을 한 번도 안 돈 로그인 Voter의 기본 사실관계. */
const base = {
  runIndex: 0,
  lastRunDate: null as string | null,
  runsToday: 0,
  todayKST: TODAY,
  currentRunComplete: false,
  deadlinePassed: false,
};

describe("normalizeRunIndex — 전환 시점의 유일한 옛 데이터 처리 (AC 11)", () => {
  it("① tournament_runs가 있으면 그 값을 그대로 쓴다", () => {
    expect(normalizeRunIndex({ runIndex: 3, legacyRunExists: true })).toBe(3);
  });

  it("② 배포 직후: 문서는 없는데 접미사 없는 옛 판이 있으면 1회차로 본다", () => {
    // 이게 없으면 '새 판 = 1회차'로 판정돼 완주된 1회차 문서 위로 다시 들어간다.
    expect(normalizeRunIndex({ runIndex: 0, legacyRunExists: true })).toBe(1);
  });

  it("③ 문서도 옛 판도 없으면 0 — 아직 한 판도 안 돌았다", () => {
    expect(normalizeRunIndex({ runIndex: 0, legacyRunExists: false })).toBe(0);
  });
});

describe("effectiveRunsToday — KST 자정 리셋 (AC 7)", () => {
  it("④ 날짜가 오늘이면 저장된 값을 그대로", () => {
    expect(effectiveRunsToday({ lastRunDate: TODAY, runsToday: 3, todayKST: TODAY })).toBe(3);
  });

  it("⑤ 날짜가 어제면 0 — 자정에 5판이 다시 채워진다", () => {
    expect(effectiveRunsToday({ lastRunDate: YESTERDAY, runsToday: 5, todayKST: TODAY })).toBe(0);
  });

  it("⑥ 문서가 없으면 0", () => {
    expect(effectiveRunsToday({ lastRunDate: null, runsToday: 0, todayKST: TODAY })).toBe(0);
  });
});

describe("decideRun", () => {
  it("⑦ 첫 판은 1회차 새 판이다", () => {
    expect(decideRun(base)).toEqual({ status: "new_run", runIndex: 1 });
  });

  it("⑧ 완주한 뒤에는 다음 회차 새 판 (AC 1)", () => {
    const r = decideRun({
      ...base, runIndex: 2, lastRunDate: TODAY, runsToday: 2, currentRunComplete: true,
    });
    expect(r).toEqual({ status: "new_run", runIndex: 3 });
  });

  it("⑨ 미완주 판은 이어한다 — 새 판이 아니고 한도를 안 쓴다 (AC 8)", () => {
    const r = decideRun({
      ...base, runIndex: 2, lastRunDate: TODAY, runsToday: 2, currentRunComplete: false,
    });
    expect(r).toEqual({ status: "continue", runIndex: 2 });
  });

  it("⑩ 오늘 5판을 다 쓰면 6판째는 막힌다 (AC 1)", () => {
    const r = decideRun({
      ...base, runIndex: 5, lastRunDate: TODAY, runsToday: 5, currentRunComplete: true,
    });
    expect(r).toEqual({ status: "limit_reached" });
  });

  it("⑪ 자정이 지나면 5판이 다시 채워지고 회차는 이어진다 (AC 7)", () => {
    // 어제 5판을 다 썼다. 오늘 6회차 새 판이 열려야 한다 — 회차는 되감기지 않는다.
    const r = decideRun({
      ...base, runIndex: 5, lastRunDate: YESTERDAY, runsToday: 5, currentRunComplete: true,
    });
    expect(r).toEqual({ status: "new_run", runIndex: 6 });
  });

  it("⑫ 마감된 Tournament는 새 판을 못 연다 (AC 9)", () => {
    const r = decideRun({
      ...base, runIndex: 1, lastRunDate: TODAY, runsToday: 1,
      currentRunComplete: true, deadlinePassed: true,
    });
    expect(r).toEqual({ status: "deadline_passed" });
  });

  it("⑬ 마감돼도 진행 중인 판은 이어간다 — 마감 직전 시작한 팬을 중간에 끊지 않는다 (AC 9)", () => {
    const r = decideRun({
      ...base, runIndex: 1, lastRunDate: TODAY, runsToday: 1,
      currentRunComplete: false, deadlinePassed: true,
    });
    expect(r).toEqual({ status: "continue", runIndex: 1 });
  });

  it("⑭ 한도를 다 써도 진행 중인 판은 이어간다", () => {
    const r = decideRun({
      ...base, runIndex: 5, lastRunDate: TODAY, runsToday: 5, currentRunComplete: false,
    });
    expect(r).toEqual({ status: "continue", runIndex: 5 });
  });

  it("⑮ 한도는 테스트에서 바꿀 수 있고 기본값은 5다", () => {
    expect(DAILY_RUN_LIMIT).toBe(5);
    const r = decideRun({
      ...base, runIndex: 1, lastRunDate: TODAY, runsToday: 1,
      currentRunComplete: true, limit: 1,
    });
    expect(r).toEqual({ status: "limit_reached" });
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

```bash
npx vitest run lib/__tests__/run/decideRun.test.ts
```
Expected: FAIL — `Failed to resolve import "@/lib/run/decideRun"`

- [ ] **Step 3: 최소 구현**

```ts
// lib/run/decideRun.ts
/**
 * 판(Run) 판정 — 클라이언트 게이트와 서버 onVote가 **같은 코드**를 돌린다.
 *
 * §9 함정 5: 두 게이트가 어긋나면 P0다(2026-07-05 사고가 이 유형). "같은 테스트로 묶는다"보다
 * "같은 코드를 실행한다"가 강하고, 그 수단(`copy-*.mjs` 미러링)이 이미 리포에 있다.
 *
 * 시계를 읽지 않는다 — `todayKST` 를 주입받는다(§3.0 조건 2). 그래야 자정 경계가 결정적으로 테스트된다.
 *
 * ⚠️ 이 파일은 `functions/src/_run/` 로 복사되므로 상대 경로 import만 가진다.
 */
import { isSameKstDay } from "./kstReset";

/** 계정당·Tournament당·하루(KST) 판 수 상한 (LANGUAGE.md 일일 판 한도). */
export const DAILY_RUN_LIMIT = 5;

export type RunDecision =
  | { status: "continue"; runIndex: number }
  | { status: "new_run"; runIndex: number }
  | { status: "limit_reached" }
  | { status: "deadline_passed" };

/**
 * 전환 시점의 유일한 옛 데이터 처리 (AC 11).
 *
 * 배포 직후에는 아무 계정에도 `tournament_runs` 문서가 없어 회차가 0이다. 그런데 이미 1판을
 * 완주해 둔 계정이 있다 — 그대로 두면 "새 판 = 1회차"로 판정돼 **완주된 1회차 문서 위로 다시
 * 들어가** 즉시 완주 화면이 뜨고 새 카드가 안 생긴다. 접미사 없는 옛 판이 있으면 그게 1회차다.
 *
 * 폴백 분기가 아니라 회차 번호를 한 번 보정하는 것뿐이고, 그 뒤 로직은 완전히 동일하다.
 */
export function normalizeRunIndex(args: {
  runIndex: number;
  legacyRunExists: boolean;
}): number {
  if (args.runIndex > 0) return args.runIndex;
  return args.legacyRunExists ? 1 : 0;
}

/** 저장된 날짜가 오늘(KST)이 아니면 그날 판 수는 없는 것으로 읽는다 (AC 7). */
export function effectiveRunsToday(args: {
  lastRunDate: string | null;
  runsToday: number;
  todayKST: string;
}): number {
  return isSameKstDay(args.lastRunDate, args.todayKST) ? args.runsToday : 0;
}

export function decideRun(args: {
  runIndex: number;
  lastRunDate: string | null;
  runsToday: number;
  todayKST: string;
  currentRunComplete: boolean;
  deadlinePassed: boolean;
  limit?: number;
}): RunDecision {
  const {
    runIndex,
    lastRunDate,
    runsToday,
    todayKST,
    currentRunComplete,
    deadlinePassed,
    limit = DAILY_RUN_LIMIT,
  } = args;

  // ① 진행 중인 판이 있으면 언제나 이어한다 — 한도도 마감도 이걸 막지 않는다.
  //    미완주 판은 이 경로로만 재진입되므로 "카드 없이 판만 태우는" 구멍이 구조적으로 없다.
  if (runIndex > 0 && !currentRunComplete) {
    return { status: "continue", runIndex };
  }
  // ② 새 판을 여는 경우에만 마감이 걸린다.
  if (deadlinePassed) return { status: "deadline_passed" };
  // ③ 오늘 쓴 판 수가 한도에 닿았는가.
  if (effectiveRunsToday({ lastRunDate, runsToday, todayKST }) >= limit) {
    return { status: "limit_reached" };
  }
  // ④ 새 판. 회차는 누적이라 자정이 지나도 되감기지 않는다.
  return { status: "new_run", runIndex: runIndex + 1 };
}
```

- [ ] **Step 4: 통과를 확인한다**

```bash
npx vitest run lib/__tests__/run/decideRun.test.ts
```
Expected: PASS — 15 passed

- [ ] **Step 5: 커밋**

```bash
git add lib/run/decideRun.ts lib/__tests__/run/decideRun.test.ts
git commit -m "feat(run-1): 회차·한도·마감 판정 decideRun + normalizeRunIndex"
```

---

### Task 4: 게스트 하루 1판 — `lib/run/guestRun.ts`

**Files:**
- Create: `lib/run/guestRun.ts`
- Test: `lib/__tests__/run/guestRun.test.ts`

**Interfaces:**
- Consumes: `effectiveRunsToday` · `isSameKstDay` (Task 1·3)
- Produces:
  - `GUEST_DAILY_RUN_LIMIT = 1`
  - `GuestRunDecision = { status: "allow" } | { status: "login_required" }`
  - `decideGuestRun(args: { lastRunDate: string | null; runsToday: number; runTournamentId: string | null; todayKST: string; tournamentId: string; currentRunComplete: boolean; limit?: number }): GuestRunDecision`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
// lib/__tests__/run/guestRun.test.ts
/**
 * decideGuestRun — 비로그인은 하루 **통틀어** 1판 (§5 DO 3, 2026-09-03 대표 확정 (가)안).
 *
 * §9 함정 4: 게스트 uid는 브라우저마다 새로 생기고 게스트의 선택도 랭킹에 집계된다.
 * 이 한도를 느슨하게 만들면 랭킹 조작 비용이 0이 된다.
 *
 * 한도는 Tournament를 가로지르므로 `guest_runs/{uid}` 문서 하나로 센다.
 * (회차 번호 자체는 게스트도 `tournament_runs` 에서 받는다 — 설계서 §1.4.)
 */
import { describe, expect, it } from "vitest";
import { decideGuestRun, GUEST_DAILY_RUN_LIMIT } from "@/lib/run/guestRun";

const TODAY = "2026-09-05";
const YESTERDAY = "2026-09-04";
const A = "gen4_idol_48";
const B = "best_stage_48";

const base = {
  lastRunDate: null as string | null,
  runsToday: 0,
  runTournamentId: null as string | null,
  todayKST: TODAY,
  tournamentId: A,
  currentRunComplete: false,
};

describe("decideGuestRun", () => {
  it("① 오늘 아직 안 돌았으면 허용한다", () => {
    expect(decideGuestRun(base)).toEqual({ status: "allow" });
  });

  it("② 오늘 시작한 그 판이 미완주면 이어하기를 허용한다 — 판을 새로 세지 않는다", () => {
    const r = decideGuestRun({
      ...base, lastRunDate: TODAY, runsToday: 1, runTournamentId: A, currentRunComplete: false,
    });
    expect(r).toEqual({ status: "allow" });
  });

  it("③ 완주한 판의 재도전은 로그인을 요구한다 (AC 6)", () => {
    const r = decideGuestRun({
      ...base, lastRunDate: TODAY, runsToday: 1, runTournamentId: A, currentRunComplete: true,
    });
    expect(r).toEqual({ status: "login_required" });
  });

  it("④ 다른 Tournament 진입은 로그인을 요구한다 — 하루 통틀어 1판이다 (AC 6)", () => {
    const r = decideGuestRun({
      ...base, lastRunDate: TODAY, runsToday: 1, runTournamentId: A,
      tournamentId: B, currentRunComplete: false,
    });
    expect(r).toEqual({ status: "login_required" });
  });

  it("⑤ 자정이 지나면 게스트도 1판이 다시 채워진다 (AC 7)", () => {
    // 날짜가 없으면 게스트가 영원히 1판만 하고 막힌다.
    const r = decideGuestRun({
      ...base, lastRunDate: YESTERDAY, runsToday: 1, runTournamentId: A, currentRunComplete: true,
    });
    expect(r).toEqual({ status: "allow" });
  });

  it("⑥ 어제 돌던 Tournament와 다른 곳이어도 오늘의 1판은 열린다", () => {
    const r = decideGuestRun({
      ...base, lastRunDate: YESTERDAY, runsToday: 1, runTournamentId: A, tournamentId: B,
    });
    expect(r).toEqual({ status: "allow" });
  });

  it("⑦ 한도 기본값은 1이다", () => {
    expect(GUEST_DAILY_RUN_LIMIT).toBe(1);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

```bash
npx vitest run lib/__tests__/run/guestRun.test.ts
```
Expected: FAIL — `Failed to resolve import "@/lib/run/guestRun"`

- [ ] **Step 3: 최소 구현**

```ts
// lib/run/guestRun.ts
/**
 * 게스트 한도 — 비로그인은 하루 **통틀어** 1판 (§5 DO 3).
 *
 * Tournament를 가로지르는 값이라 Tournament별 문서로는 못 센다 → `guest_runs/{uid}` 하나로 센다.
 * 자정 리셋은 `tournament_runs` 와 문자 그대로 같은 방식이다(읽을 때 날짜 비교) — §3.0 조건 3.
 *
 * ⚠️ 이 파일은 `functions/src/_run/` 로 복사되므로 상대 경로 import만 가진다.
 */
import { effectiveRunsToday } from "./decideRun";
import { isSameKstDay } from "./kstReset";

export const GUEST_DAILY_RUN_LIMIT = 1;

export type GuestRunDecision =
  | { status: "allow" }
  | { status: "login_required" };

export function decideGuestRun(args: {
  lastRunDate: string | null;
  runsToday: number;
  runTournamentId: string | null;
  todayKST: string;
  tournamentId: string;
  currentRunComplete: boolean;
  limit?: number;
}): GuestRunDecision {
  const {
    lastRunDate,
    runsToday,
    runTournamentId,
    todayKST,
    tournamentId,
    currentRunComplete,
    limit = GUEST_DAILY_RUN_LIMIT,
  } = args;

  const used = effectiveRunsToday({ lastRunDate, runsToday, todayKST });
  // 오늘의 판이 아직 남아 있다.
  if (used < limit) return { status: "allow" };

  // 오늘 판을 이미 썼다 — 그 판을 이어가는 것만 허용한다.
  const fresh = isSameKstDay(lastRunDate, todayKST);
  const sameRun = fresh && runTournamentId === tournamentId;
  if (sameRun && !currentRunComplete) return { status: "allow" };

  return { status: "login_required" };
}
```

- [ ] **Step 4: 통과를 확인한다**

```bash
npx vitest run lib/__tests__/run/guestRun.test.ts
```
Expected: PASS — 7 passed

- [ ] **Step 5: 커밋**

```bash
git add lib/run/guestRun.ts lib/__tests__/run/guestRun.test.ts
git commit -m "feat(run-1): 게스트 하루 1판 판정 decideGuestRun (KST 자정 리셋 포함)"
```

---

### Task 5: `lib/run/` 을 functions에 미러링

**Files:**
- Create: `functions/scripts/copy-run.mjs`
- Modify: `functions/package.json` (`build`·`test` 스크립트)
- Modify: `functions/.gitignore` (`src/_run/` 추가)

**Interfaces:**
- Consumes: `lib/run/*.ts` (Task 1~4)
- Produces: functions 쪽에서 `import { decideRun } from "./_run/decideRun"` 가 가능해진다

- [ ] **Step 1: 미러 스크립트를 쓴다**

```js
// functions/scripts/copy-run.mjs
/**
 * copy-run — 판(Run) 판정의 순수 모듈 `lib/run` 을 functions 빌드 트리로 미러링한다.
 *
 * 핸드오프 §9 함정 5: 클라이언트 게이트와 서버 onVote의 판정이 어긋나면 P0다.
 * 같은 테스트로 묶는 것보다 **같은 코드를 실행**하는 것이 강하고, 그 관례가 이미 리포에 있다
 * (copy-crown / copy-ranking / copy-news / copy-embed).
 *
 * functions는 별도 tsconfig(`rootDir: src`)라 리포 루트의 `lib/` 를 import할 수 없다 →
 * import 없는 `lib/run/*.ts` 를 빌드 시 `functions/src/_run/` 으로 복사한다. 복사본은 git-ignore.
 * 단일 진실 공급원 = `lib/run`.
 *
 * 여기 복사되는 파일은 절대 `@/` 경로나 브라우저 API를 import하지 않아야 한다.
 */
import { mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)); // functions/scripts
const root = join(here, "..", "..");                  // repo root
const libRun = join(root, "lib", "run");
const dest = join(here, "..", "src", "_run");

mkdirSync(dest, { recursive: true });

const files = ["kstReset.ts", "runDocId.ts", "decideRun.ts", "guestRun.ts"];

for (const f of files) {
  copyFileSync(join(libRun, f), join(dest, f));
}
console.log(`[copy-run] ${files.length} files → functions/src/_run/`);
```

- [ ] **Step 2: 빌드·테스트 스크립트에 배선한다**

`functions/package.json` 의 두 줄에 `node scripts/copy-run.mjs && ` 를 **맨 앞**에 추가한다 (다른 copy 스크립트와 같은 자리).

```jsonc
"build": "node scripts/copy-run.mjs && node scripts/copy-crown.mjs && node scripts/copy-ranking.mjs && node scripts/copy-news.mjs && node scripts/copy-embed.mjs && tsc",
"test":  "node scripts/copy-run.mjs && node scripts/copy-ranking.mjs && node scripts/copy-news.mjs && node scripts/copy-embed.mjs && vitest run",
```

`functions/.gitignore` 에 한 줄 추가한다 (기존 `src/_embed/` 아래):

```
src/_run/
```

- [ ] **Step 3: 복사와 빌드가 도는지 확인한다**

```bash
cd functions && node scripts/copy-run.mjs && npx tsc --noEmit
```
Expected: `[copy-run] 4 files → functions/src/_run/` 출력 후 타입 오류 없음

- [ ] **Step 4: 복사본이 git에 안 들어가는지 확인한다**

```bash
git status --short functions/src/_run/
```
Expected: 출력 없음 (gitignore 적용)

- [ ] **Step 5: 커밋**

```bash
git add functions/scripts/copy-run.mjs functions/package.json functions/.gitignore
git commit -m "build(run-1): lib/run을 functions/src/_run으로 미러링 (copy-run)"
```

---

### Task 6: `runIndex` 검증 — `functions/src/core/voteRecord.ts`

**Files:**
- Modify: `functions/src/core/voteRecord.ts:9-16` (`VoteInput`), `:28-58` (`buildVoteDoc`)
- Test: `functions/src/__tests__/voteRecord.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `VoteInput` 에 `runIndex: number` 추가 · `buildVoteDoc` 이 `runIndex` 를 포함해 반환

- [ ] **Step 1: 실패하는 테스트를 추가한다**

```ts
// functions/src/__tests__/voteRecord.test.ts — 파일 끝에 추가
describe("buildVoteDoc — runIndex (RUN-1)", () => {
  const valid = {
    userId: "u1",
    tournamentId: "gen4_idol_48",
    round: 1,
    matchId: "gen4_idol_48:r1:m0",
    contestantId: "c1",
    date: "2026-09-05",
  };

  it("① runIndex를 문서에 싣는다 — 회차의 정본은 필드다 (§5 DO 1)", () => {
    expect(buildVoteDoc({ ...valid, runIndex: 3 }).runIndex).toBe(3);
  });

  it("② 1..5 범위를 벗어나면 거부한다", () => {
    expect(() => buildVoteDoc({ ...valid, runIndex: 0 })).toThrow(VoteValidationError);
    expect(() => buildVoteDoc({ ...valid, runIndex: 6 })).toThrow(VoteValidationError);
  });

  it("③ 정수가 아니면 거부한다", () => {
    expect(() => buildVoteDoc({ ...valid, runIndex: 1.5 })).toThrow(VoteValidationError);
    expect(() => buildVoteDoc({ ...valid, runIndex: Number.NaN })).toThrow(VoteValidationError);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

```bash
cd functions && npx vitest run src/__tests__/voteRecord.test.ts
```
Expected: FAIL — 타입 오류 또는 `runIndex` 가 `undefined`

- [ ] **Step 3: 최소 구현**

`VoteInput` 에 필드를 추가한다:

```ts
export interface VoteInput {
  userId: string;
  tournamentId: string;
  round: number;
  matchId: string;
  contestantId: string;
  date: string; // YYYY-MM-DD (KST)
  /** 이 선택이 속한 판의 회차 (RUN-1). 회차의 정본은 이 필드다 — 문서 id가 아니다. */
  runIndex: number;
}
```

`buildVoteDoc` 의 구조 분해에 `runIndex` 를 넣고, `round` 검증 바로 아래에 검증을 추가한다:

```ts
  if (!Number.isInteger(runIndex) || runIndex < 1 || runIndex > 5)
    throw new VoteValidationError("runIndex", `runIndex는 1..5 (받음: ${runIndex}).`);
```

반환값에도 넣는다:

```ts
  return { userId, tournamentId, round, matchId, contestantId, date, runIndex };
```

- [ ] **Step 4: 전체 통과를 확인한다**

```bash
cd functions && npx vitest run src/__tests__/voteRecord.test.ts
```
Expected: PASS — 기존 케이스 + 새 3건 모두 통과

- [ ] **Step 5: 커밋**

```bash
git add functions/src/core/voteRecord.ts functions/src/__tests__/voteRecord.test.ts
git commit -m "feat(run-1): vote 문서에 runIndex 필드 + 1..5 정수 검증"
```

---

### Task 7: 카드 id·이미지 경로에 회차 — `functions/src/core/crownCardRecord.ts`

**Files:**
- Modify: `functions/src/core/crownCardRecord.ts:11-18` (`CrownCardInput`), `:20-31` (`CrownCardRecord`), `:36-38` (`crownCardId`), `:41-63` (`buildCrownCardRecord`)
- Test: `functions/src/__tests__/crownCardRecord.test.ts`

**Interfaces:**
- Consumes: `runDocId` (Task 2, `../_run/runDocId` 경유)
- Produces: `crownCardId(voterUid: string, tournamentId: string, runIndex: number): string` · `CrownCardRecord` 에 `runIndex: number`

- [ ] **Step 1: 실패하는 테스트를 추가한다**

```ts
// functions/src/__tests__/crownCardRecord.test.ts — 파일 끝에 추가
describe("crown_cards — 회차 (RUN-1)", () => {
  const input = {
    voterUid: "u1",
    tournamentId: "gen4_idol_48",
    championId: "c1",
    tournamentTitle: "4세대 아이돌 48",
    tournamentCategory: "kpop",
    imageUrl: "https://example.com/a.png",
  };

  it("① 1회차 카드 id는 현행과 같다 — 옛 카드가 곧 1회차 카드다 (AC 11)", () => {
    expect(crownCardId("u1", "gen4_idol_48", 1)).toBe("u1_gen4_idol_48");
  });

  it("② 2회차는 다른 카드 id — 판마다 카드가 1장씩 남는다 (AC 4)", () => {
    expect(crownCardId("u1", "gen4_idol_48", 2)).toBe("u1_gen4_idol_48_r2");
  });

  it("③ 레코드가 회차를 필드로 싣는다 (§5 DO 1)", () => {
    const r = buildCrownCardRecord({ ...input, runIndex: 3 });
    expect(r.runIndex).toBe(3);
    expect(r.id).toBe("u1_gen4_idol_48_r3");
  });

  it("④ 회차가 다르면 카드 id가 겹치지 않는다 — 지난 판 카드가 보존된다 (AC 5)", () => {
    const ids = [1, 2, 3, 4, 5].map((n) => crownCardId("u1", "gen4_idol_48", n));
    expect(new Set(ids).size).toBe(5);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

```bash
cd functions && node scripts/copy-run.mjs && npx vitest run src/__tests__/crownCardRecord.test.ts
```
Expected: FAIL — `crownCardId` 가 인자 3개를 안 받음

- [ ] **Step 3: 최소 구현**

```ts
import { runDocId } from "../_run/runDocId";

// CrownCardInput 에 추가
  /** 이 카드가 나온 판의 회차 (RUN-1). */
  runIndex: number;

// CrownCardRecord 에 추가
  runIndex: number;

/** Idempotency key / doc id for a Voter's Crown Card. 1회차는 접미사가 없다(§3.0 B안). */
export function crownCardId(
  voterUid: string,
  tournamentId: string,
  runIndex: number,
): string {
  return runDocId(voterUid, tournamentId, runIndex);
}
```

`buildCrownCardRecord` 의 구조 분해에 `runIndex` 를 넣고, 반환 객체를 고친다:

```ts
  return {
    id: crownCardId(voterUid, tournamentId, runIndex),
    voterUid,
    tournamentId,
    runIndex,
    championContestantId: championId,
    tournamentTitle,
    tournamentCategory,
    imageUrl,
    format: "link",
  };
```

- [ ] **Step 4: 통과를 확인한다**

```bash
cd functions && npx vitest run src/__tests__/crownCardRecord.test.ts
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add functions/src/core/crownCardRecord.ts functions/src/__tests__/crownCardRecord.test.ts
git commit -m "feat(run-1): Crown Card id·레코드에 회차 (1회차는 접미사 없음)"
```

---

### Task 8: 씨앗 id·캐시 키에 회차 — `lib/arena/bracketSeed.ts`

**이 태스크는 화면 동작을 바꾸지 않는다.** 회차 인자에 기본값 1을 주어 호출부(`voteStore.ts:175`)를 안 건드린다.
실제 회차를 넘기기 시작하는 것은 PR 2다.

**Files:**
- Modify: `lib/arena/bracketSeed.ts:52-54` (`bracketSeedDocId`), `:146-148` (`cacheKey`), `:150-175` (`browserCache`), `:187-198` (`loadOrCreateBracketSeed`)
- Test: `lib/__tests__/arena/bracketSeed.test.ts`

**Interfaces:**
- Consumes: `runDocId` · `bracketSeedCacheKey` (Task 2)
- Produces:
  - `bracketSeedDocId(uid: string, tournamentId: string, runIndex?: number): string` (기본 1)
  - `loadOrCreateBracketSeed(db, uid, tournamentId, runIndex?: number, timeoutMs?: number): Promise<number>` (기본 1)

- [ ] **Step 1: 실패하는 테스트를 추가한다**

```ts
// lib/__tests__/arena/bracketSeed.test.ts — 파일 끝에 추가
describe("bracketSeedDocId — 회차 (RUN-1)", () => {
  it("① 회차를 안 주면 1회차 — 현행 문서 이름과 같다(호출부 무변경)", () => {
    expect(bracketSeedDocId("u1", "gen4_idol_48")).toBe("u1_gen4_idol_48");
  });

  it("② 1회차는 접미사가 없다 (§3.0 B안)", () => {
    expect(bracketSeedDocId("u1", "gen4_idol_48", 1)).toBe("u1_gen4_idol_48");
  });

  it("③ 회차마다 문서가 다르다 — create-once를 완화하지 않고 새 판에 새 씨앗을 준다 (§5 DON'T 4)", () => {
    expect(bracketSeedDocId("u1", "gen4_idol_48", 2)).toBe("u1_gen4_idol_48_r2");
    expect(bracketSeedDocId("u1", "gen4_idol_48", 5)).toBe("u1_gen4_idol_48_r5");
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

```bash
npx vitest run lib/__tests__/arena/bracketSeed.test.ts
```
Expected: FAIL — 인자 3개를 안 받음 / `_r2` 가 안 붙음

- [ ] **Step 3: 최소 구현**

```ts
import { bracketSeedCacheKey, runDocId } from "@/lib/run/runDocId";

/**
 * 회차별 씨앗 문서 id. 1회차는 접미사가 없다(§3.0 B안) — 옛 문서가 곧 1회차 문서다.
 * 기본값 1은 PR 1에서 호출부를 안 바꾸기 위한 것이다. PR 2가 실제 회차를 넘긴다.
 */
export function bracketSeedDocId(
  uid: string,
  tournamentId: string,
  runIndex: number = 1,
): string {
  return runDocId(uid, tournamentId, runIndex);
}
```

`cacheKey`/`browserCache` 를 회차를 받도록 고친다 (`cacheKey` 지역 함수는 삭제하고 `bracketSeedCacheKey` 를 쓴다):

```ts
function browserCache(uid: string, tournamentId: string, runIndex: number) {
  const key = bracketSeedCacheKey(uid, tournamentId, runIndex);
  // ... 이하 본문 그대로
}
```

`loadOrCreateBracketSeed` 시그니처에 회차를 넣는다 (**`timeoutMs` 앞**에 넣되 둘 다 기본값이 있어 기존 3-인자 호출은 그대로 돈다):

```ts
export async function loadOrCreateBracketSeed(
  db: Firestore,
  uid: string,
  tournamentId: string,
  runIndex: number = 1,
  timeoutMs: number = SEED_PERSIST_TIMEOUT_MS,
): Promise<number> {
  const ref = doc(db, "bracket_seeds", bracketSeedDocId(uid, tournamentId, runIndex));
  const result = await resolveBracketSeed({
    read: async () => {
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data().seed as number) : null;
    },
    create: (seed) => setDoc(ref, { seed, createdAt: serverTimestamp() }),
    newSeed: randomSeed,
    timeoutMs,
    ...browserCache(uid, tournamentId, runIndex),
  });
  return result.seed;
}
```

- [ ] **Step 4: 통과를 확인한다**

```bash
npx vitest run lib/__tests__/arena/bracketSeed.test.ts lib/__tests__/arena/voteStore.test.ts
```
Expected: PASS — 새 3건 + 기존 케이스 전부 (호출부를 안 바꿨으니 voteStore도 그대로 통과해야 한다)

- [ ] **Step 5: 커밋**

```bash
git add lib/arena/bracketSeed.ts lib/__tests__/arena/bracketSeed.test.ts
git commit -m "feat(run-1): 씨앗 문서 id·캐시 키에 회차 (기본값 1로 호출부 무변경)"
```

---

### Task 9: `onVote` 재작성 — 회차 확정과 카운터 기록

가장 큰 태스크다. `participation.ts` · `guestVoteGuard.ts` 를 **삭제**하고 `_run/` 으로 대체한다.

**Files:**
- Modify: `functions/src/onVote.ts` (전면)
- Delete: `functions/src/core/participation.ts` · `functions/src/core/guestVoteGuard.ts`
- Delete: `functions/src/__tests__/participation.test.ts` · `functions/src/__tests__/guestVoteGuard.test.ts`
- Test: `functions/src/__tests__/onVote.runIndex.test.ts` (신규)

**Interfaces:**
- Consumes: `decideRun` · `normalizeRunIndex` (Task 3) · `decideGuestRun` (Task 4) · `runDocId` (Task 2) · `buildVoteDoc` (Task 6) · `kstDate`
- Produces: 트랜잭션 안에서 회차를 확정해 vote에 싣고, `new_run` 일 때만 `tournament_runs`(+게스트면 `guest_runs`)를 갱신

- [ ] **Step 1: 순수 어댑터를 분리하는 실패 테스트를 쓴다**

트랜잭션 자체는 E2E/에뮬레이터의 몫이다. 여기서는 **"읽어 온 사실 → 무엇을 쓸지"** 를 순수 함수로 빼서 테스트한다.

```ts
// functions/src/__tests__/onVote.runIndex.test.ts
/**
 * planRunWrite — onVote 트랜잭션이 "무엇을 쓸지" 정하는 순수 부분.
 * Firestore 없이 검증하고, onCall 래퍼는 이 결과를 그대로 옮겨 적기만 한다.
 */
import { describe, expect, it } from "vitest";
import { planRunWrite } from "../core/planRunWrite";

const TODAY = "2026-09-05";

describe("planRunWrite", () => {
  it("① 새 판이면 회차·오늘 판 수·날짜를 갱신한다", () => {
    const p = planRunWrite({
      decision: { status: "new_run", runIndex: 3 },
      todayKST: TODAY,
      tournamentId: "gen4_idol_48",
      runsTodayBefore: 2, // 오늘 2판을 썼고 지금이 3판째다
    });
    expect(p).toEqual({
      runIndex: 3,
      tournamentRuns: { runIndex: 3, runsToday: 3, lastRunDate: TODAY },
      guestRuns: { runsToday: 1, lastRunDate: TODAY, tournamentId: "gen4_idol_48" },
    });
  });

  it("② 어제 5판을 썼어도 오늘의 첫 판이면 오늘 판 수가 1로 시작한다 (AC 7)", () => {
    const p = planRunWrite({
      decision: { status: "new_run", runIndex: 6 },
      todayKST: TODAY,
      tournamentId: "gen4_idol_48",
      runsTodayBefore: 0, // effectiveRunsToday 가 이미 리셋한 값
    });
    expect(p.tournamentRuns).toEqual({ runIndex: 6, runsToday: 1, lastRunDate: TODAY });
  });

  it("③ 이어하기는 아무것도 쓰지 않는다 — 한도를 소모하지 않는다 (AC 8)", () => {
    const p = planRunWrite({
      decision: { status: "continue", runIndex: 2 },
      todayKST: TODAY,
      tournamentId: "gen4_idol_48",
    });
    expect(p).toEqual({ runIndex: 2, tournamentRuns: null, guestRuns: null });
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

```bash
cd functions && npx vitest run src/__tests__/onVote.runIndex.test.ts
```
Expected: FAIL — `Cannot find module '../core/planRunWrite'`

- [ ] **Step 3: 순수 어댑터를 구현한다**

```ts
// functions/src/core/planRunWrite.ts
/**
 * onVote 트랜잭션의 "무엇을 쓸지" 부분 — 순수하게 떼어내 Firestore 없이 테스트한다.
 *
 * 카운트 시점은 **그 판의 첫 선택**이다(핸드오프 §5 DO 4 주석, 2026-09-05 대표 확정).
 * 미완주 판은 `continue` 로만 재진입되므로 "카드 없이 판만 태우는" 구멍이 구조적으로 없고,
 * 들어왔다 바로 나간 팬에게 한 판을 태우지 않는다.
 */
import type { RunDecision } from "../_run/decideRun";

export interface RunWritePlan {
  runIndex: number;
  /** null이면 쓰지 않는다(이어하기). */
  tournamentRuns: { runIndex: number; runsToday: number; lastRunDate: string } | null;
  /** 게스트일 때만 호출자가 사용한다. null이면 쓰지 않는다. */
  guestRuns: { runsToday: number; lastRunDate: string; tournamentId: string } | null;
}

export function planRunWrite(args: {
  decision: RunDecision;
  todayKST: string;
  tournamentId: string;
  /** 오늘 이미 쓴 판 수(자정 리셋이 반영된 값). 기본 0. */
  runsTodayBefore?: number;
  /** 게스트가 오늘 이미 쓴 판 수(자정 리셋 반영). 기본 0. */
  guestRunsTodayBefore?: number;
}): RunWritePlan {
  const {
    decision,
    todayKST,
    tournamentId,
    runsTodayBefore = 0,
    guestRunsTodayBefore = 0,
  } = args;

  if (decision.status !== "new_run" && decision.status !== "continue") {
    throw new Error(`planRunWrite: 허용된 판정이 아닙니다 (${decision.status}).`);
  }
  if (decision.status === "continue") {
    return { runIndex: decision.runIndex, tournamentRuns: null, guestRuns: null };
  }
  return {
    runIndex: decision.runIndex,
    tournamentRuns: {
      runIndex: decision.runIndex,
      runsToday: runsTodayBefore + 1,
      lastRunDate: todayKST,
    },
    guestRuns: {
      runsToday: guestRunsTodayBefore + 1,
      lastRunDate: todayKST,
      tournamentId,
    },
  };
}
```

- [ ] **Step 4: 통과를 확인한다**

```bash
cd functions && npx vitest run src/__tests__/onVote.runIndex.test.ts
```
Expected: PASS — 3 passed

- [ ] **Step 5: `onVote` 를 배선한다**

`functions/src/onVote.ts` 에서:

1. `decideParticipation`·`participationDocId`·`decideGuestVoteGuard`·`fetchGuestVoteFacts` 를 **모두 제거**한다
   (`fetchGuestVoteFacts` 의 범위 검색은 시작값과 끝값이 같아 결과가 늘 0건이던 **버그**다 — §9 함정 8. 통째로 사라진다.)
2. `import { decideRun, normalizeRunIndex } from "./_run/decideRun";`
   `import { decideGuestRun } from "./_run/guestRun";`
   `import { runDocId } from "./_run/runDocId";`
   `import { planRunWrite } from "./core/planRunWrite";`
3. 트랜잭션 안에서 **읽기를 먼저** 한다 (Firestore는 모든 읽기가 쓰기보다 앞서야 한다):

```ts
    const trRef = adminDb.collection("tournament_runs").doc(`${uid}_${data.tournamentId}`);
    const grRef = adminDb.collection("guest_runs").doc(uid);
    const legacyProgressRef = adminDb.doc(`roundProgress/${runDocId(uid, tid, 1)}`);

    await adminDb.runTransaction(async (tx) => {
      const [trSnap, grSnap, legacySnap] = await Promise.all([
        tx.get(trRef), tx.get(grRef), tx.get(legacyProgressRef),
      ]);

      const stored = trSnap.data() ?? {};
      const runIndexRaw = Number(stored.runIndex ?? 0);
      const runIndex = normalizeRunIndex({
        runIndex: runIndexRaw,
        legacyRunExists: legacySnap.exists,
      });

      // 현재 회차의 진행 문서를 읽어 완주 여부를 본다(회차 0이면 아직 판이 없다).
      const currentRunComplete =
        runIndex === 0
          ? false
          : (await tx.get(adminDb.doc(`roundProgress/${runDocId(uid, tid, runIndex)}`)))
              .get("complete") === true;

      // 게스트는 먼저 하루 1판 한도를 본다(§5 DO 3).
      if (isAnonymous) {
        const g = grSnap.data() ?? {};
        const decision = decideGuestRun({
          lastRunDate: (g.lastRunDate as string) ?? null,
          runsToday: Number(g.runsToday ?? 0),
          runTournamentId: (g.tournamentId as string) ?? null,
          todayKST: date,
          tournamentId: tid,
          currentRunComplete,
        });
        if (decision.status === "login_required") {
          throw new HttpsError("permission-denied", "Guest Run already used — sign in to keep playing.");
        }
      }

      const decision = decideRun({
        runIndex,
        lastRunDate: (stored.lastRunDate as string) ?? null,
        runsToday: Number(stored.runsToday ?? 0),
        todayKST: date,
        currentRunComplete,
        deadlinePassed,
      });
      if (decision.status === "limit_reached") {
        throw new HttpsError("resource-exhausted", "daily run limit reached", {
          code: VOTE_ERROR_CODES.DAILY_LIMIT,
        });
      }
      if (decision.status === "deadline_passed") {
        throw new HttpsError("failed-precondition", "tournament deadline passed", {
          code: VOTE_ERROR_CODES.DEADLINE_PASSED,
        });
      }
      // ... 여기서부터 쓰기 (planRunWrite 결과를 그대로 옮겨 적는다)
    });
```

4. **중복 방지 쿼리에 회차를 넣는다** — 회차가 정해진 뒤여야 하므로, 회차 확정 다음에 둔다:

```ts
      const dupe = await tx.get(
        votes
          .where("userId", "==", uid)
          .where("matchId", "==", doc.matchId)
          .where("runIndex", "==", plan.runIndex)
          .limit(1),
      );
      if (!dupe.empty) throw new HttpsError("already-exists", "이미 투표한 매치입니다.");
```

5. `buildVoteDoc` 호출에 `runIndex: plan.runIndex` 를 넘긴다 (회차가 정해진 뒤로 옮긴다).
6. 쓰기:

```ts
      if (plan.tournamentRuns) {
        tx.set(trRef, { ...plan.tournamentRuns, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        if (isAnonymous && plan.guestRuns) {
          tx.set(grRef, { ...plan.guestRuns, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        }
      }
      tx.set(votes.doc(), { ...doc, createdAt: FieldValue.serverTimestamp() });
```

7. `deadlinePassed` 는 트랜잭션 **밖에서** Tournament 문서를 한 번 읽어 구한다:

```ts
    const tSnap = await adminDb.collection("tournaments").doc(tid).get();
    const dl = tSnap.get("tournamentDeadline");
    const deadlinePassed = Boolean(dl?.toMillis && dl.toMillis() < Date.now());
```

8. `functions/src/core/voteErrorCodes.ts` 에 `DEADLINE_PASSED: "deadline_passed"` 를 추가한다.
9. **읽기 실패 시 fail-open 하지 않는다**(설계서 §4) — 옛 `fetchGuestVoteFacts` 의 `catch → 허용` 을 되살리지 않는다.
   읽기가 던지면 그대로 전파되어 호출이 실패한다. 회차를 잘못 짚으면 남의 판에 선택이 들어가거나 카드가 덮인다.
10. 옛 파일과 그 테스트를 지운다:

```bash
git rm functions/src/core/participation.ts functions/src/core/guestVoteGuard.ts \
       functions/src/__tests__/participation.test.ts functions/src/__tests__/guestVoteGuard.test.ts
```

- [ ] **Step 6: functions 전체 테스트와 타입 검사**

```bash
cd functions && npm test && npx tsc --noEmit
```
Expected: 전부 PASS. 삭제된 모듈을 import하던 곳이 있으면 여기서 잡힌다.

- [ ] **Step 7: 커밋**

```bash
git add -A functions/src functions/package.json
git commit -m "feat(run-1): onVote가 회차를 확정하고 tournament_runs·guest_runs를 기록

participation.ts·guestVoteGuard.ts 삭제 — 판정이 _run/ 공용 모듈로 옮겨가
남는 것이 없다. 옛 게스트 가드의 범위 검색 버그(lo==hi라 결과가 늘 0건,
§9 함정 8)도 함께 사라진다."
```

---

### Task 10: 라운드 판정에 회차 필터 — `functions/src/advanceRound.ts`

**§9 함정 9.** 지금은 `(userId, tournamentId, round)` 로만 세어서 **2판째 첫 선택이 1판째 24건과 합산돼 즉시 라운드가 넘어간다.**

**Files:**
- Modify: `functions/src/advanceRound.ts:22-70`
- Test: `functions/src/__tests__/advanceRoundCore.test.ts` (기존 순수 코어는 그대로, 아래는 문서 id 헬퍼 확인용)

**Interfaces:**
- Consumes: `runDocId` (Task 2)
- Produces: `roundProgress` 문서에 `runIndex` 필드

> **이 태스크는 트리거 배선이라 순수 단위 RED를 만들 수 없다.** Firestore 쿼리 자체가 바뀌는 것이고,
> 그 동작은 Task 14(에뮬레이터 실측)와 §7 0단계(프리뷰 1판 완주)가 검증한다.
> 아래 단위 테스트는 **회귀 잠금**이다 — 문서 이름 규칙이 나중에 조용히 바뀌는 것을 막는다.

- [ ] **Step 1: 회귀 잠금 테스트를 추가한다**

```ts
// functions/src/__tests__/advanceRoundCore.test.ts — 파일 끝에 추가
import { runDocId } from "../_run/runDocId";

describe("advanceRound — 회차별 진행 문서 (RUN-1, §9 함정 9)", () => {
  it("① 1회차 진행 문서는 현행 이름 그대로다 — 옛 화면이 계속 구독한다", () => {
    expect(runDocId("u1", "gen4_idol_48", 1)).toBe("u1_gen4_idol_48");
  });

  it("② 회차가 다르면 진행 문서가 다르다 — 판마다 진행이 따로 쌓인다", () => {
    expect(runDocId("u1", "gen4_idol_48", 2)).toBe("u1_gen4_idol_48_r2");
  });
});
```

- [ ] **Step 2: 회귀 잠금이 통과하는지 확인한다**

```bash
cd functions && node scripts/copy-run.mjs && npx vitest run src/__tests__/advanceRoundCore.test.ts
```
Expected: PASS — Task 2·5가 끝나 있으므로 바로 통과한다. 여기서 FAIL이면 미러링(Task 5)이 안 걸린 것이다.

- [ ] **Step 3: 트리거 본체를 고친다**

vote 문서에서 `runIndex` 를 **필드로** 읽는다 (문서 id를 파싱하지 않는다 — §9 함정 2):

```ts
    const { userId, tournamentId, round, contestantId } = data;
    // 옛 vote 문서(회차 도입 전)에는 필드가 없다 → 1회차로 읽는다 (AC 11).
    const runIndex = Number(data.runIndex ?? 1);

    const snap = await adminDb
      .collection("votes")
      .where("userId", "==", userId)
      .where("tournamentId", "==", tournamentId)
      .where("round", "==", round)
      .where("runIndex", "==", runIndex)
      .get();
```

`data` 타입에 `runIndex?: number` 를 추가하고, 문서 참조와 쓰기에 회차를 싣는다:

```ts
    const ref = adminDb.collection("roundProgress").doc(runDocId(userId, tournamentId, runIndex));
```

`champion` 분기와 `else` 분기의 `set` 페이로드 양쪽에 `runIndex,` 를 추가한다.

- [ ] **Step 4: 통과를 확인한다**

```bash
cd functions && npm test && npx tsc --noEmit
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add functions/src/advanceRound.ts functions/src/__tests__/advanceRoundCore.test.ts
git commit -m "fix(run-1): 라운드 완료 판정에 회차 필터 — 지난 판 선택이 합산되던 문제 (§9 함정 9)"
```

---

### Task 11: 카드 생성에 회차 — `functions/src/onChampionConfirmed.ts`

**§9 함정 10.** 이미지 경로가 `crown-cards/{tid}/{uid}.png` 라 **2판째가 1판째 그림을 덮어쓴다**(AC 5 정면 위반).

**Files:**
- Modify: `functions/src/onChampionConfirmed.ts:26-115`
- Modify: `functions/src/core/onChampionConfirmedCore.ts` (`RoundProgressData` 에 `runIndex?: number`)

**Interfaces:**
- Consumes: `crownCardId` (Task 7) · `crownCardStoragePath` (Task 2)
- Produces: 회차별 카드 문서 + 회차별 PNG 파일

> Task 10과 같은 이유로 배선 태스크다. 아래는 **회귀 잠금**이고, 실동작은 §7 0단계가 검증한다.

- [ ] **Step 1: 회귀 잠금 테스트를 추가한다**

```ts
// functions/src/__tests__/onChampionConfirmedCore.test.ts — 파일 끝에 추가
import { crownCardStoragePath } from "../_run/runDocId";

describe("Crown Card 이미지 경로 — 회차 (RUN-1, §9 함정 10)", () => {
  it("① 1회차 경로는 현행과 같다 — 옛 카드 이미지가 그대로 살아 있다", () => {
    expect(crownCardStoragePath("gen4_idol_48", "u1", 1)).toBe("crown-cards/gen4_idol_48/u1.png");
  });

  it("② 2회차는 파일이 따로다 — 1판째 그림을 덮으면 지난 카드가 사라진다 (AC 5)", () => {
    expect(crownCardStoragePath("gen4_idol_48", "u1", 2)).toBe("crown-cards/gen4_idol_48/u1_r2.png");
  });
});
```

- [ ] **Step 2: 회귀 잠금이 통과하는지 확인한다**

```bash
cd functions && npx vitest run src/__tests__/onChampionConfirmedCore.test.ts
```
Expected: PASS — Task 2·5가 끝나 있으므로 바로 통과한다.

- [ ] **Step 3: 트리거 본체를 고친다**

```ts
import { crownCardStoragePath } from "./_run/runDocId";

    // 회차는 진행 문서의 **필드**에서 읽는다. 문서 id를 파싱하지 않는다(§9 함정 2 —
    // 실제 슬러그가 gen4_idol_48처럼 '_'를 포함해 잘라내면 tournamentId가 깨진다).
    // 옛 문서에는 필드가 없다 → 1회차 (AC 11).
    const runIndex = Number(after.runIndex ?? 1);

    const cardId = crownCardId(voterUid, tournamentId, runIndex);
    // ...
    const storagePath = crownCardStoragePath(tournamentId, voterUid, runIndex);
    // ...
    const record = buildCrownCardRecord({
      voterUid, tournamentId, championId, tournamentTitle, tournamentCategory, imageUrl, runIndex,
    });
```

`onChampionConfirmedCore.ts` 의 `RoundProgressData` 에 `runIndex?: number;` 를 추가한다.

- [ ] **Step 4: 통과를 확인한다**

```bash
cd functions && npm test && npx tsc --noEmit
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add functions/src/onChampionConfirmed.ts functions/src/core/onChampionConfirmedCore.ts functions/src/__tests__/onChampionConfirmedCore.test.ts
git commit -m "fix(run-1): Crown Card 이미지 경로에 회차 — 2판째가 1판째 그림을 덮던 문제 (§9 함정 10)"
```

---

### Task 12: 게스트→로그인 이관 — `functions/src/linkSessionVote.ts`

**§9 함정 11.** 게스트→로그인 전환은 퍼널의 핵심이라 여기가 깨지면 **신규 회원이 자기 판을 잃는다.**
게스트는 항상 1회차라 이름이 안 바뀌지만, **로그인 계정에 이미 1회차가 있으면 충돌 판정이 달라진다**(HF-3.1 케이스 2).

**Files:**
- Modify: `functions/src/linkSessionVote.ts:60-115`, `:230-310`
- Modify: `functions/src/core/linkSeeds.ts` (`SeedWrite.docId` 생성)
- Test: `functions/src/__tests__/linkRoundProgress.test.ts` · `linkSeeds.test.ts`

**Interfaces:**
- Consumes: `runDocId` (Task 2)
- Produces: 이관 대상 문서 id가 전부 `runDocId` 경유

- [ ] **Step 1: 실패하는 테스트를 추가한다**

```ts
// functions/src/__tests__/linkSeeds.test.ts — 파일 끝에 추가
describe("planSeedTransfer — 회차 (RUN-1, §9 함정 11)", () => {
  it("① 게스트의 판은 언제나 1회차라 접미사가 없다 — 옛 이름과 같다", () => {
    const writes = planSeedTransfer("newuid", [{ tournamentId: "gen4_idol_48", seed: 7 }]);
    expect(writes).toEqual([{ docId: "newuid_gen4_idol_48", seed: 7 }]);
  });

  it("② tournamentId의 '_'가 이름을 깨지 않는다 (§9 함정 2)", () => {
    const writes = planSeedTransfer("newuid", [{ tournamentId: "best_stage_48", seed: 9 }]);
    expect(writes[0].docId.split("_")[0]).toBe("newuid");
  });
});
```

- [ ] **Step 2: 통과를 확인한다**

```bash
cd functions && npx vitest run src/__tests__/linkSeeds.test.ts
```
Expected: PASS — 게스트 판은 1회차라 결과 문자열이 현행과 같다. **이 태스크의 목적은 동작 변경이 아니라
`runDocId` 로의 일원화**다(§3.0 조건 1: 어디서도 문자열을 직접 조합하지 않는다). 회귀 잠금이 먼저 서 있어야
Step 3에서 이름이 조용히 바뀌는 것을 잡는다.

- [ ] **Step 3: 문자열 조합을 전부 `runDocId` 로 바꾼다**

```bash
grep -n '\${anonUid}_\|\${googleUid}_\|\${newUid}_' functions/src/linkSessionVote.ts functions/src/core/linkSeeds.ts
```

찾은 자리를 전부 `runDocId(uid, tid, 1)` 로 교체한다. 게스트 판은 정의상 1회차이므로 회차 인자는 `1` 고정이고,
그 근거를 주석으로 남긴다:

```ts
// 게스트는 하루 통틀어 1판이므로 이관 대상은 언제나 1회차다(§5 DO 3).
// 회차를 직접 문자열로 붙이지 않고 runDocId를 통과시킨다(§3.0 조건 1).
const progressId = runDocId(anonUid, tid, 1);
```

- [ ] **Step 4: 통과를 확인한다**

```bash
cd functions && npm test && npx tsc --noEmit
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add functions/src/linkSessionVote.ts functions/src/core/linkSeeds.ts functions/src/__tests__/linkSeeds.test.ts
git commit -m "fix(run-1): 게스트→로그인 이관의 문서 id를 runDocId 경유로 (§9 함정 11)"
```

---

### Task 13: 보안 규칙 — `tournament_runs` · `guest_runs`

**Files:**
- Modify: `firestore.rules:161-173` (`daily_participation` 블록 **아래**에 새 블록 추가 — 옛 블록은 **지우지 않는다**, Phase 3에서 삭제)
- Test: `tests/rules/arena-rules.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: 소유자만 읽기, 쓰기는 전면 차단

- [ ] **Step 1: 실패하는 규칙 테스트를 추가한다**

```ts
// tests/rules/arena-rules.test.ts — 파일 끝에 추가
describe("tournament_runs / guest_runs (RUN-1)", () => {
  it("① 소유자는 자기 문서를 읽는다 — 문서가 없어도 거부되지 않는다", async () => {
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(getDoc(doc(db, "tournament_runs", "u1_gen4_idol_48")));
  });

  it("② 남의 문서는 못 읽는다", async () => {
    const db = testEnv.authenticatedContext("u2").firestore();
    await assertFails(getDoc(doc(db, "tournament_runs", "u1_gen4_idol_48")));
  });

  it("③ tournamentId의 '_'가 소유자 판정을 깨지 않는다 (§9 함정 2)", async () => {
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(getDoc(doc(db, "tournament_runs", "u1_best_stage_48_r3")));
  });

  it("④ 클라이언트는 한도를 고쳐 쓸 수 없다 — 서버 전용", async () => {
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(setDoc(doc(db, "tournament_runs", "u1_gen4_idol_48"), { runsToday: 0 }));
  });

  it("⑤ 게스트는 자기 guest_runs를 읽고, 남의 것은 못 읽는다", async () => {
    const mine = testEnv.authenticatedContext("g1").firestore();
    const other = testEnv.authenticatedContext("g2").firestore();
    await assertSucceeds(getDoc(doc(mine, "guest_runs", "g1")));
    await assertFails(getDoc(doc(other, "guest_runs", "g1")));
  });

  it("⑥ guest_runs도 클라이언트 쓰기 차단 — 풀리면 랭킹 조작 비용이 0이 된다 (§9 함정 4)", async () => {
    const db = testEnv.authenticatedContext("g1").firestore();
    await assertFails(setDoc(doc(db, "guest_runs", "g1"), { runsToday: 0 }));
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

```bash
npm run test:rules
```
Expected: FAIL — 규칙이 없어 기본 거부, ①③⑤가 실패

- [ ] **Step 3: 규칙을 추가한다**

`firestore.rules` 의 `daily_participation` 블록 바로 아래에 넣는다.

```
    // ── tournament_runs (RUN-1) ────────────────────────────────────
    // Voter별·Tournament별 판(Run) 원장 (id = `${uid}_${tid}`):
    //   runIndex    평생 누적 회차 — 문서 id의 _r{n}에 쓰는 번호. 되감기지 않는다.
    //   lastRunDate 마지막으로 판을 시작한 KST 날짜
    //   runsToday   그날 쓴 판 수. lastRunDate가 오늘이 아니면 0으로 읽는다.
    // 클라이언트 게이트가 자기 문서를 단일 get으로 읽어 회차와 한도를 동시에 안다.
    // 쓰기 차단 — onVote(admin SDK)가 투표 트랜잭션 안에서만 갱신하므로 한도를 위조·초기화할 수 없다.
    //
    // 소유자 판정은 doc id 접두사다. Firebase uid에는 '_'가 없으므로 split('_')[0]은
    // tournamentId나 _r{n} 접미사가 뒤에 붙어도 언제나 uid다 (§9 함정 1).
    match /tournament_runs/{docId} {
      allow read: if request.auth != null
                  && docId.split('_')[0] == request.auth.uid;
      allow write: if false;
    }

    // ── guest_runs (RUN-1) ─────────────────────────────────────────
    // 게스트의 "하루 통틀어 1판" 한도 (id = `${uid}` — Tournament를 가로지르므로 uid 단위).
    // 게스트 uid는 브라우저마다 새로 생기고 게스트의 선택도 랭킹에 집계된다 →
    // 이 문서를 클라이언트가 쓸 수 있으면 랭킹 조작 비용이 0이 된다 (§9 함정 4).
    match /guest_runs/{docId} {
      allow read: if request.auth != null && docId == request.auth.uid;
      allow write: if false;
    }
```

- [ ] **Step 4: 통과를 확인한다**

```bash
npm run test:rules
```
Expected: PASS — 새 6건 + 기존 규칙 테스트 전부

- [ ] **Step 5: 커밋**

```bash
git add firestore.rules tests/rules/arena-rules.test.ts
git commit -m "feat(run-1): tournament_runs·guest_runs 보안 규칙 (소유자 읽기, 쓰기 차단)"
```

---

### Task 14: 복합 인덱스 확인 — **PR 1의 완료 조건**

2026-09-05 대표 지시. **인덱스 없는 쿼리는 런타임 실패라 배포 후 발견하면 투표가 통째로 막힌다.**
리포에도 같은 사고 기록이 있다 (`feedback_firestore_composite_index`: 새 query 패턴이면 `firestore.indexes.json` 을 검증하라).

**Files:**
- Verify: `firestore.indexes.json`
- Create (필요 시): `firestore.indexes.json` 항목 추가

**Interfaces:**
- Consumes: Task 9·10의 새 쿼리
- Produces: PR 본문에 넣을 확인 결과

- [ ] **Step 1: 확인 대상 3개를 적는다**

```
① onVote 중복 방지    votes  where userId == , matchId == , runIndex ==       (등가 3)
② advanceRound 라운드  votes  where userId == , tournamentId == , round == , runIndex ==  (등가 4)
③ voteStore 진행 복원  votes  where userId == , tournamentId == , runIndex ==  (등가 3, PR 2에서 실사용)
```

- [ ] **Step 2: 에뮬레이터를 띄우고 세 쿼리를 실제로 실행한다**

```bash
firebase emulators:exec --only firestore --project worldcrown48 "npx vitest run --config vitest.rules.config.ts tests/rules/arena-rules.test.ts"
```
*무엇을 하나*: Firestore 에뮬레이터를 띄운 채 규칙 테스트를 돌립니다. *왜*: 인덱스 부족은 **쿼리를 실제로 실행해야만** 드러납니다 — 코드를 읽어서는 안 보입니다. *성공 모습*: `FAILED_PRECONDITION: The query requires an index` 문구가 **한 번도** 안 나옵니다.

> 위 테스트에 세 쿼리가 없으면, `tests/rules/arena-rules.test.ts` 에 임시 `it()` 세 개를 추가해
> 위 조합을 그대로 실행하고(결과가 비어 있어도 된다) 인덱스 오류만 확인한 뒤 지운다.

- [ ] **Step 3: 필요하면 인덱스를 추가한다**

`FAILED_PRECONDITION` 이 나오면 오류 메시지가 알려주는 필드 조합을 `firestore.indexes.json` 의 `indexes` 배열에 추가한다. 예:

```jsonc
{
  "collectionGroup": "votes",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "tournamentId", "order": "ASCENDING" },
    { "fieldPath": "round", "order": "ASCENDING" },
    { "fieldPath": "runIndex", "order": "ASCENDING" }
  ]
}
```

- [ ] **Step 4: 결과를 기록한다**

`docs/superpowers/plans/2026-09-05-run-1-pr1-server-core.md` 이 아니라 **PR 본문**에 아래 표를 적는다.

```
| 쿼리 | 인덱스 오류 | 조치 |
|---|---|---|
| onVote 중복 방지 | (있음/없음) | (추가함/불필요) |
| advanceRound 라운드 판정 | (있음/없음) | (추가함/불필요) |
| voteStore 진행 복원 | (있음/없음) | (추가함/불필요) |
```

- [ ] **Step 5: 커밋 (변경이 있을 때만)**

```bash
git add firestore.indexes.json
git commit -m "chore(run-1): votes 회차 쿼리용 복합 인덱스 추가 (에뮬레이터 실측)"
```

---

### Task 15: PR 1 마무리 — 전체 검증과 PR 생성

- [ ] **Step 1: 루트·functions 전체 테스트**

```bash
npm test && (cd functions && npm test)
```
Expected: 양쪽 모두 PASS, 실패 0건

- [ ] **Step 2: 타입 검사와 빌드**

```bash
npx tsc --noEmit && npm run build
```
Expected: 오류 0건. `tsc` 는 마지막 테스트 파일까지 쓴 뒤에 돌린다 — vitest green이 타입을 안 본다(리포 기록 `feedback_tsc_before_last_test_file`).

- [ ] **Step 3: 금지어 게이트**

```bash
grep -rn "5표\|46표\|투표 무제한" app lib components | wc -l
```
Expected: `0`

- [ ] **Step 4: 회차 이름을 직접 조합한 곳이 없는지 확인**

```bash
grep -rn '_r\${\|_r1\|_r2' --include="*.ts" --include="*.tsx" app lib components functions/src | grep -v "__tests__" | grep -v "lib/run/runDocId.ts"
```
Expected: 출력 없음 — 이름을 만드는 곳은 `runDocId` 하나뿐이어야 한다 (§3.0 B안 조건 1)

- [ ] **Step 5: PR 생성**

PR 본문에 **핸드오프 §10 종료 조건 체크리스트**와 Task 14의 인덱스 확인 표를 넣는다.
그리고 이 PR이 **프로덕션 화면 동작을 바꾸지 않는다**는 점(1회차 접미사 없음 + 회차 인자 기본값 1)을 명시한다.

---

## 이 계획이 다루지 않는 것

**PR 2(화면·문구)와 PR 3(정리·계측)의 계획은 여기 없다.** 핸드오프 §3이 "PR 하나를 머지한 뒤 다음을 착수"로
못박았고, PR 1의 §7 0단계(중간 구간 검증) 결과가 PR 2의 전제를 바꿀 수 있기 때문이다.
PR 1이 머지·배포되고 0단계 검증이 끝난 뒤 PR 2 계획을 따로 쓴다.

**AC 매핑 — 이 PR이 서버에서 만족시키는 것**

| AC | 어디서 | 태스크 |
|---|---|---|
| 1 하루 5판·6판째 차단 | `decideRun` + `onVote` | 3·9 |
| 2 Tournament별 별도 5판 | `tournament_runs` 가 Tournament별 문서 | 3·9·13 |
| 3 판마다 대진표가 다름 | 회차별 씨앗 문서 | 8 |
| 4 판마다 카드 1장 | 회차별 카드 id | 7·11 |
| 5 지난 카드 보존 | 회차별 카드 id **+ 회차별 이미지 경로** | 7·11 |
| 6 게스트 하루 1판 | `decideGuestRun` + `guest_runs` | 4·9·13 |
| 7 KST 자정 리셋 | `isSameKstDay` · `effectiveRunsToday` | 1·3·4 |
| 8 미완주 판 이어하기 | `decideRun` 의 `continue` | 3·9 |
| 9 마감 시 새 판 불가 | `decideRun` 의 `deadline_passed` | 3·9 |
| 10 랭킹이 5판 전부 반영 | 집계 코드 무변경(선택 기록이 그대로 쌓인다) | — |
| 11 옛 문서 = 1회차 | B안 이름 규칙 + `normalizeRunIndex` | 2·3·10·11 |
| 12·13·14·15·16 | **PR 2·3 범위** | — |
