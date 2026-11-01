/**
 * ARENA-2 PR 2 — 추천 대회 · 관련 뉴스 3칸의 규칙 (원장 D-70 · 킥 §2-5).
 */
import { describe, expect, it } from "vitest";
import {
  NEWS_BOX_SIZE,
  RECOMMEND_PAGE_SIZE,
  RECOMMEND_PAGE_SIZE_PHONE,
  articleTitle,
  categoryNews,
  formatNewsDate,
  newsForTournaments,
  recommendTournaments,
  type ArenaArticle,
} from "@/lib/arenaHome/arenaPicks";
import type { ArenaTournament } from "@/lib/arenaHome/arenaHome";

const NOW = Date.parse("2026-10-27T12:00:00+09:00");
const H = 3_600_000;

function t(id: string, over: Partial<ArenaTournament> = {}): ArenaTournament {
  return {
    id,
    status: "active",
    hostUid: "host",
    deadlineMs: NOW + 24 * H,
    title: `제목 ${id}`,
    titleI18n: null,
    category: "KPOP",
    description: null,
    featured: false,
    createdAtMs: NOW - 48 * H,
    ...over,
  };
}

function a(slug: string, tournamentId: string | null, over: Partial<ArenaArticle> = {}): ArenaArticle {
  return { slug, title: { ko: `기사 ${slug}`, en: `Story ${slug}`, es: "" }, publishedAtMs: NOW, tournamentId, thumb: null, ...over };
}

describe("recommendTournaments — 전광판 대회 제외 · 같은 카테고리 먼저 · 최신 발행순 (D-70)", () => {
  const active = [
    t("k-old", { category: "KPOP", createdAtMs: NOW - 10 * H }),
    t("c-new", { category: "CREATOR", createdAtMs: NOW - 1 * H }),
    t("board", { category: "KPOP", createdAtMs: NOW - 5 * H }),
    t("k-new", { category: "KPOP", createdAtMs: NOW - 2 * H }),
    t("c-old", { category: "CREATOR", createdAtMs: NOW - 20 * H }),
    t("k-none", { category: "KPOP", createdAtMs: null }),
  ];
  const board = active[2];

  it("전광판 대회는 빠지고, 같은 카테고리(KPOP)가 먼저 · 그 안에서 최신순 · 만든 시각 없음은 뒤", () => {
    expect(recommendTournaments(active, board, null).map((x) => x.id)).toEqual([
      "k-new",
      "k-old",
      "k-none",
      "c-new",
      "c-old",
    ]);
  });

  it("탭이 고른 카테고리 안에서만", () => {
    expect(recommendTournaments(active, board, "CREATOR").map((x) => x.id)).toEqual(["c-new", "c-old"]);
  });

  it("전광판이 비었으면(진행 중 0) 최신순만", () => {
    expect(recommendTournaments(active, null, null)[0].id).toBe("c-new");
  });

  it("전광판 대회 하나뿐이면 0개 — 화면은 구역을 숨긴다", () => {
    expect(recommendTournaments([board], board, null)).toEqual([]);
  });

  it("받은 배열은 건드리지 않는다", () => {
    const before = active.map((x) => x.id);
    recommendTournaments(active, board, null);
    expect(active.map((x) => x.id)).toEqual(before);
  });

  it("상수 — 6개씩(3열 × 2줄) · 휴대폰 4개 · 뉴스 칸 3건", () => {
    expect(RECOMMEND_PAGE_SIZE).toBe(6);
    expect(RECOMMEND_PAGE_SIZE_PHONE).toBe(4);
    expect(NEWS_BOX_SIZE).toBe(3);
  });
});

describe("categoryNews — ① 카테고리 뉴스", () => {
  const categoryOf = { k1: "KPOP", k2: "KPOP", c1: "CREATOR" };
  const articles = [a("1", "k1"), a("2", null), a("3", "c1"), a("4", "k2"), a("5", "gone"), a("6", "k1")];

  it("탭 '전체' = 공개 기사 전체 · 최신 3건(받은 순서)", () => {
    expect(categoryNews(articles, categoryOf, null).map((x) => x.slug)).toEqual(["1", "2", "3"]);
  });

  it("탭이 고른 카테고리의 대회에 연결된 기사만 · 연결 없음·모르는 대회는 빠짐", () => {
    expect(categoryNews(articles, categoryOf, "KPOP").map((x) => x.slug)).toEqual(["1", "4", "6"]);
    expect(categoryNews(articles, categoryOf, "CREATOR").map((x) => x.slug)).toEqual(["3"]);
  });

  it("맞는 기사가 없으면 빈 목록(화면은 '뉴스 없음' 모양)", () => {
    expect(categoryNews(articles, categoryOf, "KDRAMA")).toEqual([]);
  });
});

describe("newsForTournaments — ② 추천 대회 뉴스 · ③ 마감 대회 뉴스", () => {
  const articles = [a("1", "x"), a("2", "y"), a("3", null), a("4", "x"), a("5", "x"), a("6", "x")];

  it("주어진 대회들의 기사만 · 최신 3건", () => {
    expect(newsForTournaments(articles, ["x"]).map((x) => x.slug)).toEqual(["1", "4", "5"]);
    expect(newsForTournaments(articles, new Set(["y"])).map((x) => x.slug)).toEqual(["2"]);
  });

  it("대회가 없으면 빈 목록", () => {
    expect(newsForTournaments(articles, [])).toEqual([]);
  });
});

describe("articleTitle · formatNewsDate", () => {
  it("지금 언어 → 비었으면 ko → en → es", () => {
    expect(articleTitle({ ko: "한", en: "En", es: "" }, "es")).toBe("한");
    expect(articleTitle({ ko: "", en: "En", es: "" }, "ko")).toBe("En");
    expect(articleTitle({ ko: "한", en: "En", es: "Es" }, "en")).toBe("En");
  });

  it("날짜 = 한국 시간 MM.DD", () => {
    expect(formatNewsDate(Date.parse("2026-10-22T23:30:00+09:00"))).toBe("10.22");
    expect(formatNewsDate(Date.parse("2026-10-22T15:30:00Z"))).toBe("10.23"); // 한국은 이미 다음 날
    expect(formatNewsDate(null)).toBe("");
  });
});
