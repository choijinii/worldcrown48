/**
 * buildRankingUpdate — Crown Score 전환 후의 두 가지 불변 (ARENA-1 PR 3).
 *
 *   ① 캐시의 `rankings` 는 **Crown Score 순**이고 `runsTotal` 을 싣는다 (정본 §0·§5).
 *   ② 이상 징후(T-1~T-4)는 **지금처럼 rate 순 목록**으로 판정한다 (대표 2026-09-24).
 *
 * ②가 이 파일의 존재 이유다. 정렬 기준만 바꾸고 경보를 그대로 두면 "#1"의 뜻이 조용히
 * 바뀌어 관리자 경보의 기준이 달라진다 — 아무도 모르게.
 */
import { describe, expect, it } from "vitest";
import { buildRankingUpdate } from "../core/scheduleRankingCacheCore";
import { tallyRuns, type RunVote } from "../_ranking/tallyRuns";
import type { ContestantTally } from "../_ranking/rankingTypes";

const tally = (id: string, voteCount: number): ContestantTally => ({
  contestantId: id,
  name: id.toUpperCase(),
  videoId: null,
  voteCount,
});

const MATCH_COUNT: Record<number, number> = { 1: 24, 2: 12, 3: 6, 4: 3, 5: 1 };

/** 완주 판 1개 — `champion` 이 끝까지 이기고, 나머지 자리는 filler 가 채운다. */
function completeRun(userId: string, champion: string): RunVote[] {
  const votes: RunVote[] = [];
  for (let round = 1; round <= 5; round++) {
    for (let m = 0; m < MATCH_COUNT[round]; m++) {
      votes.push({
        userId,
        runIndex: 1,
        round,
        matchId: `t1:r${round}:m${m}`,
        contestantId: m === 0 ? champion : `filler${m}`,
      });
    }
  }
  return votes;
}

describe("buildRankingUpdate — 차트는 Crown Score 순", () => {
  // 'loser' 는 선택 수가 압도적이지만 완주 판에서 한 번도 이기지 못했고,
  // 'winner' 는 선택 수가 적지만 판을 우승했다.
  const runs = tallyRuns(completeRun("u1", "winner"));
  const tallies = [tally("loser", 70), tally("winner", 30)];
  const update = buildRankingUpdate({
    tournamentId: "t1",
    tallies,
    runs,
    prevCache: null,
    history24: null,
    existingUnresolvedTags: [],
  });

  it("Crown Score 높은 쪽이 1위 — 선택 수가 많은 쪽이 아니다", () => {
    expect(update.rankings[0].contestantId).toBe("winner");
    expect(update.rankings[0].rank).toBe(1);
  });

  it("대회 전체 완주 판수를 캐시에 싣는다 (10판 기준이 읽는 값 · 정본 §5)", () => {
    expect(update.runsTotal).toBe(1);
  });

  it("각 행에 Crown Score와 세 비율이 실린다 (화면은 점수만 그린다)", () => {
    const winner = update.rankings.find((e) => e.contestantId === "winner")!;
    expect(winner.crownScore).toBeGreaterThan(0);
    expect(winner).toHaveProperty("placementRate");
    expect(winner).toHaveProperty("winRate");
    expect(winner).toHaveProperty("shareRate");
  });

  it("T-1은 rate 순 #1(선택 70%)로 판정한다 — Crown Score 1위가 아니라", () => {
    // 'loser' 의 rate = 70% ≥ 60% → T-1이 떠야 한다. 차트 1위는 'winner' 지만
    // 경보는 예전처럼 선택 수 비중으로 본다.
    expect(update.alertActions.map((a) => a.type)).toContain("T-1");
  });
});
