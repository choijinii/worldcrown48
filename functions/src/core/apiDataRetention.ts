/**
 * apiDataRetention — YouTube API 자료 30일 판정 (POLICY-YT-1 · 개발자 정책 III.E.4).
 *
 * 정책 문서(개인정보처리방침 "YouTube API 서비스")가 약속한 것: YouTube에서 받은 영상 정보는
 * 30일을 넘겨 보관하지 않고, 그 전에 새로 받거나 지운다.
 *
 *   ① video_search_cache — 검색 횟수를 아끼려고 쌓는 캐시(search.list 는 하루 100콜)라 지우기보다
 *      **새로 받기**(videos.list, 50개에 1유닛)가 기본이다. 25일이 넘으면 새로 받고(30일 전 여유 5일),
 *      30일을 넘겼거나 새로 받기에 실패하면 지운다. 나이의 기준 = `apiRefreshedAt`(새로 받은 시각),
 *      없으면 처음 저장 시각 `cachedAt`.
 *      *이 수치가 정하지 않는 것*: 검색 결과의 신선함(7일 · isCacheFresh 가 cachedAt 으로 판정)과
 *      검색을 다시 할지 여부 — 그래서 cachedAt 은 건드리지 않는다.
 *   ② 끝난 대회의 재생 판정(contestants.media.embed.status · tournaments.videoAlert) — 진행 중인
 *      대회에서만 쓸모가 있으므로 끝나면 지운다(할당량 0). 다시 진행 중이 되면 월요일 재검사가 채운다.
 *
 * 여기는 판정만 한다. 읽기·쓰기·API 호출은 scheduleYouTubeDataRefresh.ts.
 */
import type { SearchCandidate } from "../_embed/sourcing/types";
import type { YouTubeApiItem } from "../_embed/verdict";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 이 나이를 넘으면 새로 받는다. */
export const API_DATA_REFRESH_AFTER_MS = 25 * DAY_MS;
/** 이 나이를 넘으면 지운다 — 정책 문서의 "30일". */
export const API_DATA_MAX_AGE_MS = 30 * DAY_MS;

export type CacheRetention = "keep" | "refresh" | "delete";

export interface CacheAgeFields {
  cachedAt?: unknown;
  apiRefreshedAt?: unknown;
}

function epochMs(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/** 검색 캐시 문서 하나를 어떻게 할지. 나이를 모르면 30일 넘은 것으로 본다. */
export function planCacheRetention(doc: CacheAgeFields, nowMs: number): CacheRetention {
  const base = epochMs(doc.apiRefreshedAt) ?? epochMs(doc.cachedAt);
  if (base === null) return "delete";
  const age = nowMs - base;
  if (age > API_DATA_MAX_AGE_MS) return "delete";
  if (age > API_DATA_REFRESH_AFTER_MS) return "refresh";
  return "keep";
}

/**
 * videos.list 응답으로 후보 목록을 새로 쓴다. 응답에 없는 영상(내려감·비공개)은 그 후보만 뺀다.
 * 순서는 그대로 — 후보 순서가 곧 재시도 순서다(videoSearchCache 머리말).
 */
export function refreshCandidates(
  cached: SearchCandidate[],
  items: YouTubeApiItem[],
): SearchCandidate[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const out: SearchCandidate[] = [];
  for (const c of cached) {
    const item = byId.get(c.videoId);
    if (!item) continue;
    out.push({
      videoId: c.videoId,
      title: item.snippet?.title ?? "",
      channelTitle: item.snippet?.channelTitle ?? "",
    });
  }
  return out;
}

export interface TournamentRetentionLike {
  id: string;
  status: string;
  hasVideoAlert: boolean;
}

export interface ContestantRetentionLike {
  id: string;
  tournamentId: string;
  hasEmbedStatus: boolean;
}

/** 끝난 대회(status "ended")에서 지울 재생 판정. 진행 중·준비 중 대회는 건드리지 않는다. */
export function planEndedEmbedCleanup(
  tournaments: TournamentRetentionLike[],
  contestants: ContestantRetentionLike[],
): { tournamentIds: string[]; contestantIds: string[] } {
  const ended = new Set(tournaments.filter((t) => t.status === "ended").map((t) => t.id));
  return {
    tournamentIds: tournaments.filter((t) => ended.has(t.id) && t.hasVideoAlert).map((t) => t.id),
    contestantIds: contestants
      .filter((c) => ended.has(c.tournamentId) && c.hasEmbedStatus)
      .map((c) => c.id),
  };
}
