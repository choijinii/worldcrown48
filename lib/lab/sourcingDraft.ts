/**
 * sourcingDraft — 소싱 결과를 48칸 그리드에 얹는 순수 층 (LAB-EV-2 §5 C).
 *
 * LAB-EV-1의 `videoDraft`와 같은 자리, 같은 규칙이다. 영상 필드를 만드는 함수는
 * `buildVideoFields` 하나뿐이고 여기서 **다시 만들지 않는다**(R3 복제 금지) —
 * 검수기로 넣은 영상과 자동 소싱으로 넣은 영상이 슬롯에서 구별되면 안 된다.
 *
 * 여기서 추가되는 건 "슬롯 상태"뿐이다: 제안 / 수동 필요·사유 / 실존 의심.
 * 이 상태는 **화면 배지 전용**이고 Firestore에 안 실린다 — 발행되는 것은 영상이지
 * 소싱 과정이 아니다(R6: 운영자가 훑고 [토너먼트 생성]을 누른다).
 */
import { buildVideoFields } from "@/lib/lab/videoDraft";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import type {
  SlotSourcingStatus,
  SourcingFailureReason,
  SourcingResult,
  SourcingTarget,
} from "@/lib/embed/sourcing/types";

/** 슬롯 하나의 소싱 상태 — 그리드 배지가 읽는다. */
export interface SlotSourcingState {
  status: SlotSourcingStatus;
  reason?: SourcingFailureReason;
  /**
   * 배정된 영상이 부정 키워드로 감점됐을 때 그 키워드 (AI-2). 배지 툴팁에만 쓴다 —
   * "제안"이 떴어도 논란 영상이 얹혔을 수 있다는 걸 운영자가 알아야 한다.
   */
  demotedTerms?: string[];
}

/** index → 상태. Record로 두는 건 React state 갱신이 단순해서다. */
export type SourcingStates = Record<number, SlotSourcingState>;

/**
 * 소싱 대상 = **이름이 있는 슬롯 전부**. 이름이 없으면 검색어를 만들 수 없다.
 *
 * 이미 영상이 붙은 슬롯도 포함한다: DoD의 "48명 풀 실행"과 스모크 ③(재실행 →
 * 캐시 적중으로 유닛 ≈0)이 같은 버튼을 두 번 누르는 시나리오이기 때문이다.
 */
export function buildSourcingTargets(drafts: ContestantDraft[]): SourcingTarget[] {
  const targets: SourcingTarget[] = [];
  drafts.forEach((draft, index) => {
    const name = (draft?.name ?? "").trim();
    if (!name) return;
    const searchHint = (draft.imageSearchKeyword ?? "").trim();
    targets.push(searchHint ? { index, name, searchHint } : { index, name });
  });
  return targets;
}

/**
 * 이번 실행이 건드리지 않는 슬롯들이 이미 쓰고 있는 videoId — 중복 회피의 씨앗.
 * 슬롯 1개만 재검색할 때 나머지 47칸의 영상이 여기로 들어간다.
 */
export function collectExcludedVideoIds(
  drafts: ContestantDraft[],
  targetIndexes: readonly number[],
): string[] {
  const targeted = new Set(targetIndexes);
  const ids: string[] = [];
  drafts.forEach((draft, index) => {
    if (targeted.has(index)) return;
    const id = draft?.videoId;
    if (id) ids.push(id);
  });
  return Array.from(new Set(ids));
}

/** 배치를 R5의 크기로 자른다. 클라이언트가 순차 호출하며 진행률을 그린다. */
export function chunkTargets(targets: SourcingTarget[], size: number): SourcingTarget[][] {
  const out: SourcingTarget[][] = [];
  for (let i = 0; i < targets.length; i += size) out.push(targets.slice(i, i + size));
  return out;
}

