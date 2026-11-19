/**
 * PITCH-2 PR A — The Pitch(홈) 순수 규칙 (지시서 v1.1a 1절 · 0′절 · 추가 지시 ①).
 *
 *   · 진행 중 공개 대회 = `isPublicTournament`(시험 대회 D-66 · 숨김 D-86 제외) + 마감 시각 전(조기 마감 포함)
 *     — `splitChartTournaments` 의 active 를 다시 최신 발행순으로 놓는다(Trending 최신순).
 *   · 히어로 = 홍보 장 1(우리가 만든 영상 파일 · `config/pitch.promoVideoUrl`/`promoPosterUrl` · 둘 다 비면 건너뜀)
 *     + 최신 대회 1 + 완주 판 수 많은 순 3(`ranking_cache.runsTotal` · 캐시 없음 = 0 → 최신 발행순 뒤 ·
 *     최신 대회 중복 없음 · 추가 지시 ② 6절). 판 수는 정렬에만 쓴다(화면에 안 씀).
 *   · NEWS ROOM = LATEST 최신 3 · HOT 급등 3(`sortTrending` — D-78 후보) · 탭 = 연결 대회의 카테고리.
 *     WORLD PRESS 는 `lib/pitch/worldPress.ts` 하나로만 읽는다.
 *   · 오른쪽 칸 뉴스 3줄 = 누적 조회(`news_views.total`) 많은 순 · 0·동점 최신순.
 *   · CHARTS = 점수를 보이는 차트(완주 10판 이상 · 대진 흐름 #8)만 · 큰 차트 = 판 수 가장 많은 것 ·
 *     2×2 = 그다음 최근 발표 4 · 오른쪽 칸 차트 1줄 = 가장 최근 발표(탭 무관).
 *
 * 읽기는 lib/pitch/homeData.ts, 그리기는 components/pitch.
 */
import type { DeployEnv } from "@/lib/deployEnv";
import { splitChartTournaments, type ChartTournament } from "@/lib/records/chartList";
import { categoryFromParam, categoryParam, filterByCategory, paginate } from "@/lib/arenaHome/arenaHome";
import { sortTrending, type ArticleViews } from "@/lib/news/articleViews";
import { MIN_RUNS_FOR_CHART } from "@/lib/ranking/rankState";
import type { LocalizedText } from "@/lib/news/articleDoc";
import type { NamedLike } from "@/lib/contestantName";

export const HERO_TOURNAMENT_COUNT = 4;
export const TRENDING_PAGE_SIZE = 6;
export const NEWS_COLUMN_SIZE = 3;
export const HERO_NEWS_SIZE = 3;
export const LATEST_CHARTS = 4;

type WithCreated = ChartTournament & { createdAtMs: number | null };

const newestFirst = (a: { createdAtMs: number | null }, b: { createdAtMs: number | null }) =>
  (b.createdAtMs ?? Number.NEGATIVE_INFINITY) - (a.createdAtMs ?? Number.NEGATIVE_INFINITY);

/** 진행 중 공개 대회 — 최신 발행순(대회 문서에 발행 시각 칸이 없어 `createdAt`). */
export function openTournaments<T extends WithCreated>(list: readonly T[], nowMs: number, env: DeployEnv): T[] {
  return splitChartTournaments([...list], nowMs, env).active.sort((a, b) => newestFirst(a, b) || a.id.localeCompare(b.id));
}

/** 홍보 장 — 우리가 만든 영상 파일 + 정지 그림(`config/pitch.promoVideoUrl` · `promoPosterUrl` · 추가 지시 ②). */
export interface HeroPromo {
  videoUrl: string | null;
  posterUrl: string | null;
}

export type HeroSlide<T> = { kind: "promo"; videoUrl: string | null; posterUrl: string | null } | { kind: "tournament"; tournament: T };

/** 홍보 장 파일이 있어야 하는 폴더 — storage.rules 도 이 폴더만 공개 읽기 · 관리자 쓰기. */
export const PROMO_STORAGE_DIR = "pitch/promo/";
const PROMO_EXT: Record<"video" | "image", RegExp> = {
  video: /\.mp4$/i,
  image: /\.(jpe?g|png|webp)$/i,
};
const EMULATOR_HOSTS = new Set(["127.0.0.1:9199", "localhost:9199"]);

