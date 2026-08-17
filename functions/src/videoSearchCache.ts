/**
 * videoSearchCache — 검색 결과 캐시 어댑터 (LAB-EV-2 DoD "검색어 해시 키 · 후보
 * 10~15개 · TTL 7일").
 *
 * 왜 캐시가 선택이 아니라 필수인가: search.list는 **자체 버킷 하루 100콜**이다
 * (_embed/sourcing/quota 머리말). 48명 소싱이 48콜을 먹으므로 같은 검색어를 두 번
 * 부르면 그날 두 번째 토너먼트가 통째로 막힌다. 그래서 한 번의 검색으로 후보 15개를
 * 통째로 저장하고, 재시도·중복 회피·[새 영상 찾기]는 **콜 없이** 그 목록 안에서 푼다.
 *
 * 문서 id = 검색어 해시(searchCacheKey). 원본 검색어를 함께 저장하는 이유는
 * 해시 충돌 진단 — 64비트 해시라 사실상 안 나지만, 났을 때 알아볼 수 있어야 한다.
 *
 * TTL은 **읽을 때 판정**한다(isCacheFresh). 만료 문서를 지우는 크론을 두지 않는 건
 * 문서 수가 검색어 종류만큼이고(수백), 덮어쓰기로 자연히 갱신되기 때문이다.
 */
import { adminDb } from "./admin";
import { isCacheFresh } from "./_embed/sourcing/searchQuery";
import type { SearchCandidate } from "./_embed/sourcing/types";
import type { CacheWrite } from "./_embed/sourcing/pipeline";

export const VIDEO_SEARCH_CACHE_COLLECTION = "video_search_cache";

/** Firestore가 getAll에 한 번에 받아주는 참조 수(넉넉한 안전선). */
const MAX_GETALL = 100;

function toCandidates(value: unknown): SearchCandidate[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((c) => ({
      videoId: String((c as { videoId?: unknown })?.videoId ?? ""),
      title: String((c as { title?: unknown })?.title ?? ""),
      channelTitle: String((c as { channelTitle?: unknown })?.channelTitle ?? ""),
    }))
    .filter((c) => c.videoId !== "");
}

/** 신선한 항목만 돌려준다 — 만료는 미적중과 똑같이 취급된다(다시 검색). */
export async function readSearchCache(
  keys: string[],
  nowMs: number,
): Promise<Map<string, SearchCandidate[]>> {
  const out = new Map<string, SearchCandidate[]>();
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) return out;

  const col = adminDb.collection(VIDEO_SEARCH_CACHE_COLLECTION);
  for (let i = 0; i < unique.length; i += MAX_GETALL) {
    const slice = unique.slice(i, i + MAX_GETALL);
    const snaps = await adminDb.getAll(...slice.map((k) => col.doc(k)));
    for (const snap of snaps) {
      const data = snap.data();
      if (!data) continue;
      if (!isCacheFresh(Number(data.cachedAt ?? 0), nowMs)) continue;
      const candidates = toCandidates(data.candidates);
      if (candidates.length > 0) out.set(snap.id, candidates);
    }
  }
  return out;
}

/** 검색 결과를 덮어쓴다(같은 검색어면 최신이 이긴다 — 신선도·다양성, §1 결정 ③). */
export async function writeSearchCache(
  entries: CacheWrite[],
  nowMs: number,
): Promise<void> {
  if (entries.length === 0) return;
  const batch = adminDb.batch();
  const col = adminDb.collection(VIDEO_SEARCH_CACHE_COLLECTION);
  for (const entry of entries) {
    batch.set(col.doc(entry.key), {
      query: entry.query,
      candidates: entry.candidates,
      cachedAt: nowMs,
    });
  }
  await batch.commit();
}
