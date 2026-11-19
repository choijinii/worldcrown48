/**
 * PITCH-2 PR A — 홈 순수 규칙 (지시서 §11.2 PR A 유닛 · 계획 docs/plans/PITCH-2_PR-A.md).
 */
import { describe, expect, it } from "vitest";
import {
  HERO_TOURNAMENT_COUNT,
  TRENDING_PAGE_SIZE,
  chartPicks,
  heroNews,
  heroSlides,
  newsColumns,
  openTournaments,
  pitchHref,
  readPitchParams,
  trendingPage,
  type ChartPickRow,
  type HomeArticle,
} from "@/lib/pitch/home";

const NOW = Date.UTC(2026, 10, 19, 3, 0, 0); // 2026-11-19 12:00 KST
const TODAY = "2026-11-19";
const DAY = 86_400_000;

const t = (id: string, o: Partial<{ deadlineMs: number | null; createdAtMs: number | null; status: string; e2e: boolean; hostUid: string; category: string }> = {}) => ({
  id,
  title: id,
  status: o.status ?? "active",
  e2e: o.e2e,
  hostUid: o.hostUid ?? "host",
  deadlineMs: o.deadlineMs === undefined ? NOW + DAY : o.deadlineMs,
  createdAtMs: o.createdAtMs === undefined ? NOW - DAY : o.createdAtMs,
  category: o.category ?? "KPOP",
});

describe("openTournaments — 공개 + 마감 전 · 최신 발행순", () => {
  it("마감 지난 대회(조기 마감 포함) · 숨김 · 시드 · 실서비스 시험 대회를 뺀다", () => {
    const list = [
      t("open1", { createdAtMs: NOW - 3 * DAY }),
      t("open2", { createdAtMs: NOW - DAY }),
      t("ended", { deadlineMs: NOW - 1 }),
      t("early", { deadlineMs: NOW }), // 조기 마감 = 마감 시각을 지금으로
      t("hidden", { status: "hidden" }),
      t("seed", { hostUid: "seed-host-1" }),
      t("e2e", { e2e: true }),
      t("nodeadline", { deadlineMs: null, createdAtMs: NOW - 2 * DAY }),
    ];
    expect(openTournaments(list, NOW, "production").map((x) => x.id)).toEqual(["open2", "nodeadline", "open1"]);
  });
  it("미리보기 · 개발에서는 시험 대회(e2e)를 보인다", () => {
    expect(openTournaments([t("e2e", { e2e: true })], NOW, "preview").map((x) => x.id)).toEqual(["e2e"]);
  });
});

describe("heroSlides — 홍보 장 1 + 참여 많은 순 4", () => {
  const open = [t("a", { createdAtMs: 5 }), t("b", { createdAtMs: 4 }), t("c", { createdAtMs: 3 }), t("d", { createdAtMs: 2 }), t("e", { createdAtMs: 1 })];
  it("완주 판 수 많은 순 · 캐시 없음 = 0 → 최신 발행순으로 뒤", () => {
    const s = heroSlides({ promoVideoId: "PROMO123456", open, runsTotalById: { c: 50, e: 20, b: 20 } });
    expect(s[0]).toEqual({ kind: "promo", videoId: "PROMO123456" });
    expect(s.slice(1).map((x) => (x.kind === "tournament" ? x.tournament.id : "?"))).toEqual(["c", "b", "e", "a"]);
    expect(s).toHaveLength(1 + HERO_TOURNAMENT_COUNT);
  });
  it("홍보 영상 id 가 비면 그 장은 건너뛴다(4장)", () => {
    const s = heroSlides({ promoVideoId: "", open, runsTotalById: {} });
    expect(s.every((x) => x.kind === "tournament")).toBe(true);
    expect(s).toHaveLength(4);
  });
  it("대회가 4개 미만이면 있는 만큼 · 0개면 홍보 장만", () => {
    expect(heroSlides({ promoVideoId: "PROMO123456", open: open.slice(0, 2), runsTotalById: {} })).toHaveLength(3);
    expect(heroSlides({ promoVideoId: "PROMO123456", open: [], runsTotalById: {} })).toEqual([{ kind: "promo", videoId: "PROMO123456" }]);
  });
});

