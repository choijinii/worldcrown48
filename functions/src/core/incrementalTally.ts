/**
 * incrementalTally — T5 차트 증분 집계의 순수 계산부 (설계보고 `outputs/T5_설계보고_2026-11-24.md` §2 (가′) · §3).
 *
 * ## 무엇을 하는가
 *
 * 발표마다 대회 `votes` 를 전량 읽는 대신, 지난 발표 뒤 **새로 셀 수 있게 된** 기록만 읽어
 * 누적(`RankingAccum`)에 더한다. 이 파일은 I/O 없이 "구간 하나의 증분"과 "누적 더하기"만 한다.
 *
 * ## 셀 수 있게 된 시각 (가′)
 *
 * 기록은 `createdAt` 에 셀 수 있게 된다. 단 게스트였다가 로그인으로 옮겨진 기록은 옮긴 시각
 * (`relinkedAt`)에 처음 셀 대상이 된다 — 그 전에는 `isGuest === true` 라 세지 않았다.
 *
 * ## 판은 "마지막 기록이 셀 수 있게 된 구간"에서 한 번만
 *
 * 판(Run)은 기록 46건이 모여야 의미가 있다. 판의 `max(countableAt)` 이 들어 있는 구간에서
 * 그 판의 기록 전부를 모아 `tallyRuns` 에 넣는다. 그래서 발표 경계에 걸친 판이나, 500건씩
 * 나눠 옮기던 중에 발표가 돈 판도 **한 구간에서 정확히 한 번** 세어진다.
 *
 * ## 고치지 않는 것
 *
 * 게스트 거르기 · 완주 판정 · 순위 점수는 `tallyVotes` · `tallyRuns` 가 정본이다. 여기서
 * 다시 구현하지 않고 부르기만 한다(산식 변경 금지 — global 제약).
 */
import {
  tallyRuns,
  type ContestantAccum,
  type RunVote,
  type RunsTally,
} from "../_ranking/tallyRuns";
import { tallyVotes } from "./rankingAggregator";
import { CLOSED_GRACE_HOURS, PUBLISH_INTERVAL_HOURS } from "./rankingWindow";

/**
 * 구간 끝 = 발표 시작 − 2분. 서버 시각(`createdAt`)이 찍힌 기록이 쿼리에 보이기까지의
 * 지연을 흡수한다 — 끝을 "지금"으로 잡으면 막 쓰인 기록이 이번에도 다음에도 빠질 수 있다.
 */
export const PUBLISH_LAG_MS = 120_000;

/** 완주한 한 판의 기록 수 = 24 + 12 + 6 + 3 + 1. */
export const RUN_VOTES = 46;

const HOUR_MS = 3_600_000;
/** THE FINAL — 이 라운드 기록이 있으면 판이 끝났다(`tallyRuns` 와 같은 기준). */
const FINAL_ROUND = 5;

/** 증분이 읽는 기록 — 문서 id 와 정수 ms 시각을 덧붙인 `RunVote`. */
export interface AccumVote extends RunVote {
  id: string;
  createdAtMs: number;
  /** 게스트 → 로그인으로 옮긴 시각. 옮긴 적 없으면 null. */
  relinkedAtMs: number | null;
}

/**
 * 대회 누적. Firestore 에 그대로 쓰도록 Map 이 아닌 평범한 객체다.
 * `voteCounts` = `tallyVotes` 누적 · 나머지 둘 = `tallyRuns` 누적.
 */
export interface RankingAccum {
  voteCounts: Record<string, number>;
  runsTotal: number;
  byContestant: Record<string, ContestantAccum>;
}

export function countableAtMs(v: AccumVote): number {
  return v.relinkedAtMs ?? v.createdAtMs;
}

/**
 * 반열린 구간 `[start, end)`. 끝과 같은 ms 는 다음 구간 몫이다 — 닫힌 구간이면 경계의
 * 기록이 두 구간에서 두 번 세어진다.
 */
export function inWindow(ms: number, startMs: number, endMs: number): boolean {
  return startMs <= ms && ms < endMs;
}

export function windowEndMs(nowMs: number): number {
  return nowMs - PUBLISH_LAG_MS;
}

/** `tallyRuns` 내부의 판 키와 **같은 규칙**이어야 한다(runIndex 없으면 1). */
export function runKeyOf(v: { userId: string; runIndex?: number }): string {
  return `${v.userId}\u0000${v.runIndex ?? 1}`;
}

export function emptyAccum(): RankingAccum {
  return { voteCounts: {}, runsTotal: 0, byContestant: {} };
}

export function addAccum(a: RankingAccum, b: RankingAccum): RankingAccum {
  const voteCounts: Record<string, number> = { ...a.voteCounts };
  Object.keys(b.voteCounts).forEach((k) => {
    voteCounts[k] = (voteCounts[k] ?? 0) + b.voteCounts[k];
  });
  const byContestant: Record<string, ContestantAccum> = {};
  Object.keys(a.byContestant).forEach((k) => {
    byContestant[k] = { ...a.byContestant[k] };
  });
  Object.keys(b.byContestant).forEach((k) => {
    const x = byContestant[k] ?? { placementPoints: 0, wins: 0, picks: 0 };
    const y = b.byContestant[k];
    byContestant[k] = {
      placementPoints: x.placementPoints + y.placementPoints,
      wins: x.wins + y.wins,
      picks: x.picks + y.picks,
    };
  });
  return { voteCounts, runsTotal: a.runsTotal + b.runsTotal, byContestant };
}

function isZeroAccum(c: ContestantAccum | undefined): boolean {
  return !c || (c.placementPoints === 0 && c.wins === 0 && c.picks === 0);
}

