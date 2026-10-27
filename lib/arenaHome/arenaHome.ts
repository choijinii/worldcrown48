/**
 * arenaHome — `/arena` 아레나 홈의 규칙 (ARENA-2 PR 1 · 원장 D-37 · D-45 · D-63 · D-66 · D-71).
 *
 *   · 전광판(= 대기실, D-71) — 주소 `?t=` 가 가리키는 **진행 중** 대회. 없거나 진행 중이 아니면
 *     featured 대회, 그것도 없으면 가장 최근에 만든 진행 중 대회. 마감 대회에는 대기실이 없다(D-37).
 *   · 카테고리 — 주소는 소문자(`?cat=kpop`), 데이터 id 는 대문자(`KPOP`). 탭 하나가 진행 중 목록과
 *     마감 대회 게시판을 함께 거른다(D-63). 탭 = 공개(live) 카테고리 · order 순.
 *   · 게시판 — 순서는 `splitChartTournaments`(마감 최신순, D-45 · D-63)가 정한 그대로. 검색 =
 *     제목 ko·en·es + 챔피언 이름(한글 정본 + 언어별 표기). 10줄/쪽.
 *
 * 진행 중 / 마감 나누기와 공개 대회 거르기(`isPublicTournament`)는 Record Room 의
 * `splitChartTournaments` 를 그대로 쓴다 — 기준이 한 곳이다.
 *
 * 순수 모듈 — 읽기는 lib/arenaHome/arenaHomeData, 그리기는 components/arenaHome.
 */
import { toMs } from "@/lib/news/articleRecord";
import { selectCategories, type CategoryDoc } from "@/lib/taxonomy/category";
import type { ChartTournament } from "@/lib/records/chartList";
import type { NamedLike } from "@/lib/contestantName";
import type { LocalizedText } from "@/lib/types/tournament";
import type { ThumbnailPair } from "@/lib/thumbnail/pair";

/** 마감 대회 게시판 한 쪽의 줄 수 (D-37). */
export const CLOSED_PAGE_SIZE = 10;
/** 진행 중 대회 목록이 한 번에 보이는 줄 수 — "더 보기"로 이만큼씩 늘어난다(시안 D-1). */
export const ACTIVE_PAGE_SIZE = 4;

export interface ArenaTournament extends ChartTournament {
  description: Partial<LocalizedText> | null;
  featured: boolean;
  /** `createdAt`(ms). 전광판 기본값 "가장 최근에 만든"의 기준 — 대회 문서에 발행 시각 칸은 없다. */
  createdAtMs: number | null;
  thumbnailPair?: ThumbnailPair;
}

/**
 * 마감 대회 게시판 한 줄. 챔피언 = 차트 캐시 1위(`chartChampion`).
 * 챔피언이 없는(10판 미만) 대회는 게시판에 오지 않는다(`crownedOnly` · 원장 D-72).
 */