describe("Trending 쪽 나누기 · 주소", () => {
  const list = Array.from({ length: 14 }, (_, i) => t(`t${i}`, { category: i % 2 ? "CREATOR" : "KPOP" }));
  it("6장/쪽 · 범위 밖 쪽은 마지막 쪽으로", () => {
    expect(TRENDING_PAGE_SIZE).toBe(6);
    const p1 = trendingPage(list, null, 1);
    expect(p1.items.map((x) => x.id)).toEqual(["t0", "t1", "t2", "t3", "t4", "t5"]);
    expect(p1.pageCount).toBe(3);
    expect(trendingPage(list, null, 9).page).toBe(3);
    expect(trendingPage(list, null, 9).items).toHaveLength(2);
  });
  it("탭은 이 구역만 거른다", () => {
    const k = trendingPage(list, "KPOP", 2);
    expect(k.items.map((x) => x.id)).toEqual(["t12"]);
    expect(k.pageCount).toBe(2);
  });
  it("?cat= · ?page= 읽기 — 모르는 카테고리는 전체 · 숫자 아닌 쪽은 1", () => {
    expect(readPitchParams("?cat=kpop&page=2", ["KPOP", "CREATOR"])).toEqual({ cat: "KPOP", page: 2 });
    expect(readPitchParams("?cat=nope&page=x", ["KPOP"])).toEqual({ cat: null, page: 1 });
    expect(readPitchParams("", ["KPOP"])).toEqual({ cat: null, page: 1 });
  });
  it("주소 쓰기 — 1쪽 · 전체는 주소에서 뺀다 · lang 은 남긴다", () => {
    expect(pitchHref({ cat: "KPOP", page: 2 })).toBe("/?cat=kpop&page=2");
    expect(pitchHref({ cat: null, page: 1 })).toBe("/");
    expect(pitchHref({ cat: "CREATOR", page: 1, lang: "es" })).toBe("/?cat=creator&lang=es");
  });
});

const art = (slug: string, publishedAtMs: number, tournamentId: string | null = null): HomeArticle => ({
  slug,
  title: { ko: slug, en: "", es: "" },
  subhead: { ko: "", en: "", es: "" },
  publishedAtMs,
  tournamentId,
  thumb: null,
});

describe("NEWS ROOM 열 — LATEST · HOT", () => {
  const articles = [art("n1", 10, "tk"), art("n2", 20, "tc"), art("n3", 30, null), art("n4", 40, "tk"), art("n5", 50, "tk")];
  const categoryOf = { tk: "KPOP", tc: "CREATOR" };
  it("LATEST = 최신 3 · HOT = 오늘+어제 조회 많은 순(0·동점 → 최신순)", () => {
    const views = { n1: { total: 99, d20261119: 5 }, n2: { total: 3, d20261118: 5 }, n3: { total: 50, d20261110: 50 } };
    const c = newsColumns(articles, views, categoryOf, null, TODAY);
    expect(c.latest.map((a) => a.slug)).toEqual(["n5", "n4", "n3"]);
    expect(c.hot.map((a) => a.slug)).toEqual(["n2", "n1", "n5"]);
  });
  it("탭 = 연결된 대회의 카테고리 · 연결 없는 기사는 전체 탭에만", () => {
    const c = newsColumns(articles, {}, categoryOf, "KPOP", TODAY);
    expect(c.latest.map((a) => a.slug)).toEqual(["n5", "n4", "n1"]);
    expect(newsColumns(articles, {}, categoryOf, "CREATOR", TODAY).latest.map((a) => a.slug)).toEqual(["n2"]);
  });
});

describe("오른쪽 칸 뉴스 3줄 — 누적 조회 많은 순", () => {
  it("total 많은 순 · 0·동점은 최신순", () => {
    const articles = [art("a", 1), art("b", 2), art("c", 3), art("d", 4)];
    expect(heroNews(articles, { a: { total: 7 }, c: { total: 7 }, b: { total: 1 } }).map((x) => x.slug)).toEqual(["c", "a", "b"]);
    expect(heroNews(articles, {}).map((x) => x.slug)).toEqual(["d", "c", "b"]);
  });
});

const row = (id: string, o: Partial<ChartPickRow> = {}): ChartPickRow => ({
  id,
  title: id,
  titleI18n: null,
  category: o.category ?? "KPOP",
  runsTotal: o.runsTotal ?? 10,
  generatedAtMs: o.generatedAtMs ?? 1,
  top: o.top ?? [{ name: `${id}-1`, avatar: "" }, { name: `${id}-2`, avatar: "" }, { name: `${id}-3`, avatar: "" }],
});

describe("CHARTS · 오른쪽 칸 차트", () => {
  const rows = [
    row("big", { runsTotal: 90, generatedAtMs: 1 }),
    row("r1", { generatedAtMs: 6 }),
    row("r2", { generatedAtMs: 5, category: "CREATOR" }),
    row("r3", { generatedAtMs: 4 }),
    row("r4", { generatedAtMs: 3 }),
    row("r5", { generatedAtMs: 2 }),
    row("waiting", { runsTotal: 9, generatedAtMs: 99 }), // 10판 미만 — 등수를 그리지 않는다
  ];
  it("큰 차트 = 판 수 가장 많은 것 · 2×2 = 그다음 최근 발표 4 · 10판 미만은 뺀다", () => {
    const p = chartPicks(rows, null);
    expect(p.main?.id).toBe("big");
    expect(p.latest.map((r) => r.id)).toEqual(["r1", "r2", "r3", "r4"]);
  });
  it("오른쪽 칸 = 가장 최근 발표 1(탭 무관)", () => {
    expect(chartPicks(rows, null).newest?.id).toBe("r1");
  });
  it("탭으로 거른다 · 없으면 비어 있음", () => {
    const p = chartPicks(rows, "CREATOR");
    expect(p.main?.id).toBe("r2");
    expect(p.latest).toEqual([]);
    expect(chartPicks([], null)).toEqual({ main: null, latest: [], newest: null });
  });
});
