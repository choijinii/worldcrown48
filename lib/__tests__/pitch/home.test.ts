/**
 * PITCH-2 PR A — 홈 순수 규칙 (지시서 §11.2 PR A 유닛 · 계획 docs/plans/PITCH-2_PR-A.md).
 */
import { describe, expect, it } from "vitest";
import {
  HERO_TOURNAMENT_COUNT,
  TRENDING_PAGE_SIZE,
  chartPicks,
  chartRows,
  heroNews,
  heroSlides,
  promoAssetUrl,
  newsColumns,
  openTournaments,
  pitchHref,
  readPitchParams,
  trendingPage,
  type ChartPickRow,
  type HeroSlide,
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

const BUCKET = "worldcrown48.firebasestorage.app";
const fsUrl = (path: string, origin = "https://firebasestorage.googleapis.com", bucket = BUCKET) =>
  `${origin}/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
const VIDEO = fsUrl("pitch/promo/launch.mp4");
const POSTER = fsUrl("pitch/promo/launch.jpg");
const ids = (s: HeroSlide<{ id: string }>[]) => s.map((x) => (x.kind === "promo" ? "PROMO" : x.tournament.id));

describe("promoAssetUrl — 우리 Storage `pitch/promo/` 아래 공개 주소만 받는다", () => {
  it("영상은 mp4 · 그림은 jpg/png/webp", () => {
    expect(promoAssetUrl(VIDEO, BUCKET, "video")).toBe(VIDEO);
    expect(promoAssetUrl(POSTER, BUCKET, "image")).toBe(POSTER);
    expect(promoAssetUrl(fsUrl("pitch/promo/a.webp"), BUCKET, "image")).not.toBeNull();
    expect(promoAssetUrl(POSTER, BUCKET, "video")).toBeNull();
    expect(promoAssetUrl(VIDEO, BUCKET, "image")).toBeNull();
  });
  it("storage.googleapis.com 모양도 받는다", () => {
    const u = `https://storage.googleapis.com/${BUCKET}/pitch/promo/launch.mp4`;
    expect(promoAssetUrl(u, BUCKET, "video")).toBe(u);
  });
  it("다른 폴더 · 다른 버킷 · 유튜브 · 남의 주소 · http · 빈 값 · 경로 거슬러 오르기는 버린다", () => {
    expect(promoAssetUrl(fsUrl("entry-images/x/launch.mp4"), BUCKET, "video")).toBeNull();
    expect(promoAssetUrl(fsUrl("pitch/promo-old/launch.mp4"), BUCKET, "video")).toBeNull();
    expect(promoAssetUrl(fsUrl("pitch/promo/../../crown-cards/a.mp4"), BUCKET, "video")).toBeNull();
    expect(promoAssetUrl(fsUrl("pitch/promo/launch.mp4", undefined, "other-bucket"), BUCKET, "video")).toBeNull();
    expect(promoAssetUrl("https://www.youtube.com/watch?v=PROMO123456", BUCKET, "video")).toBeNull();
    expect(promoAssetUrl("https://evil.example.com/pitch/promo/launch.mp4", BUCKET, "video")).toBeNull();
    expect(promoAssetUrl(VIDEO.replace("https:", "http:"), BUCKET, "video")).toBeNull();
    expect(promoAssetUrl("", BUCKET, "video")).toBeNull();
    expect(promoAssetUrl(undefined, BUCKET, "video")).toBeNull();
    expect(promoAssetUrl(42, BUCKET, "video")).toBeNull();
    expect(promoAssetUrl(VIDEO, "", "video")).toBeNull();
  });
  it("에뮬레이터 주소(127.0.0.1 · localhost :9199)는 받는다 — 시험용", () => {
    const u = fsUrl("pitch/promo/launch.mp4", "http://127.0.0.1:9199", "demo-wc48.appspot.com");
    expect(promoAssetUrl(u, "demo-wc48.appspot.com", "video")).toBe(u);
    expect(promoAssetUrl(u.replace(":9199", ":8080"), "demo-wc48.appspot.com", "video")).toBeNull();
  });
});

