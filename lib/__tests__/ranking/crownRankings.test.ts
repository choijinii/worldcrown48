/**
 * computeCrownRankings — 차트 목록 (Crown Score 순).
 *
 * 경보(T-1~T-4)는 지금처럼 **rate 순 목록**으로 따로 판정한다(대표 2026-09-24). 그래서
 * 이 목록의 구성원은 옛 `computeRankings` 와 **같아야** 한다 — 두 목록의 구성원이 갈리면
 * 경보의 기준선(직전 세대 캐시)에서 Contestant이 사라져 T-3·T-4가 조용히 꺼진다.
 */
import { describe, expect, it } from "vitest";
import { computeCrownRankings } from "../../ranking/crownRankings";
import { tallyRuns, type RunVote } from "../../ranking/tallyRuns";
import type { ContestantTally } from "../../ranking/rankingTypes";

const MATCH_COUNT: Record<number, number> = { 1: 24, 2: 12, 3: 6, 4: 3, 5: 1 };

/** 완주 판 1개. `winners[round]` 가 그 라운드의 승자 id 배열. */
function runVotes(userId: string, winners: Record<number, string[]>): RunVote[] {
  const votes: RunVote[] = [];
  for (let round = 1; round <= 5; round++) {
    for (let m = 0; m < MATCH_COUNT[round]; m++) {
      votes.push({
        userId,
        runIndex: 1,
        round,
        matchId: `t1:r${round}:m${m}`,
        contestantId: winners[round][m],
      });
    }
  }
  return votes;
}

/** c0..c23 이 순서대로 이기는 판 — 1등 c0 · 2등 c1·c2 · 3등 c3·c4·c5. */
function straightRun(userId: string): RunVote[] {
  const ids = Array.from({ length: 24 }, (_, i) => `c${i}`);
  return runVotes(userId, {
    1: ids,
    2: ids.slice(0, 12),
    3: ids.slice(0, 6),
    4: ids.slice(0, 3),
    5: ids.slice(0, 1),
  });
}

const tally = (id: string, voteCount: number): ContestantTally => ({
  contestantId: id,
  name: id.toUpperCase(),
  videoId: null,
  voteCount,
});

describe("computeCrownRankings", () => {
  it("Crown Score 높은 순으로 줄을 세운다 (정본 §0)", () => {
    const runs = tallyRuns(straightRun("u1"));
    const tallies = [tally("c2", 3), tally("c0", 5), tally("c1", 4)];

    const rows = computeCrownRankings(tallies, runs);

    expect(rows.map((r) => r.contestantId)).toEqual(["c0", "c1", "c2"]);
    expect(rows[0].rank).toBe(1);
  });

  it("각 행에 Crown Score 정수와 세 비율을 싣는다 (화면은 점수만, 비율은 저장용)", () => {
    const runs = tallyRuns(straightRun("u1"));
    const rows = computeCrownRankings([tally("c0", 5)], runs);

    // 판 1회 · c0 = 1등: 순위점수율 10/1/10 = 1 · 우승율 1 · 점유율 5/5 = 1 → 1000점
    expect(rows[0].crownScore).toBe(1000);
    expect(rows[0].placementRate).toBe(1);
    expect(rows[0].winRate).toBe(1);
    expect(rows[0].shareRate).toBe(1);
  });

  it("동점은 순위를 나눠 갖고 다음 순위를 건너뛴다 — 1·1·3 (지금 코드 규칙 유지)", () => {
    // 판이 없으면 모두 0점 → 전원 동점. voteCount 는 목록에 남기 위한 값일 뿐.
    const empty = tallyRuns([]);
    const rows = computeCrownRankings(
      [tally("a", 1), tally("b", 1), tally("c", 1)],
      empty,
    );

    expect(rows.map((r) => r.rank)).toEqual([1, 1, 1]);
  });

  it("voteCount 0 은 목록에서 빠진다 — 옛 computeRankings 와 구성원이 같아야 한다", () => {
    const runs = tallyRuns(straightRun("u1"));
    const rows = computeCrownRankings([tally("c0", 5), tally("zzz", 0)], runs);

    expect(rows.map((r) => r.contestantId)).toEqual(["c0"]);
  });

  it("경보가 읽는 voteCount·rate 는 그대로 실려 나간다", () => {
    const runs = tallyRuns(straightRun("u1"));
    const rows = computeCrownRankings([tally("c0", 3), tally("c1", 1)], runs);

    expect(rows.find((r) => r.contestantId === "c0")?.voteCount).toBe(3);
    expect(rows.find((r) => r.contestantId === "c0")?.rate).toBe(75);
  });
});
