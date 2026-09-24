/**
 * lib/ranking/crownRankings — 차트 목록 (Crown Score 순).
 *
 * 정본: `marketing/00_strategy/CROWN_SCORE_v1.0.md` §0 "높은 순으로 줄 세움".
 *
 * ## 옛 computeRankings 와의 관계
 *
 * 옛 목록은 **선택 수(rate) 순**이었다. 그 목록은 사라지지 않는다 — 이상 징후
 * (T-1~T-4)가 지금처럼 그것으로 판정한다(대표 2026-09-24). 그래서 이 목록은
 * **구성원이 옛 목록과 같아야 한다**: `voteCount === 0` 제외 규칙을 그대로 쓴다.
 * 구성원이 갈리면 경보의 기준선(직전 세대 캐시)에서 Contestant이 사라져 T-3·T-4가
 * 조용히 꺼진다.
 *
 * 동점 규칙도 옛 목록 그대로다 — 순위를 나눠 갖고 다음 순위를 건너뛴다(1·1·3).
 */
import { crownScoreOf, placementRateOf, shareRateOf, winRateOf } from "./crownScore";
import { appearancesOf, type ContestantAccum, type RunsTally } from "./tallyRuns";
import { roundRate, totalVotesOf } from "./computeRankings";
import type { ContestantTally, CrownRankingEntry } from "./rankingTypes";

const NO_RUNS: ContestantAccum = { placementPoints: 0, wins: 0, picks: 0 };

export function computeCrownRankings(
  tallies: ContestantTally[],
  runs: RunsTally,
): CrownRankingEntry[] {
  // 옛 목록과 같은 구성원 (handoff §6.1 — 0인 Contestant은 빈 상태가 대신 말한다).
  const positive = tallies.filter((t) => t.voteCount > 0);
  const totalVotes = totalVotesOf(positive);

  const rows = positive.map((t) => {
    const accum = runs.byContestant.get(t.contestantId) ?? NO_RUNS;
    const input = {
      runsTotal: runs.runsTotal,
      placementPoints: accum.placementPoints,
      wins: accum.wins,
      picks: accum.picks,
      appearances: appearancesOf(accum, runs.runsTotal),
    };
    return {
      rank: 0, // 아래에서 채운다
      contestantId: t.contestantId,
      name: t.name,
      videoId: t.videoId,
      voteCount: t.voteCount,
      rate: totalVotes === 0 ? 0 : roundRate((t.voteCount / totalVotes) * 100),
      crownScore: crownScoreOf(input),
      placementRate: placementRateOf(input),
      winRate: winRateOf(input),
      shareRate: shareRateOf(input),
    };
  });

  rows.sort(
    (a, b) =>
      b.crownScore - a.crownScore ||
      a.contestantId.localeCompare(b.contestantId),
  );

  let prevScore = Number.NaN;
  let prevRank = 0;
  rows.forEach((row, i) => {
    const rank = row.crownScore === prevScore ? prevRank : i + 1;
    prevScore = row.crownScore;
    prevRank = rank;
    row.rank = rank;
  });

  return rows;
}