/**
 * 홍보 장 주소 검사 — 우리 버킷의 `pitch/promo/` 아래 공개 주소만 돌려주고 나머지는 null.
 * 받는 모양: `https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{경로}` ·
 * `https://storage.googleapis.com/{bucket}/{경로}` · 에뮬레이터(`http://127.0.0.1:9199/v0/b/…` — 시험용).
 */
export function promoAssetUrl(raw: unknown, bucket: string, kind: "video" | "image"): string | null {
  if (typeof raw !== "string" || !raw.trim() || !bucket) return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const emulator = u.protocol === "http:" && EMULATOR_HOSTS.has(u.host);
  let path: string | null = null;
  if ((u.protocol === "https:" && u.host === "firebasestorage.googleapis.com") || emulator) {
    const m = /^\/v0\/b\/([^/]+)\/o\/([^/]+)$/.exec(u.pathname);
    if (m && m[1] === bucket) {
      try {
        path = decodeURIComponent(m[2]);
      } catch {
        return null;
      }
    }
  } else if (u.protocol === "https:" && u.host === "storage.googleapis.com") {
    const prefix = `/${bucket}/`;
    if (u.pathname.startsWith(prefix)) path = u.pathname.slice(prefix.length);
  }
  if (!path || !path.startsWith(PROMO_STORAGE_DIR)) return null;
  const rest = path.slice(PROMO_STORAGE_DIR.length);
  if (!rest || rest.split("/").some((seg) => seg === "" || seg === "." || seg === "..")) return null;
  if (!PROMO_EXT[kind].test(rest)) return null;
  return u.toString();
}

/**
 * 히어로 5장 = 홍보 1 → 최신 대회 1 → 참여 많은 대회 3 (추가 지시 ② 6절 · D-81 바뀜 후보).
 * 최신 = 가장 최근 발행(`createdAt`) · 참여 많은 = 완주 판 수(캐시 없음 = 0 · 같으면 최신 발행순) ·
 * 최신으로 뽑힌 대회는 뒤 3장에서 뺀다. 홍보 영상 · 정지 그림이 둘 다 없으면 첫 장을 건너뛴다.
 */
export function heroSlides<T extends WithCreated>(input: {
  promo: HeroPromo;
  open: readonly T[];
  runsTotalById: Readonly<Record<string, number | undefined>>;
}): HeroSlide<T>[] {
  const runs = (t: T) => input.runsTotalById[t.id] ?? 0;
  const byNewest = [...input.open].sort((a, b) => newestFirst(a, b) || a.id.localeCompare(b.id));
  const latest = byNewest[0];
  const popular = byNewest
    .slice(1)
    .sort((a, b) => runs(b) - runs(a) || newestFirst(a, b) || a.id.localeCompare(b.id))
    .slice(0, HERO_TOURNAMENT_COUNT - 1);
  const tours = (latest ? [latest, ...popular] : []).map((tournament) => ({ kind: "tournament" as const, tournament }));
  const { videoUrl, posterUrl } = input.promo;
  return videoUrl || posterUrl ? [{ kind: "promo", videoUrl, posterUrl }, ...tours] : tours;
}

export function trendingPage<T extends { category?: string }>(open: readonly T[], cat: string | null, page: number) {
  return paginate(filterByCategory(open, cat), page, TRENDING_PAGE_SIZE);
}

/** 주소의 `?cat=` · `?page=` — 모르는 카테고리는 전체, 숫자가 아닌 쪽은 1. */
export function readPitchParams(search: string, categoryIds: readonly string[]): { cat: string | null; page: number } {
  const q = new URLSearchParams(search);
  const n = Number.parseInt(q.get("page") ?? "", 10);
  return { cat: categoryFromParam(q.get("cat"), categoryIds), page: Number.isFinite(n) && n >= 1 ? n : 1 };
}

/** 홈 주소 — 전체 탭 · 1쪽은 주소에서 뺀다. 화면 언어(`?lang=`)는 남긴다. */
export function pitchHref(o: { cat: string | null; page: number; lang?: string | null }): string {
  const parts: string[] = [];
  if (o.cat) parts.push(`cat=${encodeURIComponent(categoryParam(o.cat))}`);
  if (o.page > 1) parts.push(`page=${o.page}`);
  if (o.lang) parts.push(`lang=${encodeURIComponent(o.lang)}`);
  return parts.length ? `/?${parts.join("&")}` : "/";
}

