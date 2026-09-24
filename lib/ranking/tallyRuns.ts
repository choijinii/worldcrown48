/**
 * lib/ranking/tallyRuns — `votes` 를 **판(Run) 단위**로 묶어 Crown Score의 재료를 만든다.
 *
 * 정본: `marketing/00_strategy/CROWN_SCORE_v1.0.md` §2·§3·§5.
 *
 * ## 왜 vote를 낱개로 세지 않는가
 *
 * 옛 집계(`rankingAggregator.tallyVotes`)는 vote 한 건 = 1표였다. Crown Score는 **판**이
 * 계산 단위다 — 한 판이 끝날 때 6명에게 순위 점수가 나가고, 비율의 분모도 판수다.
 *
 * ## 대결에 나온 횟수를 셀 수 있는 이유
 *
 * `matchId` 에는 상대가 적혀 있지 않다(`{tid}:r{n}:m{i}`). 그런데 대진의 성질이 대신 알려
 * 준다 — **라운드 N+1의 출전자 = 라운드 N에서 뽑힌 사람**(`lib/arena/matches.ts`
 * `contestantIdsForRound`). 그리고 라운드 1에는 그 대회의 Contestant 48개가 전부 나온다.
 * 그래서
 *
 *     대결에 나온 횟수 = 완주 판수 + (1~4라운드에서 뽑힌 횟수)
 *                    = runsTotal + picks − wins
 *
 * 가 되어, 대진 씨앗(`bracket_seeds`)을 다시 돌리지 않고도 점유율이 나온다.
 * (정본 §4 계산 예시의 4,450과 정확히 일치한다 — 1000 + 3750 − 300.)
 *
 * ⚠️ **전제**: 한 대회의 Contestant 48개는 모든 판의 라운드 1에 나온다. 대회가 열린 뒤
 * Contestant을 갈아끼우면 그 전에 끝난 판에도 나온 것으로 세어져 점유율이 낮게 잡힌다.
 * 지금 The Lab은 공개 후 Contestant 교체를 정식 흐름으로 두지 않아 실제로는 생기지 않는다.
 *
 * IMPORT-FREE BY DESIGN — `functions/scripts/copy-ranking.mjs` 가 크론으로 복사한다.
 */

/** 집계에 필요한 vote 문서의 필드만. */
export interface RunVote {
  userId: string;
  /**
   * 판의 회차(1~5). **RUN-1 이전 기록에는 이 필드가 없다** — 그때는 한 대회당 판이 하나뿐
   * 이었으므로 1회차로 읽는다(`_run/decideRun.normalizeRunIndex` 와 같은 규칙).
   */
  runIndex?: number;
  round: number;
  matchId: string;
  contestantId: string;
  /**
   * 게스트(익명)의 선택인가. **옵셔널인 것이 정본이다** — 2026-09-07 이전 기록에는 필드가
   * 없고, 그 기록은 소급 제외하지 않기로 확정됐다(D-02 "앞으로만").
   */
  isGuest?: boolean;
}

/** 한 Contestant의 대회 단위 누적. */
export interface ContestantAccum {
  /** 받은 순위 점수 합계 (1등 10 · 2등 5 · 3등 2). */
  placementPoints: number;
  /** 1등 횟수 = 결승에서 뽑힌 횟수. */
  wins: number;
  /** 대결에서 뽑힌 횟수 (결승 포함). */
  picks: number;
}

export interface RunsTally {
  /** 대회 전체 완주 판수 — 게스트 판 제외. 10판 기준(정본 §5)이 읽는 값. */
  runsTotal: number;
  byContestant: Map<string, ContestantAccum>;
}

/** 순위 점수 (정본 §2). 합계는 늘 26점 = 10 + 5×2 + 2×3. */
export const POINTS_FIRST = 10;
export const POINTS_SECOND = 5;
export const POINTS_THIRD = 2;

/** THE FINAL. 이 라운드의 선택이 있으면 그 판은 완주했다(`lib/arena/roundProgress`). */
const FINAL_ROUND = 5;
/** 6강 — 여기 올라왔지만 결승에 못 간 3명이 3등이다. */
const ROUND_OF_SIX = 4;

function accumOf(map: Map<string, ContestantAccum>, id: string): ContestantAccum {
  let a = map.get(id);
  if (!a) {
    a = { placementPoints: 0, wins: 0, picks: 0 };
    map.set(id, a);
  }
  return a;
}

/** 한 판을 가리키는 키 — 같은 Voter라도 회차가 다르면 다른 판이다. */
function runKeyOf(vote: RunVote): string {
  return `${vote.userId}\u0000${vote.runIndex ?? 1}`;
}

export function tallyRuns(votes: RunVote[]): RunsTally {
  const runs = new Map<string, RunVote[]>();
  for (const v of votes) {
    if (!v.contestantId || !v.userId) continue;
    const key = runKeyOf(v);
    const bucket = runs.get(key);
    if (bucket) bucket.push(v);
    else runs.set(key, [v]);
  }

  const byContestant = new Map<string, ContestantAccum>();
  let runsTotal = 0;

  // ⚠️ `for (const x of map.values())` 는 이 저장소에서 쓸 수 없다 — 루트 tsconfig에
  // `target` 이 없어 tsc가 ES5로 내려가고, Map/Set 직접 순회가 TS2802로 막힌다.
  // vitest는 통과시키므로 타입 검사에서만 드러난다. `Array.from` 으로 받는다.
  Array.from(runs.values()).forEach((runVotes) => {
    // 게스트 판 제외 (D-02 · 대표 2026-09-24): 한 판에 게스트 선택이 **하나라도** 있으면
    // 그 판 전체를 뺀다. `=== true` 여야 한다 — truthy 검사면 필드 없는 옛 기록이 함께 빠져
    // 소급 제외가 되고, 그건 확정("앞으로만")과 정반대다.
    if (runVotes.some((v) => v.isGuest === true)) return;

    // 완주하지 않은 판은 세지 않는다 (정본 §3 "완주한 판만").
    const finalVote = runVotes.find((v) => v.round === FINAL_ROUND);
    if (!finalVote) return;

    runsTotal += 1;

    for (const v of runVotes) accumOf(byContestant, v.contestantId).picks += 1;

    // 1등 — 결승에서 팬이 고른 1명.
    const champion = finalVote.contestantId;
    const championAccum = accumOf(byContestant, champion);
    championAccum.placementPoints += POINTS_FIRST;
    championAccum.wins += 1;

    // 2등 — 결승에 오른 3명 중 고르지 않은 2명 = 6강 승자 − 1등.
    const finalists = runVotes
      .filter((v) => v.round === ROUND_OF_SIX)
      .map((v) => v.contestantId);
    finalists.forEach((id) => {
      if (id === champion) return;
      accumOf(byContestant, id).placementPoints += POINTS_SECOND;
    });

    // 3등 — 6강에 올랐지만 결승에 못 간 3명 = 12강 승자 − 6강 승자.
    runVotes
      .filter((v) => v.round === ROUND_OF_SIX - 1)
      .forEach((v) => {
        if (finalists.indexOf(v.contestantId) !== -1) return;
        accumOf(byContestant, v.contestantId).placementPoints += POINTS_THIRD;
      });
  });

  return { runsTotal, byContestant };
}

/**
 * 대결에 나온 횟수 — 위 주석의 `runsTotal + picks − wins`.
 * 점유율의 분모이고, 직접 세어지지 않는 유일한 값이다.
 */
export function appearancesOf(accum: ContestantAccum, runsTotal: number): number {
  return runsTotal + accum.picks - accum.wins;
}
