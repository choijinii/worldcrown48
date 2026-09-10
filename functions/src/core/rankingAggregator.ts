/**
 * rankingAggregator — pure reduction of votes → per-contestant tallies (handoff
 * §3 / trap #2). The cron loads the `votes` for one Tournament ONCE and groups in
 * memory here (no per-contestant aggregation query), then joins contestant
 * metadata (name/imageUrl) so the cache is denormalized for the UI. Pure & total
 * — node-env vitest, no Firestore.
 */
import type { ContestantTally } from "../_ranking/rankingTypes";

/** One vote's only fields we need to tally. */
export interface VoteLike {
  contestantId: string;
  /**
   * 참가 규칙 v2.1 (§16-5): 게스트(익명 계정)의 선택인가. `onVote` 가 기록한다.
   * **옵셔널인 것이 정본이다** — PR 2 이전의 옛 기록에는 이 필드가 없고, 그 기록은
   * 소급 제외하지 않기로 대표가 확정했다(2026-09-07).
   */
  isGuest?: boolean;
}

/** Minimal contestant metadata the cron joins (Contestant doc fields). */
export interface ContestantMeta {
  id: string;
  name: string;
  /** 유튜브 videoId (media.embed.videoId). 없으면 빈 문자열 → 아바타는 글자. */
  videoId: string;
}

/**
 * Group raw votes into a contestantId → count map.
 *
 * AC 10 (v2.1 · §16-5): 게스트의 선택은 여기서 빠진다. 게스트 uid는 브라우저 창마다 새로
 * 생겨 사람 단위 상한이 없으므로(§9 함정 4) 랭킹에서 빼는 것이 조작 동기를 없애는 수단이다.
 *
 * ⚠️ **이 필터는 반드시 메모리다.** Firestore `where("isGuest","!=",true)` 로 옮기면
 * `!=` 쿼리가 **필드 없는 옛 문서를 통째로 빼버려** 소급 제외가 된다 — 대표가 확정한
 * "앞으로만"(2026-09-07)과 정반대다. 크론은 이미 `votes` 를 통째로 한 번 읽으므로
 * (trap #2) 여기 한 줄에 추가 읽기 비용이 없다.
 */
export function tallyVotes(votes: VoteLike[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const v of votes) {
    if (!v.contestantId) continue;
    // `=== true` 여야 한다. truthy 검사면 필드 없는 옛 기록(undefined)이 함께 빠진다.
    if (v.isGuest === true) continue;
    counts.set(v.contestantId, (counts.get(v.contestantId) ?? 0) + 1);
  }
  return counts;
}

/**
 * Join counts onto the Tournament's contestants. One tally per contestant
 * (0-vote ones included — computeRankings filters them out). 빈 `videoId`는
 * null로 정규화한다(RankingEntry.videoId가 `string | null`).
 *
 * LAB-UX-1 PR-2: 예전에는 운영자가 붙인 `imageUrl`을 실었는데 실데이터 528건 중
 * 0건이었다. 이제 영상 id를 싣고 URL 조립은 화면이 한다.
 */
export function buildTallies(
  counts: Map<string, number>,
  contestants: ContestantMeta[],
): ContestantTally[] {
  return contestants.map((c) => ({
    contestantId: c.id,
    name: c.name,
    videoId: c.videoId ? c.videoId : null,
    voteCount: counts.get(c.id) ?? 0,
  }));
}
