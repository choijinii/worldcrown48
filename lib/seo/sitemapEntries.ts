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
 * 언어(ko/en/es)는 `?lang=` 쿼리로 나뉘지만 이번에는 언어별 주소(hreflang)를 넣지 않는다
 * — 기본 주소 하나만 싣는다 (SEO-1 범위 밖, 보고서에 제안만).
 */
import type { MetadataRoute } from "next";
import { POLICY_TYPES } from "@/lib/policyTypes";

export const SITE_URL = "https://www.worldcrown48.com";

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

/** 공개 고정 페이지 — 데이터와 무관하게 늘 들어간다. */
export const STATIC_PUBLIC_PATHS: readonly string[] = [
  "/",
  "/news",
  ...POLICY_TYPES.map((t) => `/policies/${t}`),
];

function toDate(ms: number | null | undefined): Date | undefined {
  return typeof ms === "number" && Number.isFinite(ms) ? new Date(ms) : undefined;
}

export function buildSitemapEntries(input: {
  tournaments: SitemapTournament[];
  articles: SitemapArticle[];
}): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const path of STATIC_PUBLIC_PATHS) {
    entries.push({
      url: `${SITE_URL}${path}`,
      changeFrequency: path === "/" || path === "/news" ? "daily" : "monthly",
      priority: path === "/" ? 1 : path === "/news" ? 0.8 : 0.3,
    });
  }

  for (const t of input.tournaments) {
    if (!isPublicTournament(t)) continue;
    const id = encodeURIComponent(t.id);
    const lastModified = toDate(t.updatedAtMs);
    entries.push({
      url: `${SITE_URL}/arena/${id}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "daily",
      priority: 0.9,
    });
    entries.push({
      url: `${SITE_URL}/arena/${id}/ranking`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "daily",
      priority: 0.7,
    });
  }

  for (const a of input.articles) {
    if (!isPublishedArticle(a)) continue;
    const lastModified = toDate(a.publishedAtMs);
    entries.push({
      url: `${SITE_URL}/news/${encodeURIComponent(a.slug)}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  // 마지막 안전망 — 중복 제거 + 비공개 경로 차단.
  const seen = new Set<string>();
  return entries.filter((e) => {
    const path = e.url.slice(SITE_URL.length) || "/";
    if (isPrivatePath(path)) return false;
    if (seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });
}
