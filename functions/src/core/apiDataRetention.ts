/**
 * apiDataRetention — YouTube API 자료 30일 판정 (POLICY-YT-1 · 개발자 정책 III.E.4).
 *
 * 정책 문서(개인정보처리방침 "YouTube API 서비스")가 약속한 것: YouTube에서 받은 영상 정보는
 * 30일을 넘겨 보관하지 않고, 그 전에 새로 받거나 지운다.
 *
 *   ① video_search_cache — 7일 신선도(isCacheFresh · `cachedAt`)를 넘긴 문서는 **지운다**(할당량 0).
 *      검색 쪽(readSearchCache)은 7일 지난 문서를 쓰지 않고 다시 검색해 덮어쓰므로, 새로 받아 둬도
 *      다시 읽히지 않는다 — 그래서 새로 받지 않는다(대표 결정 2026-10-10, 지시서 R4 "25일 새로 받기"를 바꿈).
 *      경계를 isCacheFresh 하나에 묶어 "쓰는 문서는 남고 안 쓰는 문서만 지운다"가 늘 맞게 한다.
 *   ② 끝난 대회의 재생 판정(contestants.media.embed.status · tournaments.videoAlert) — 진행 중인
 *      대회에서만 쓸모가 있으므로 끝나면 지운다(할당량 0). 다시 진행 중이 되면 월요일 재검사가 채운다.
 *
 * 여기는 판정만 한다. 읽기·쓰기는 scheduleYouTubeDataRetention.ts.
 */
import { isCacheFresh } from "../_embed/sourcing/searchQuery";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 정책 문서의 "30일" — 어떤 YouTube API 자료도 이보다 오래 두지 않는다. */
export const API_DATA_MAX_AGE_MS = 30 * DAY_MS;

export type CacheRetention = "keep" | "delete";

export interface CacheAgeFields {
  cachedAt?: unknown;
}

function epochMs(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/** 검색 캐시 문서 하나를 어떻게 할지. 나이를 모르면 지운다. */
export function planCacheRetention(doc: CacheAgeFields, nowMs: number): CacheRetention {
  const cachedAt = epochMs(doc.cachedAt);
  if (cachedAt === null) return "delete";
  return isCacheFresh(cachedAt, nowMs) ? "keep" : "delete";
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