describe("heroSlides — 홍보 영상 1 + 최신 대회 1 + 참여 많은 대회 3 (추가 지시 ② 6절)", () => {
  // createdAtMs 가 클수록 최근 발행. a 가 가장 최근.
  const open = [
    t("a", { createdAtMs: 6 }),
    t("b", { createdAtMs: 5 }),
    t("c", { createdAtMs: 4 }),
    t("d", { createdAtMs: 3 }),
    t("e", { createdAtMs: 2 }),
    t("f", { createdAtMs: 1 }),
  ];
  const promo = { videoUrl: VIDEO, posterUrl: POSTER };
  it("순서 = 홍보 → 최신 1 → 판 수 많은 순 3(캐시 없음 = 0 · 같으면 최신 발행순)", () => {
    const s = heroSlides({ promo, open, runsTotalById: { c: 50, e: 20, b: 20 } });
    expect(s[0]).toEqual({ kind: "promo", videoUrl: VIDEO, posterUrl: POSTER });
    expect(ids(s)).toEqual(["PROMO", "a", "c", "b", "e"]);
    expect(s).toHaveLength(1 + HERO_TOURNAMENT_COUNT);
    expect(HERO_TOURNAMENT_COUNT).toBe(4);
  });
  it("최신 대회는 참여 많은 3장에서 빠지고 다음 순위로 채운다(두 번 안 나옴)", () => {
    const s = heroSlides({ promo, open, runsTotalById: { a: 999, b: 10, c: 9, d: 8 } });
    expect(ids(s)).toEqual(["PROMO", "a", "b", "c", "d"]);
    expect(new Set(ids(s)).size).toBe(s.length);
  });
  it("들어오는 순서와 상관없이 가장 최근 발행이 둘째 장", () => {
    const s = heroSlides({ promo, open: [...open].reverse(), runsTotalById: { f: 5 } });
    expect(ids(s)[1]).toBe("a");
    expect(ids(s)[2]).toBe("f");
  });
  it("그림만 있으면 정지 그림 장 · 영상만 있어도 장은 있다", () => {
    expect(heroSlides({ promo: { videoUrl: null, posterUrl: POSTER }, open: [], runsTotalById: {} })).toEqual([
      { kind: "promo", videoUrl: null, posterUrl: POSTER },
    ]);
    expect(heroSlides({ promo: { videoUrl: VIDEO, posterUrl: null }, open: [], runsTotalById: {} })).toHaveLength(1);
  });
  it("영상 · 그림 둘 다 없으면 첫 장을 건너뛰어 최신 1 + 참여 많은 3 = 4장", () => {
    const s = heroSlides({ promo: { videoUrl: null, posterUrl: null }, open, runsTotalById: {} });
    expect(ids(s)).toEqual(["a", "b", "c", "d"]);
  });
  it("대회 0~5개일 때 장 수", () => {
    for (const n of [0, 1, 2, 3, 4, 5]) {
      expect(heroSlides({ promo, open: open.slice(0, n), runsTotalById: {} })).toHaveLength(1 + Math.min(n, 4));
      expect(heroSlides({ promo: { videoUrl: null, posterUrl: null }, open: open.slice(0, n), runsTotalById: {} })).toHaveLength(Math.min(n, 4));
    }
    expect(ids(heroSlides({ promo, open: open.slice(0, 1), runsTotalById: {} }))).toEqual(["PROMO", "a"]);
  });
  it("마감 지난 대회 · 숨김 대회는 openTournaments 에서 빠져 히어로에 안 온다", () => {
    const list = [t("live", { createdAtMs: 1 }), t("ended", { deadlineMs: NOW - 1, createdAtMs: 9 }), t("hidden", { status: "hidden", createdAtMs: 8 })];
    const s = heroSlides({ promo, open: openTournaments(list, NOW, "production"), runsTotalById: { ended: 99, hidden: 99 } });
    expect(ids(s)).toEqual(["PROMO", "live"]);
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

describe("chartRows — 공개 대회(진행 중 + 마감) × 차트 캐시", () => {
  it("캐시가 있는 공개 대회만 · 마감 대회도 포함 · 숨김 · 시험 대회(실서비스)는 뺀다", () => {
    const tours = [t("open"), t("ended", { deadlineMs: NOW - 1 }), t("hidden", { status: "hidden" }), t("e2e", { e2e: true }), t("nocache")];
    const cache = { runsTotal: 12, generatedAtMs: 5, top: [{ name: "A", avatar: "" }] };
    const rows = chartRows(tours, { open: cache, ended: cache, hidden: cache, e2e: cache }, NOW, "production");
    expect(rows.map((r) => r.id).sort()).toEqual(["ended", "open"]);
    expect(rows[0]).toMatchObject({ runsTotal: 12, generatedAtMs: 5, category: "KPOP" });
  });
});

// 추가 지시 ② 7절(대표 2026-11-19 12:16) — 히어로 장 전체가 하나의 링크 · 휴대폰 밀기 = 장 넘기기.
import { HERO_SWIPE_MIN_PX, HERO_TAP_SLOP_PX, heroSlideHref, heroSwipe } from "@/lib/pitch/home";

describe("heroSlideHref — 장 링크 주소(7절)", () => {
  it("첫 장(홍보 영상) = 같은 탭 /arena", () => {
    expect(heroSlideHref({ kind: "promo", videoUrl: "v", posterUrl: null })).toBe("/arena");
  });
  it("대회 장 = 대기실 /arena?t= (참가하기 버튼이 가던 곳 · D-71)", () => {
    expect(heroSlideHref({ kind: "tournament", tournament: { id: "kp 7" } })).toBe("/arena?t=kp%207");
  });
});

describe("heroSwipe — 미는 동작은 장 넘기기, 가만히 누르면 이동(7절)", () => {
  it("가만히 누름(움직임이 허용 범위 안) = 이동 · 넘기지 않음", () => {
    expect(heroSwipe(0, 0)).toEqual({ step: 0, cancelTap: false });
    expect(heroSwipe(HERO_TAP_SLOP_PX, 3)).toEqual({ step: 0, cancelTap: false });
  });
  it("왼쪽으로 밀면 다음 장 · 오른쪽으로 밀면 앞 장 · 둘 다 이동 안 함", () => {
    expect(heroSwipe(-HERO_SWIPE_MIN_PX, 0)).toEqual({ step: 1, cancelTap: true });
    expect(heroSwipe(HERO_SWIPE_MIN_PX + 20, 5)).toEqual({ step: -1, cancelTap: true });
  });
  it("미는 중에 짧게 떼면(넘길 만큼 안 밀었어도) 이동하지 않는다", () => {
    expect(heroSwipe(HERO_TAP_SLOP_PX + 1, 0)).toEqual({ step: 0, cancelTap: true });
  });
  it("세로로 더 많이 움직이면(화면 내리기) 넘기지 않는다", () => {
    expect(heroSwipe(-HERO_SWIPE_MIN_PX, HERO_SWIPE_MIN_PX * 2)).toEqual({ step: 0, cancelTap: true });
  });
});
