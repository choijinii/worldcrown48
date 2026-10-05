/**
 * sitemapEntries — sitemap.xml 에 들어갈 주소 목록을 만드는 **순수 함수** (SEO-1).
 *
 * 데이터 읽기(Firestore)는 `sitemapData.ts` 가 하고, 이 파일은 "무엇을 넣고 무엇을
 * 빼는가"만 정한다 — 그래야 단위 테스트로 그 규칙을 못 박을 수 있다.
 *
 * ## 넣는 것 (누구나 로그인 없이 볼 수 있는 페이지)
 * - `/` (The Pitch 피드) · `/news` (뉴스룸) · `/policies/{4종}`
 * - 공개 대회: `status === "active"` 인 대회의 `/arena/{id}` 와 `/arena/{id}/ranking`(차트)
 *   — 차트는 D-30(2026-09-23)으로 마감 전·비로그인에도 열린다.
 * - 발행된 기사: `status === "published"` 인 `/news/{slug}`
 *
 * ## 빼는 것
 * - `/admin/**` (운영자 콘솔 — robots.ts 도 막는다) · `/account` (로그인 필요)
 * - `draft`·`ended` 대회 (미발행·마감 정리된 대회 — 2026-09-08 정리 때 draft 로 숨김)
 * - 시험·시드 대회: `hostUid` 가 `seed-` 로 시작 (E2E 의 `seed-operator`,
 *   `seed-chart-preview` 등 — E2E 는 프로덕션과 같은 Firebase 프로젝트에 씨앗을 심는다)
 * - 초안·내린(archived) 기사
 * - `/arena/{id}/champion` — 방문자 **개인의** 크라운 카드 자리라(roundProgress/{uid}_{tid}
 *   를 읽음) 검색 로봇에게는 빈 화면이다. 검색 결과에 넣을 공개 내용이 아니다.
 * - `/launch` — A-0 Launch Pad 보관 경로(홈은 `/`). 같은 사이트의 옛 첫 화면을 검색에
 *   따로 올리지 않는다.
 *
 * ## 언어별 주소 안내 (hreflang · SEO-2, 2026-10-04)
 * 화면 언어는 `?lang=ko|en|es` 가 1순위로 정한다(`lib/resolveBootLang.ts`). 그래서 같은
 * 페이지의 언어판 주소는 `?lang=` 만 다르다. 각 페이지마다
 *   - 기본 주소(`x-default` — 쿼리 없음, 방문자 브라우저 언어를 따름)
 *   - 언어판 주소(`?lang=ko` · `?lang=en` · `?lang=es`)
 * 를 **모두 따로 싣고**, 각 항목에 같은 언어판 묶음(alternates)을 붙인다. 구글 규칙상
 * 언어판끼리 서로를 가리켜야(양방향) 인정되기 때문이다.
 *
 * 페이지마다 실제로 내용이 있는 언어만 싣는다:
 *   - 홈 · 뉴스룸 목록 · 아레나 · 차트: ko · en · es (화면 문구 3언어)
 *   - 정책 4종: ko · en · es (본문 파일 content/ko · content/en · content/es — POLICY-ES-1)
 *   - 기사: 제목이 채워진 언어만 (빈 언어는 다른 언어로 대신 보여 주므로 따로 싣지 않음)
 */
import type { MetadataRoute } from "next";
import { POLICY_TYPES } from "@/lib/policyTypes";

export const SITE_URL = "https://www.worldcrown48.com";

/** 사이트가 지원하는 화면 언어 — `?lang=` 값과 같다. */
export const SITEMAP_LANGS = ["ko", "en", "es"] as const;
export type SitemapLang = (typeof SITEMAP_LANGS)[number];

/** 정책 본문은 content/ko · content/en · content/es 세 벌이다(POLICY-ES-1 · D-42 갱신 2026-10-05). */
export const POLICY_LANGS: readonly SitemapLang[] = ["ko", "en", "es"];

/** 사이트맵 판단에 필요한 대회 필드만 — Firestore 문서에서 그대로 옮겨 담는다. */
export interface SitemapTournament {
  id: string;
  status?: unknown;
  hostUid?: unknown;
  /** 마지막 변경 시각(ms). 없으면 lastModified 를 비운다. */
  updatedAtMs?: number | null;
}

/** 사이트맵 판단에 필요한 기사 필드만. */
export interface SitemapArticle {
  slug: string;
  status?: unknown;
  publishedAtMs?: number | null;
  /** 언어별 제목 — 채워진 언어만 언어판 주소로 싣는다. 없으면 기본 주소만. */
  title?: Partial<Record<SitemapLang, unknown>> | null;
}

