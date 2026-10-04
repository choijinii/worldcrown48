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
  {
    slug: "first-story",
    status: "published",
    publishedAtMs: 1_790_000_000_000,
    title: { ko: "첫 기사", en: "First story", es: "" },
  },
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
    for (const path of ["/", "/news", "/policies/cookies", "/policies/community", "/policies/terms", "/policies/privacy"]) {
      expect(u).toContain(`${SITE_URL}${path}`);
    }
  });

  it("모든 주소는 https://www.worldcrown48.com 으로 시작하고 중복이 없다", () => {
    const u = urls();
    expect(u.every((x) => x.startsWith(`${SITE_URL}/`))).toBe(true);
    expect(u.every((x) => !x.includes("&"))).toBe(true);
    expect(new Set(u).size).toBe(u.length);
  });
});

describe("SEO-2 언어별 주소 안내 (hreflang)", () => {
  const entries = buildSitemapEntries({ tournaments: TOURNAMENTS, articles: ARTICLES });
  const byUrl = (url: string) => entries.find((e) => e.url === url);

  it("홈은 기본 주소 + ko·en·es 언어판 주소를 모두 따로 싣는다", () => {
    for (const q of ["", "?lang=ko", "?lang=en", "?lang=es"]) {
      expect(byUrl(`${SITE_URL}/${q}`)).toBeDefined();
    }
  });

  it("언어판 묶음은 ko·en·es + x-default(기본 주소)이고, 모든 언어판이 같은 묶음을 단다(양방향)", () => {
    const expected = {
      ko: `${SITE_URL}/arena/public-active?lang=ko`,
      en: `${SITE_URL}/arena/public-active?lang=en`,
      es: `${SITE_URL}/arena/public-active?lang=es`,
      "x-default": `${SITE_URL}/arena/public-active`,
    };
    for (const url of Object.values(expected)) {
      expect(byUrl(url)?.alternates?.languages).toEqual(expected);
    }
  });

  it("정책은 본문이 있는 ko·en 만 싣는다 (es 없음)", () => {
    const u = entries.map((e) => e.url);
    expect(u).toContain(`${SITE_URL}/policies/terms?lang=ko`);
    expect(u).toContain(`${SITE_URL}/policies/terms?lang=en`);
    expect(u).not.toContain(`${SITE_URL}/policies/terms?lang=es`);
    expect(byUrl(`${SITE_URL}/policies/terms`)?.alternates?.languages).toEqual({
      ko: `${SITE_URL}/policies/terms?lang=ko`,
      en: `${SITE_URL}/policies/terms?lang=en`,
      "x-default": `${SITE_URL}/policies/terms`,
    });
  });

  it("기사는 제목이 채워진 언어만 싣는다 (빈 es 제외)", () => {
    const u = entries.map((e) => e.url);
    expect(u).toContain(`${SITE_URL}/news/first-story?lang=ko`);
    expect(u).toContain(`${SITE_URL}/news/first-story?lang=en`);
    expect(u).not.toContain(`${SITE_URL}/news/first-story?lang=es`);
  });

  it("제목이 한 언어뿐인 기사는 기본 주소만 싣고 언어판 묶음을 달지 않는다", () => {
    const one = buildSitemapEntries({
      tournaments: [],
      articles: [{ slug: "ko-only", status: "published", title: { ko: "한국어만", en: "", es: "" } }],
    }).filter((e) => e.url.includes("/news/ko-only"));
    expect(one).toHaveLength(1);
    expect(one[0].url).toBe(`${SITE_URL}/news/ko-only`);
    expect(one[0].alternates).toBeUndefined();
  });

  it("비공개 대회는 언어판 주소로도 새어 나가지 않는다", () => {
    const joined = entries.map((e) => e.url).join("\n");
    expect(joined).not.toContain("draft-one");
    expect(joined).not.toContain("e2e-seed");
    for (const e of entries) {
      for (const alt of Object.values(e.alternates?.languages ?? {})) {
        expect(String(alt)).not.toContain("/admin");
        expect(String(alt)).not.toContain("draft-one");
      }
    }
  });
});

describe("SEO-1 robots.txt", () => {
  it("Sitemap 줄이 사이트맵 주소를 가리키고, /admin/ 차단은 그대로다", () => {
    const r = robots();
    expect(r.sitemap).toBe("https://www.worldcrown48.com/sitemap.xml");
    expect(r.rules).toMatchObject({ userAgent: "*", allow: "/", disallow: "/admin/" });
  });
});