/** 홈 뉴스 카드 한 건 — 평범한 값만. */
export interface HomeArticle {
  slug: string;
  title: LocalizedText;
  subhead: LocalizedText;
  publishedAtMs: number | null;
  tournamentId: string | null;
  /** 본문 hero 그림(있으면). */
  thumb: string | null;
}

function byCategory(
  articles: readonly HomeArticle[],
  categoryOf: Readonly<Record<string, string>>,
  cat: string | null,
): HomeArticle[] {
  if (!cat) return [...articles];
  return articles.filter((a) => a.tournamentId !== null && categoryOf[a.tournamentId] === cat);
}

const latestFirst = (a: HomeArticle, b: HomeArticle) => (b.publishedAtMs ?? 0) - (a.publishedAtMs ?? 0);

export function newsColumns(
  articles: readonly HomeArticle[],
  viewsBySlug: Readonly<Record<string, ArticleViews | undefined>>,
  categoryOf: Readonly<Record<string, string>>,
  cat: string | null,
  todayKst: string,
): { latest: HomeArticle[]; hot: HomeArticle[] } {
  const hit = byCategory(articles, categoryOf, cat).sort(latestFirst);
  const withViews = hit.map((a) => ({ ...a, publishedAtMs: a.publishedAtMs, views: viewsBySlug[a.slug] }));
  return {
    latest: hit.slice(0, NEWS_COLUMN_SIZE),
    hot: sortTrending(withViews, todayKst)
      .slice(0, NEWS_COLUMN_SIZE)
      .map(({ views: _views, ...a }) => a),
  };
}

export function heroNews(
  articles: readonly HomeArticle[],
  viewsBySlug: Readonly<Record<string, ArticleViews | undefined>>,
): HomeArticle[] {
  const total = (a: HomeArticle) => viewsBySlug[a.slug]?.total ?? 0;
  return [...articles].sort((a, b) => total(b) - total(a) || latestFirst(a, b)).slice(0, HERO_NEWS_SIZE);
}

/** 차트 한 줄 — 1·2·3…위 이름과 그림 주소(차트 화면 아바타와 같은 `avatarUrl`). */
export interface ChartPickRow {
  id: string;
  title: string;
  titleI18n: Partial<LocalizedText> | null;
  category?: string;
  runsTotal: number;
  generatedAtMs: number;
  top: (NamedLike & { avatar: string })[];
}

export function chartPicks(
  rows: readonly ChartPickRow[],
  cat: string | null,
): { main: ChartPickRow | null; latest: ChartPickRow[]; newest: ChartPickRow | null } {
  const shown = rows.filter((r) => r.runsTotal >= MIN_RUNS_FOR_CHART && r.top.length > 0);
  const recent = (a: ChartPickRow, b: ChartPickRow) => b.generatedAtMs - a.generatedAtMs || a.id.localeCompare(b.id);
  const newest = [...shown].sort(recent)[0] ?? null;
  const inCat = filterByCategory(shown, cat);
  const main = [...inCat].sort((a, b) => b.runsTotal - a.runsTotal || recent(a, b))[0] ?? null;
  const latest = inCat.filter((r) => r !== main).sort(recent).slice(0, LATEST_CHARTS);
  return { main, latest, newest };
}

/** 차트 캐시에서 홈이 쓰는 것 — 판 수 · 발표 시각 · 1·2·3…위(이름 + 그림). */
export interface HomeChartCache {
  runsTotal: number;
  generatedAtMs: number | null;
  top: (NamedLike & { avatar: string })[];
}

/** 공개 대회(진행 중 + 마감) 중 차트 캐시가 있는 것 → CHARTS 줄. 점수를 보이는지(10판)는 chartPicks 가 거른다. */
export function chartRows<T extends ChartTournament>(
  tournaments: readonly T[],
  caches: Readonly<Record<string, HomeChartCache | undefined>>,
  nowMs: number,
  env: DeployEnv,
): ChartPickRow[] {
  const { active, ended } = splitChartTournaments([...tournaments], nowMs, env);
  const out: ChartPickRow[] = [];
  for (const t of [...active, ...ended]) {
    const c = caches[t.id];
    if (!c || c.top.length === 0) continue;
    out.push({
      id: t.id,
      title: t.title,
      titleI18n: t.titleI18n ?? null,
      category: t.category,
      runsTotal: c.runsTotal,
      generatedAtMs: c.generatedAtMs ?? 0,
      top: c.top,
    });
  }
  return out;
}