/**
 * 배지를 떼어낸 새 상태.
 *
 * 배지는 "이 칸의 **이 인물**에 대해 소싱이 이렇게 끝났다"는 말이다. 칸의 내용이
 * 바뀌면(AI 재채우기·카드 비우기·영상 빼기) 그 말은 즉시 거짓이 된다 — 인물이
 * 교체됐는데 "제안"이 남아 있으면 운영자는 있지도 않은 영상을 믿는다.
 */
export function dropSourcingStates(
  states: SourcingStates,
  indexes: readonly number[],
): SourcingStates {
  if (indexes.length === 0) return states;
  const drop = new Set(indexes);
  const next: SourcingStates = {};
  for (const key of Object.keys(states)) {
    const index = Number(key);
    if (!drop.has(index)) next[index] = states[index];
  }
  return next;
}

/**
 * 결과 → 배지 상태만. 그리드 주입(아래)과 분리해 둔 건 React state 두 개를 각자의
 * updater 안에서 갱신하기 위해서다 — 한 updater 안에서 다른 setState를 부르면
 * StrictMode의 이중 호출에 얹혀 간다.
 */
export function toSourcingStates(results: readonly SourcingResult[]): SourcingStates {
  const states: SourcingStates = {};
  for (const result of results) {
    const demoted = result.demotedTerms ?? [];
    states[result.index] = {
      status: result.status,
      ...(result.reason ? { reason: result.reason } : {}),
      ...(demoted.length > 0 ? { demotedTerms: demoted } : {}),
    };
  }
  return states;
}

/**
 * 제안분을 슬롯에 주입한 새 배열 + 배지 상태.
 *
 * 실패 슬롯의 **기존 영상은 건드리지 않는다**: 재실행에서 한 칸이 "수동 필요"로
 * 떨어졌다고 이미 검수를 마친 영상을 지우면, 운영자가 손으로 넣은 것까지 사라진다.
 */
export function applySourcingResults(
  drafts: ContestantDraft[],
  results: readonly SourcingResult[],
  total: number,
  emptyDraft: () => ContestantDraft,
): { drafts: ContestantDraft[]; states: SourcingStates } {
  const next = Array.from({ length: total }, (_, i) => ({ ...(drafts[i] ?? emptyDraft()) }));

  for (const result of results) {
    const index = result.index;
    if (index < 0 || index >= total) continue;
    if (result.status !== "suggested" || !result.verdict) continue;
    next[index] = {
      ...next[index],
      ...buildVideoFields(result.verdict, result.startSec ?? null),
    };
  }

  return { drafts: next, states: toSourcingStates(results) };
}

/** 실행 1회의 집계 — 완료 토스트와 §8 B 실측 표가 읽는다. */
export interface SourcingRunTally {
  suggested: number;
  manual: number;
  unknownPerson: number;
  cacheHits: number;
  aiJudged: number;
  ambiguous: number;
  searchCalls: number;
  units: number;
}

export const EMPTY_TALLY: SourcingRunTally = {
  suggested: 0,
  manual: 0,
  unknownPerson: 0,
  cacheHits: 0,
  aiJudged: 0,
  ambiguous: 0,
  searchCalls: 0,
  units: 0,
};

/** 배치 결과를 누적한다(배치가 6번 돌아도 표는 하나다). */
export function addToTally(
  tally: SourcingRunTally,
  batch: {
    results: readonly SourcingResult[];
    spent: { searchCalls: number; units: number };
    cacheHits: number;
    aiJudged: number;
  },
): SourcingRunTally {
  const next = { ...tally };
  for (const r of batch.results) {
    if (r.status === "suggested") next.suggested += 1;
    else if (r.status === "unknown-person") next.unknownPerson += 1;
    else next.manual += 1;
    next.ambiguous += r.ambiguous;
  }
  next.cacheHits += batch.cacheHits;
  next.aiJudged += batch.aiJudged;
  next.searchCalls += batch.spent.searchCalls;
  next.units += batch.spent.units;
  return next;
}