/** 0 값 키는 없는 것과 같다 — 증분과 전량이 빈 칸을 남기는 방식이 달라도 같은 누적이다. */
export function accumEquals(a: RankingAccum, b: RankingAccum): boolean {
  if (a.runsTotal !== b.runsTotal) return false;
  const countKeys = Array.from(new Set(Object.keys(a.voteCounts).concat(Object.keys(b.voteCounts))));
  for (const k of countKeys) {
    if ((a.voteCounts[k] ?? 0) !== (b.voteCounts[k] ?? 0)) return false;
  }
  const accKeys = Array.from(new Set(Object.keys(a.byContestant).concat(Object.keys(b.byContestant))));
  for (const k of accKeys) {
    const x = a.byContestant[k];
    const y = b.byContestant[k];
    if (isZeroAccum(x) && isZeroAccum(y)) continue;
    if (!x || !y) return false;
    if (x.placementPoints !== y.placementPoints || x.wins !== y.wins || x.picks !== y.picks) return false;
  }
  return true;
}

/**
 * 구간의 선택 수 증분. 크론은 `createdAt` 쿼리와 `relinkedAt` 쿼리 결과를 합쳐 넣으므로
 * 같은 문서가 두 번 올 수 있다 → id 로 한 번만. 기록마다 셀 수 있게 된 시각 한 곳에서만
 * 센다(옮겨진 기록은 `createdAt` 구간에서 세지 않는다).
 */
export function voteCountDelta(
  votes: AccumVote[],
  startMs: number,
  endMs: number,
): Record<string, number> {
  const seen = new Set<string>();
  const picked: AccumVote[] = [];
  for (const v of votes) {
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    if (inWindow(countableAtMs(v), startMs, endMs)) picked.push(v);
  }
  const out: Record<string, number> = {};
  Array.from(tallyVotes(picked).entries()).forEach(([k, n]) => {
    out[k] = n;
  });
  return out;
}

/**
 * 이 구간에서 끝났을 수 있는 판의 키. 판의 마지막 셀 수 있게 된 기록은 둘 중 하나다:
 *   · 라운드 5 기록(이 구간에 만들어짐) — 로그인으로 끝낸 판
 *   · 이 구간에 옮겨진 기록 — 게스트로 끝내고 로그인한 판 · 앞 조각만 옮겨진 판
 * 후보일 뿐이다 — 실제로 셀지는 판 전체를 읽은 뒤 `runDelta` 가 정한다.
 */
export function candidateRunKeys(votes: AccumVote[], startMs: number, endMs: number): string[] {
  const keys = new Set<string>();
  for (const v of votes) {
    const finalHere = v.round === FINAL_ROUND && inWindow(countableAtMs(v), startMs, endMs);
    const relinkedHere = v.relinkedAtMs != null && inWindow(v.relinkedAtMs, startMs, endMs);
    if (finalHere || relinkedHere) keys.add(runKeyOf(v));
  }
  return Array.from(keys);
}

/**
 * 판 증분. 판마다 `max(countableAt)` 이 구간 안일 때만 그 판의 기록 전부를 모아 **한 번의**
 * `tallyRuns` 로 센다. 판의 일부만 옮겨진 구간에서는 max 가 뒤 구간이라 세지 않는다.
 * 게스트 판 · 미완주 판 제외는 `tallyRuns` 가 한다. 선택 수는 `voteCountDelta` 몫 → `{}`.
 */
export function runDelta(
  runs: Map<string, AccumVote[]>,
  startMs: number,
  endMs: number,
): RankingAccum {
  const picked: AccumVote[] = [];
  Array.from(runs.values()).forEach((runVotes) => {
    if (runVotes.length === 0) return;
    const last = runVotes.reduce((mx, v) => Math.max(mx, countableAtMs(v)), -Infinity);
    if (inWindow(last, startMs, endMs)) picked.push(...runVotes);
  });
  const t = tallyRuns(picked);
  const byContestant: Record<string, ContestantAccum> = {};
  Array.from(t.byContestant.entries()).forEach(([k, a]) => {
    byContestant[k] = { ...a };
  });
  return { voteCounts: {}, runsTotal: t.runsTotal, byContestant };
}

/** 누적 → 기존 크론 입력 모양(`buildTallies` 의 counts · `buildRankingUpdate` 의 runs). */
export function accumToRankingInputs(a: RankingAccum): { counts: Map<string, number>; runs: RunsTally } {
  const counts = new Map<string, number>();
  Object.keys(a.voteCounts).forEach((k) => {
    if (a.voteCounts[k] !== 0) counts.set(k, a.voteCounts[k]);
  });
  const byContestant = new Map<string, ContestantAccum>();
  Object.keys(a.byContestant).forEach((k) => {
    if (!isZeroAccum(a.byContestant[k])) byContestant.set(k, { ...a.byContestant[k] });
  });
  return { counts, runs: { runsTotal: a.runsTotal, byContestant } };
}

/**
 * 이번 발표가 이 대회의 집계 창 안 마지막 발표인가 = 다음 발표(지금 + 12h)가 창
 * (마감 + 13h) 밖인가.
 *
 * ⚠️ 비교는 `>=` 다. 창 판정 `isInRankingWindow` 가 `deadline > now − 13h` (초과)라서 다음
 * 발표가 **정확히** 마감 + 13h 이면 그 발표는 이미 창 밖이다 → 이번이 마지막. `>` 로 쓰면 그
 * 경계에서 "마지막 아님"이라 답해 마지막 발표를 놓친다(마감 1시간 뒤 발표가 바로 그 경우).
 */
export function isLastPublishInWindow(deadlineMs: number, nowMs: number): boolean {
  return nowMs + PUBLISH_INTERVAL_HOURS * HOUR_MS >= deadlineMs + CLOSED_GRACE_HOURS * HOUR_MS;
}
