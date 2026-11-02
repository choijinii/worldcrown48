/**
 * ARENA-2 PR 2 — 뉴스 칸 · 추천 대회 그리기 (원장 D-70 · 정본 D-1 · D-6).
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SideNews } from "@/components/arenaHome/SideNews";
import { RecommendGrid } from "@/components/arenaHome/RecommendGrid";
import type { ArenaArticle } from "@/lib/arenaHome/arenaPicks";
import type { ArenaTournament } from "@/lib/arenaHome/arenaHome";

const art = (slug: string, over: Partial<ArenaArticle> = {}): ArenaArticle => ({
  slug,
  title: { ko: `기사 ${slug}`, en: `Story ${slug}`, es: "" },
  publishedAtMs: Date.parse("2026-10-22T21:00:00+09:00"),
  tournamentId: null,
  thumb: null,
  ...over,
});

const tour = (id: string): ArenaTournament => ({
  id,
  title: `제목 ${id}`,
  titleI18n: { ko: `제목 ${id}`, en: `Title ${id}`, es: "" },
  description: null,
  category: "KPOP",
  featured: false,
  createdAtMs: null,
  deadlineMs: null,
});

const news = (articles: ArenaArticle[]) =>
  renderToStaticMarkup(
    createElement(SideNews, { titleKey: "arenaHome.news.category", slot: "arena-side-active", testId: "n", articles }),
  );

describe("SideNews", () => {
  it("기사가 있으면 줄 = 기사 링크 · 제목(맨 렌더 = en) · 날짜 · 그림 없으면 왕관 자리표시", () => {
    const html = news([art("a"), art("b", { thumb: "https://img.example/b.jpg" })]);
    expect(html).toContain('href="/news/a"');
    expect(html).toContain('href="/news/b"');
    expect(html).toContain("Story a");
    expect(html).toContain("10.22");
    expect(html).toContain('src="https://img.example/b.jpg"');
    expect(html).not.toContain('data-testid="n-empty"');
    expect(html).toContain('data-banner-slot="arena-side-active"');
  });

  it("기사가 없으면 '뉴스 없음' 모양(정본 D-6) · 광고 칸은 그대로", () => {
    const html = news([]);
    expect(html).toContain('data-testid="n-empty"');
    expect(html).not.toContain('data-testid="n-item"');
    expect(html).toContain('data-banner-slot="arena-side-active"');
  });
});

describe("RecommendGrid", () => {
  const list = Array.from({ length: 8 }, (_, i) => tour(`r${i}`));
  const render = (shown: number) =>
    renderToStaticMarkup(createElement(RecommendGrid, { tournaments: list, shown, onMore: () => {}, categories: [], onShowOnBoard: () => {} }));

  it("제목 '추천 대회'(맨 렌더 = en) · 'AI' · 'PICKED FOR YOU' 없음 (D-70)", () => {
    const html = render(6);
    expect(html).toContain("Recommended Tournaments");
    expect(html).not.toMatch(/\bAI\b|PICKED FOR YOU/);
  });

  it("보이는 수만큼 카드 · 카드의 입장하기 = 매치 무대 · 남으면 더 보기", () => {
    const html = render(6);
    expect(html.match(/data-testid="arena-rec-card"/g)?.length).toBe(6);
    expect(html).toContain('href="/arena/r0"');
    expect(html).toContain('data-testid="arena-rec-more"');
    expect(render(8)).not.toContain('data-testid="arena-rec-more"');
  });
});