/** 시험·시드 데이터의 hostUid 접두어 (seed-operator, seed-chart-preview …). */
const SEED_HOST_PREFIX = "seed-";

/** 어떤 경우에도 사이트맵에 나가면 안 되는 경로 — 마지막 안전망. */
const PRIVATE_PATH_PREFIXES = ["/admin", "/account"] as const;

export function isPublicTournament(t: SitemapTournament): boolean {
  if (!t.id || typeof t.id !== "string") return false;
  if (t.status !== "active") return false;
  if (typeof t.hostUid === "string" && t.hostUid.startsWith(SEED_HOST_PREFIX)) {
    return false;
  }
  return true;
}

export function isPublishedArticle(a: SitemapArticle): boolean {
  return Boolean(a.slug) && typeof a.slug === "string" && a.status === "published";
}

export function isPrivatePath(path: string): boolean {
  return PRIVATE_PATH_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}

function toDate(ms: number | null | undefined): Date | undefined {
  return typeof ms === "number" && Number.isFinite(ms) ? new Date(ms) : undefined;
}

/** 경로 + 언어 → 언어판 주소. `null` 이면 기본 주소(x-default). */
export function langUrl(path: string, lang: SitemapLang | null): string {
  const base = `${SITE_URL}${path}`;
  return lang ? `${base}?lang=${lang}` : base;
}

/** 기사 제목이 채워진 언어 (순서는 SITEMAP_LANGS 기준). */
export function filledLangs(
  text: Partial<Record<SitemapLang, unknown>> | null | undefined,
): SitemapLang[] {
  if (!text) return [];
  return SITEMAP_LANGS.filter((l) => {
    const v = text[l];
    return typeof v === "string" && v.trim().length > 0;
  });
}

type Entry = MetadataRoute.Sitemap[number];
type PageSpec = Omit<Entry, "url" | "alternates"> & {
  path: string;
  langs: readonly SitemapLang[];
};

/**
 * 한 페이지 → 기본 주소 1개 + 언어판 주소 N개. 모두 같은 언어판 묶음을 단다.
 * 언어판이 1개 이하이면 묶음 없이 기본 주소만 싣는다(가리킬 다른 언어가 없음).
 */
function expandPage({ path, langs, ...rest }: PageSpec): MetadataRoute.Sitemap {
  if (langs.length < 2) return [{ url: langUrl(path, null), ...rest }];
  const languages: Record<string, string> = {};
  for (const l of langs) languages[l] = langUrl(path, l);
  languages["x-default"] = langUrl(path, null);
  const alternates = { languages };
  return [null, ...langs].map((l) => ({
    url: langUrl(path, l),
    ...rest,
    alternates,
  }));
}

export function buildSitemapEntries(input: {
  tournaments: SitemapTournament[];
  articles: SitemapArticle[];
}): MetadataRoute.Sitemap {
  const pages: PageSpec[] = [];

  pages.push({ path: "/", langs: SITEMAP_LANGS, changeFrequency: "daily", priority: 1 });
  pages.push({ path: "/news", langs: SITEMAP_LANGS, changeFrequency: "daily", priority: 0.8 });
  for (const t of POLICY_TYPES) {
    pages.push({
      path: `/policies/${t}`,
      langs: POLICY_LANGS,
      changeFrequency: "monthly",
      priority: 0.3,
    });
  }

  for (const t of input.tournaments) {
    if (!isPublicTournament(t)) continue;
    const id = encodeURIComponent(t.id);
    const lastModified = toDate(t.updatedAtMs);
    const lm = lastModified ? { lastModified } : {};
    pages.push({ path: `/arena/${id}`, langs: SITEMAP_LANGS, ...lm, changeFrequency: "daily", priority: 0.9 });
    pages.push({ path: `/arena/${id}/ranking`, langs: SITEMAP_LANGS, ...lm, changeFrequency: "daily", priority: 0.7 });
  }

  for (const a of input.articles) {
    if (!isPublishedArticle(a)) continue;
    const lastModified = toDate(a.publishedAtMs);
    pages.push({
      path: `/news/${encodeURIComponent(a.slug)}`,
      langs: filledLangs(a.title),
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  const entries = pages.flatMap(expandPage);

  // 마지막 안전망 — 중복 제거 + 비공개 경로 차단.
  const seen = new Set<string>();
  return entries.filter((e) => {
    const path = new URL(e.url).pathname;
    if (isPrivatePath(path)) return false;
    if (seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });
}
