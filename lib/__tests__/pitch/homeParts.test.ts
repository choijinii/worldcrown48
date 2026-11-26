/**
 * PITCH-2 PR A · 추가 지시 ① 4절 — 부품 단위 시험.
 *   · TIOZ 카드: 견본 1건(이 파일 안에만) → 금색 "TIOZ" + 같은 탭 `/news/{slug}`
 *   · WORLD PRESS 열이 빈 목록이면 "기사 없음" 모양(6절 3 · 4번)
 *   · TIOZ.AI 띠(TIOZ-BAND-ON · 대표 2026-11-24): 런칭 뒤 = "TIOZ.AI" 글자만(링크 · OPEN 없음) · 런칭 전 = 없음 ·
 *     홈 조립에서 히어로 다음 · Trending 앞
 *   · 공용 바닥 띠 = 5항목(개인정보처리방침 맨 앞 · 커뮤니티 가이드) + © 줄 (0′절 7)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NewsCard } from "@/components/pitch/homeParts";
import { NewsRoomSection, TiozBand } from "@/components/pitch/HomeSections";
import type { HomeArticle } from "@/lib/pitch/home";

const SAMPLE: HomeArticle = {
  slug: "20261119-tioz01",
  title: { ko: "견본 기사", en: "Sample", es: "Muestra" },
  subhead: { ko: "요약 한 줄", en: "", es: "" },
  publishedAtMs: Date.UTC(2026, 10, 19),
  tournamentId: null,
  thumb: null,
};

describe("TIOZ 카드(WORLD PRESS)", () => {
  it("금색 작은 글자 TIOZ + 같은 탭에서 /news/{slug}", () => {
    const html = renderToStaticMarkup(createElement(NewsCard, { article: SAMPLE, media: "TIOZ", testId: "x" }));
    expect(html).toContain('<span class="news-card-media">TIOZ</span>');
    expect(html).toContain('href="/news/20261119-tioz01"');
    expect(html).not.toContain("target=");
    expect(html).toContain("Sample"); // 서버 렌더 기본 언어 = en
    expect(html).toContain("요약 한 줄");
  });
});

describe("WORLD PRESS 열 — 빈 목록", () => {
  it("LATEST 가 있어도 WORLD PRESS 칸은 기사 없음 모양(6절 3 · 4번)", () => {
    const html = renderToStaticMarkup(
      createElement(NewsRoomSection, {
        categories: [],
        cat: null,
        onCat: () => undefined,
        hrefFor: () => "/",
        latest: [SAMPLE],
        hot: [SAMPLE],
        press: [],
      }),
    );
    expect(html).toContain("WORLD PRESS");
    expect(html).toContain('data-testid="pitch-news-col-press-empty"');
    expect(html).toContain("NO ARTICLES");
    expect(html).not.toContain(">TIOZ<");
  });
});

describe("TIOZ.AI 띠", () => {
  it("런칭 뒤 = 그림 띠(v1.1 · 대표 2026-11-26) — picture 에 폰 · PC 두 주소 · 대체 글 · 링크(a) 없음 · OPEN 글자 없음", () => {
    const html = renderToStaticMarkup(createElement(TiozBand, { prelaunch: false }));
    expect(html).toContain('data-testid="pitch-tioz-band"');
    expect(html).toContain("<picture");
    expect(html).toMatch(/<source[^>]*media="\(max-width: 480px\)"[^>]*srcSet="\/pitch\/tioz\/tioz-band-mobile@2x\.webp"/);
    expect(html).toContain('src="/pitch/tioz/tioz-band-desktop@2x.png"');
    expect(html).toContain("/pitch/tioz/tioz-band-mobile@2x.png");
    expect(html).toContain("/pitch/tioz/tioz-band-desktop@2x.webp");
    expect(html).toContain('alt="TIOZ.AI — Truth In Opinion Zeitgeist"');
    expect(html).not.toMatch(/<a[\s>]/);
    expect(html).not.toContain("href");
    expect(html).not.toContain("OPEN");
  });

  it("런칭 전(커튼) = 아무것도 그리지 않는다", () => {
    expect(renderToStaticMarkup(createElement(TiozBand, { prelaunch: true }))).toBe("");
  });

  it("홈 조립: 히어로(오른쪽 칸 포함) 바로 다음 · Trending 앞", () => {
    const src = readFileSync(path.join(process.cwd(), "components/pitch/PitchPage.tsx"), "utf8");
    const hero = src.indexOf("<HeroSide ");
    const heroRowEnd = src.indexOf("</div>", hero);
    const band = src.indexOf("<TiozBand prelaunch={prelaunch} />");
    const trending = src.indexOf("<TrendingSection");
    expect(hero).toBeGreaterThan(0);
    expect(band).toBeGreaterThan(heroRowEnd);
    expect(src.slice(heroRowEnd + "</div>".length, band).trim()).toBe("");
    expect(src.slice(band + "<TiozBand prelaunch={prelaunch} />".length, trending).trim()).toBe("");
  });

  it("커서는 손 모양이 아니다(누를 곳이 아님)", () => {
    const css = readFileSync(path.join(process.cwd(), "components/pitch/pitch.css"), "utf8");
    const rules = css.match(/\.tioz-(band|word|img)[^{]*\{[^}]*\}/g) ?? [];
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) expect(r).not.toContain("pointer");
  });
});

describe("공용 바닥 띠(D-80 후보)", () => {
  const src = readFileSync(path.join(process.cwd(), "components/policy/FooterPolicyRow.tsx"), "utf8");
  it("누르는 항목 5개 순서 — 개인정보처리방침 · 이용약관 · 커뮤니티 가이드 · 콘텐츠 신고 · 쿠키 설정", () => {
    const order = ["footer.privacy", "nav.sub.terms", "nav.sub.community", "footer.report", "footer.cookies"].map((k) =>
      src.indexOf(`t("${k}")`),
    );
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(src).toContain('policyLinkHref("/policies/community", lang)');
  });
  it("© 2026 WorldCrown48 줄", () => {
    expect(src).toContain("© 2026 WorldCrown48");
  });
});
