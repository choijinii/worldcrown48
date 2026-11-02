/**
 * arenaPicks — 아레나 홈 ⑤ 추천 대회 · 관련 뉴스 3칸의 규칙 (ARENA-2 PR 2 · 원장 D-70 · 킥 §2-5).
 *
 *   · 추천 대회 = 전광판 대회를 뺀 진행 중 대회(탭이 고른 카테고리 안에서). **전광판 대회와 같은
 *     카테고리 먼저, 그다음 최신 발행순**(대회 문서에 발행 시각 칸이 없어 `createdAt` — 전광판
 *     기본값과 같은 기준). 6개씩(휴대폰 4개) 보이고 "더 보기"로 늘어난다. 0개면 구역을 숨긴다.
 *     *정하지 않는 것*: 가중치·개인화(진짜 AI 추천 = MVP 1.5).
 *   · 관련 뉴스 = 공개(published) 기사 중 연결된 대회(`tournamentId`)가 맞는 최신 기사 3개.
 *     ① 카테고리 뉴스 = 고른 탭의 카테고리 대회에 연결된 기사(탭이 "전체"면 공개 기사 전체)
 *     ② 추천 대회 뉴스 = 추천에 뜬 대회들의 기사 ③ 마감 대회 뉴스 = 게시판에 실린 마감 대회들의 기사.
 *     기사 순서 = 발행 최신순(서버가 그 순서로 읽는다).
 *
 * 순수 모듈 — 읽기는 lib/arenaHome/arenaHomeData, 그리기는 components/arenaHome.
 */
import type { Lang, LocalizedText } from "@/lib/news/articleDoc";
import { filterByCategory, type ArenaTournament } from "./arenaHome";

/** 추천 대회가 한 번에 보이는 개수 — 3열 × 2줄(시안 D-1). 휴대폰은 2열 × 2줄. */
export const RECOMMEND_PAGE_SIZE = 6;
export const RECOMMEND_PAGE_SIZE_PHONE = 4;
/** 뉴스 칸 하나에 보이는 기사 수(시안 D-1 목록 3줄). */
export const NEWS_BOX_SIZE = 3;

export function recommendTournaments<T extends ArenaTournament>(
  active: readonly T[],
  board: { id: string; category?: string } | null,
  category: string | null,
): T[] {
  const same = (t: T) => (board?.category && t.category === board.category ? 0 : 1);
  return filterByCategory(active, category)
    .filter((t) => t.id !== board?.id)
    .sort(
      (a, b) =>
        same(a) - same(b) ||
        (b.createdAtMs ?? Number.NEGATIVE_INFINITY) - (a.createdAtMs ?? Number.NEGATIVE_INFINITY) ||
        a.id.localeCompare(b.id),
    );
}

/** 뉴스 칸이 쓰는 기사 한 건 — 서버에서 화면으로 넘기므로 평범한 값만. */
export interface ArenaArticle {
  slug: string;
  title: LocalizedText;
  publishedAtMs: number | null;
  tournamentId: string | null;
  /** 본문 hero 그림(있으면). 없으면 화면이 왕관 자리표시를 그린다. */
  thumb: string | null;
}

/** ① 카테고리 뉴스 — `categoryOf` = 공개 대회 id → 카테고리. 탭이 "전체"(null)면 공개 기사 전체. */
export function categoryNews(
  articles: readonly ArenaArticle[],
  categoryOf: Readonly<Record<string, string>>,
  category: string | null,
  limit = NEWS_BOX_SIZE,
): ArenaArticle[] {
  const hit =
    category === null
      ? articles
      : articles.filter((a) => a.tournamentId !== null && categoryOf[a.tournamentId] === category);
  return hit.slice(0, limit);
}

/** ② · ③ — 주어진 대회들에 연결된 기사. */
export function newsForTournaments(
  articles: readonly ArenaArticle[],
  tournamentIds: Iterable<string>,
  limit = NEWS_BOX_SIZE,
): ArenaArticle[] {
  const ids = new Set(tournamentIds);
  return articles.filter((a) => a.tournamentId !== null && ids.has(a.tournamentId)).slice(0, limit);
}

/** 기사 제목 — 지금 언어, 비었으면 ko → en → es 중 처음 채워진 것. */
export function articleTitle(title: LocalizedText, lang: Lang): string {
  for (const l of [lang, "ko", "en", "es"] as const) {
    const v = title?.[l]?.trim();
    if (v) return v;
  }
  return "";
}

/** 기사 날짜 "10.22" (한국 시간) — 게시판 마감 칸과 같은 이유로 상대 시각을 쓰지 않는다. */
export function formatNewsDate(ms: number | null): string {
  if (ms === null) return "";
  const d = new Date(ms + 9 * 60 * 60 * 1000);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}.${dd}`;
}
