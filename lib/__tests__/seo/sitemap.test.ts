/**
 * SEO-1 — sitemap.xml 에 공개 페이지만 들어가는지 못 박는다.
 *
 * 핵심 두 가지(인계 완료 기준): ① 비공개 대회(draft·ended·시드)가 들어가지 않는다
 * ② /admin 이 들어가지 않는다. robots.txt 의 Sitemap 줄도 함께 확인한다.
 */
import { describe, expect, it } from "vitest";
import {
  SITE_URL,
  buildSitemapEntries,
  isPrivatePath,
  isPublicTournament,
  type SitemapArticle,
  type SitemapTournament,
} from "@/lib/seo/sitemapEntries";
import robots from "@/app/robots";

const TOURNAMENTS: SitemapTournament[] = [
  { id: "public-active", status: "active", hostUid: "operator-uid", updatedAtMs: 1_790_000_000_000 },
  { id: "draft-one", status: "draft", hostUid: "operator-uid" },
  { id: "ended-one", status: "ended", hostUid: "operator-uid" },
  { id: "e2e-seed", status: "active", hostUid: "seed-operator" },
  { id: "chart-preview-eyecheck", status: "active", hostUid: "seed-chart-preview" },
];

const ARTICLES: SitemapArticle[] = [
  { slug: "first-story", status: "published", publishedAtMs: 1_790_000_000_000 },
  { slug: "draft-story", status: "draft" },
  { slug: "pulled-story", status: "archived" },
];

function urls(): string[] {
  return buildSitemapEntries({ tournaments: TOURNAMENTS, articles: ARTICLES }).map((e) => e.url);
}

describe("SEO-1 sitemap — 공개 페이지만", () => {
  it("공개(active) 대회의 아레나·차트 주소를 싣는다", () => {
    const u = urls();
    expect(u).toContain(`${SITE_URL}/arena/public-active`);
    expect(u).toContain(`${SITE_URL}/arena/public-active/ranking`);
  });

  it("비공개 대회(draft·ended)는 싣지 않는다", () => {
    const joined = urls().join("\n");
    expect(joined).not.toContain("draft-one");
    expect(joined).not.toContain("ended-one");
  });

  it("시험·시드 대회(hostUid seed-*)는 active 여도 싣지 않는다", () => {
    const joined = urls().join("\n");
    expect(joined).not.toContain("e2e-seed");
    expect(joined).not.toContain("chart-preview-eyecheck");
    expect(isPublicTournament({ id: "x", status: "active", hostUid: "seed-operator" })).toBe(false);
  });

  it("/admin 과 /account 는 어떤 경우에도 싣지 않는다", () => {
    for (const url of urls()) {
      const path = url.slice(SITE_URL.length) || "/";
      expect(path.startsWith("/admin")).toBe(false);
      expect(path.startsWith("/account")).toBe(false);
    }
    expect(isPrivatePath("/admin")).toBe(true);
    expect(isPrivatePath("/admin/lab")).toBe(true);
    expect(isPrivatePath("/account")).toBe(true);
    expect(isPrivatePath("/arena/x")).toBe(false);
  });

  it("개인 크라운 카드 자리(/champion)와 보관 경로(/launch)는 싣지 않는다", () => {
    const joined = urls().join("\n");
    expect(joined).not.toContain("/champion");
    expect(joined).not.toContain("/launch");
  });

  it("발행된 기사만 싣는다 (초안·내린 기사 제외)", () => {
    const u = urls();
    expect(u).toContain(`${SITE_URL}/news/first-story`);
    expect(u.join("\n")).not.toContain("draft-story");
    expect(u.join("\n")).not.toContain("pulled-story");
  });

  it("고정 공개 페이지(홈·뉴스·정책 4종)는 데이터가 없어도 싣는다", () => {
    const u = buildSitemapEntries({ tournaments: [], articles: [] }).map((e) => e.url);
    expect(u).toEqual([
      `${SITE_URL}/`,
      `${SITE_URL}/news`,
      `${SITE_URL}/policies/cookies`,
      `${SITE_URL}/policies/community`,
      `${SITE_URL}/policies/terms`,
      `${SITE_URL}/policies/privacy`,
    ]);
  });

  it("모든 주소는 https://www.worldcrown48.com 으로 시작하고 중복이 없다", () => {
    const u = urls();
    expect(u.every((x) => x.startsWith(`${SITE_URL}/`))).toBe(true);
    expect(new Set(u).size).toBe(u.length);
  });
});

describe("SEO-1 robots.txt", () => {
  it("Sitemap 줄이 사이트맵 주소를 가리키고, /admin/ 차단은 그대로다", () => {
    const r = robots();
    expect(r.sitemap).toBe("https://www.worldcrown48.com/sitemap.xml");
    expect(r.rules).toMatchObject({ userAgent: "*", allow: "/", disallow: "/admin/" });
  });
});