export interface ClosedRow {
  t: ArenaTournament;
  champion: NamedLike;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Firestore 대회 문서 → 화면 값. 서버에서 화면으로 넘기므로 평범한 값만 담는다. */
export function toArenaTournament(id: string, data: Record<string, unknown>): ArenaTournament {
  const out: ArenaTournament = {
    id,
    title: typeof data.title === "string" ? data.title : "",
    titleI18n: isObj(data.titleI18n) ? (data.titleI18n as Partial<LocalizedText>) : null,
    description: isObj(data.description) ? (data.description as Partial<LocalizedText>) : null,
    category: typeof data.category === "string" ? data.category : undefined,
    status: data.status,
    hostUid: data.hostUid,
    e2e: data.e2e,
    featured: data.featured === true,
    createdAtMs: toMs(data.createdAt),
    deadlineMs: toMs(data.tournamentDeadline),
  };
  const p = data.thumbnailPair;
  if (isObj(p) && typeof p.a === "string" && typeof p.b === "string") {
    out.thumbnailPair = {
      a: p.a,
      b: p.b,
      aPos: typeof p.aPos === "number" ? p.aPos : undefined,
      bPos: typeof p.bPos === "number" ? p.bPos : undefined,
    } as ThumbnailPair;
  }
  return out;
}

/** 전광판에 올릴 대회 (D-71). `active` = 이미 공개·진행 중으로 거른 목록. */
export function pickBoardTournament<T extends ArenaTournament>(active: readonly T[], tParam: string | null): T | null {
  if (tParam) {
    const hit = active.find((t) => t.id === tParam);
    if (hit) return hit;
  }
  const featured = active.find((t) => t.featured);
  if (featured) return featured;
  let best: T | null = null;
  for (const t of active) {
    if (!best || (t.createdAtMs ?? Number.NEGATIVE_INFINITY) > (best.createdAtMs ?? Number.NEGATIVE_INFINITY)) best = t;
  }
  return best;
}

/** 주소의 `?cat=` → 카테고리 id. 모르는 값은 null(= 전체). */
export function categoryFromParam(param: string | null | undefined, ids: readonly string[]): string | null {
  if (!param) return null;
  const upper = param.trim().toUpperCase();
  return ids.includes(upper) ? upper : null;
}

/** 카테고리 id → 주소에 적는 값(소문자). */
export function categoryParam(id: string): string {
  return id.toLowerCase();
}

/** 아레나 홈 주소. 피치 카드·서랍·전광판 바꾸기가 모두 이 함수로 만든다. */
export function arenaHomeHref(opts: { t?: string | null; cat?: string | null }): string {
  const parts: string[] = [];
  if (opts.t) parts.push(`t=${encodeURIComponent(opts.t)}`);
  if (opts.cat) parts.push(`cat=${encodeURIComponent(categoryParam(opts.cat))}`);
  return parts.length ? `/arena?${parts.join("&")}` : "/arena";
}

/** 카테고리 탭 — 공개(live)만 · order 순. */
export function tabCategories(cats: readonly CategoryDoc[]): CategoryDoc[] {
  return selectCategories(cats, ["live"]);
}

export function filterByCategory<T extends { category?: string }>(list: readonly T[], category: string | null): T[] {
  return category ? list.filter((x) => x.category === category) : [...list];
}

const norm = (s: string): string => s.normalize("NFC").trim().toLocaleLowerCase();

function texts(v: Partial<LocalizedText> | null | undefined): string[] {
  return v ? [v.ko, v.en, v.es].filter((s): s is string => typeof s === "string") : [];
}

/** 게시판 검색 — 제목 ko·en·es + 챔피언 이름(한글 정본 + 언어별 표기) (D-63). */
export function matchesClosedSearch(row: ClosedRow, query: string): boolean {
  const q = norm(query);
  if (!q) return true;
  const hay = [row.t.title, ...texts(row.t.titleI18n)];
  hay.push(row.champion.name, ...texts(row.champion.nameI18n));
  return hay.some((s) => norm(s).includes(q));
}

export function paginate<T>(items: readonly T[], page: number, per: number): { items: T[]; page: number; pageCount: number } {
  const pageCount = Math.max(1, Math.ceil(items.length / per));
  const p = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  return { items: items.slice((p - 1) * per, p * per), page: p, pageCount };
}

/** 게시판에 보일 것 — 카테고리 → 검색 → 쪽. */
export function closedBoard(
  rows: readonly ClosedRow[],
  opts: { category: string | null; query: string; page: number },
): { rows: ClosedRow[]; total: number; page: number; pageCount: number } {
  const hits = rows.filter((r) => (!opts.category || r.t.category === opts.category) && matchesClosedSearch(r, opts.query));
  const p = paginate(hits, opts.page, CLOSED_PAGE_SIZE);
  return { rows: p.items, total: hits.length, page: p.page, pageCount: p.pageCount };
}

type Lang = "ko" | "en" | "es";
const LOCALE: Record<Lang, string> = { ko: "ko-KR", en: "en-US", es: "es-ES" };

/** 한국 시간 기준 달·일·시·분 (마감 시각은 KST 로 운영한다). */
function kstParts(ms: number, lang: Lang, weekday: boolean): Record<string, string> {
  const parts = new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...(weekday ? { weekday: "short" as const } : {}),
  }).formatToParts(new Date(ms));
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

/** 전광판·진행 중 목록의 마감 — "11.02 (일) 23:59". 요일만 언어를 따른다. */
export function formatDeadline(ms: number | null, lang: Lang): string {
  if (ms === null) return "";
  const p = kstParts(ms, lang, true);
  const wd = (p.weekday ?? "").replace(/\.$/, "");
  return `${p.month}.${p.day} (${wd}) ${p.hour}:${p.minute}`;
}

/** 게시판 마감 칸 — "11.02 23:59". */
export function formatClosedAt(ms: number | null): string {
  if (ms === null) return "";
  const p = kstParts(ms, "en", false);
  return `${p.month}.${p.day} ${p.hour}:${p.minute}`;
}

/** 게시판 쪽 번호 — 최대 `max` 개, 지금 쪽을 가운데에(끝에서는 끝에 붙여서). */
export function pageWindow(page: number, pageCount: number, max = 5): number[] {
  const n = Math.min(max, pageCount);
  const start = Math.min(Math.max(1, page - Math.floor(n / 2)), pageCount - n + 1);
  return Array.from({ length: n }, (_, i) => start + i);
}
