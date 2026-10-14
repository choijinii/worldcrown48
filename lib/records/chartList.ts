/**
 * chartList — `/records` Charts 대회 목록의 규칙 (NAV-1 G · 프롬프트 §3-C · §0-B 7 · 11).
 *
 * 의도: 팬이 어느 대회의 차트든 찾아가는 문. MVP 1.5에 같은 주소에서 전체 차트 화면으로 바뀐다.
 *
 *   · 집합 = 사이트맵과 같은 공개 대회(`isPublicTournament` — active · 시드 제외).
 *   · **끝난 대회 = 마감 시각(`tournamentDeadline`)이 지금 이전이거나 같은 대회**(대표 정의 10/10).
 *     `status` 로 판단하지 않는다 — `ended` 로 바꾸는 코드가 없다. 마감 시각이 없는 대회는 진행 중.
 *     같은 기준을 마감 뒤 선택 차단(onVote)·차트 집계 창이 이미 쓴다. ARENA-2 의 마감 대회
 *     게시판(D-37)도 이 함수를 재사용한다.
 *   · 정렬: 진행 중 = 마감 가까운 순(마감 없음은 뒤) · 끝난 대회 = 마감 최근 순.
 *     *정하지 않는 것*: D-37 게시판의 정렬·페이지·검색(ARENA-2).
 *   · 챔피언 = 차트가 점수를 보이는 상태(`deriveRankState` = loaded)일 때 Crown Score 1위.
 *     10판 미만이면 차트도 점수를 숨기므로 여기서도 비운다.
 *
 * 순수 모듈 — 읽기는 app/records/page.tsx.
 */
import { isPublicTournament } from "@/lib/seo/sitemapEntries";
import { deriveRankState } from "@/lib/ranking/rankState";
import type { LocalizedText } from "@/lib/types/tournament";

export interface ChartTournament {
  id: string;
  status?: unknown;
  hostUid?: unknown;
  /** `tournamentDeadline` (ms). `null` = 마감 시각 없음. */
  deadlineMs: number | null;
  title: string;
  titleI18n?: Partial<LocalizedText> | null;
  category?: string;
}

export function splitChartTournaments<T extends ChartTournament>(
  tournaments: T[],
  nowMs: number,
): { active: T[]; ended: T[] } {
  const pub = tournaments.filter((t) => isPublicTournament(t));
  const isEnded = (t: T) => t.deadlineMs !== null && t.deadlineMs <= nowMs;
  const active = pub
    .filter((t) => !isEnded(t))
    .sort((a, b) => (a.deadlineMs ?? Number.POSITIVE_INFINITY) - (b.deadlineMs ?? Number.POSITIVE_INFINITY));
  const ended = pub.filter(isEnded).sort((a, b) => (b.deadlineMs as number) - (a.deadlineMs as number));
  return { active, ended };
}

/** 차트 캐시에서 필요한 것만. */
export interface ChampionCache {
  runsTotal?: number;
  rankings?: { name?: string }[];
}

export function championName(cache: ChampionCache | null | undefined): string | null {
  if (deriveRankState(cache) !== "loaded") return null;
  const name = cache?.rankings?.[0]?.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export function chartHref(tournamentId: string): string {
  return `/arena/${encodeURIComponent(tournamentId)}/ranking`;
}

/** 카테고리 칩 글자 — 정본 31 은 모든 언어에서 영어 대문자(K-POP · CREATOR). */
export function categoryChip(
  categoryId: string | undefined,
  categories: readonly { id: string; name: { en: string } }[],
): string | null {
  if (!categoryId) return null;
  const doc = categories.find((c) => c.id === categoryId);
  return (doc?.name.en || categoryId).toUpperCase();
}
