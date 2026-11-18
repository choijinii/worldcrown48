/**
 * 기사 조회 기록 · 급등 계약 (PITCH-2 PR B · D-78 후보).
 *
 * 급등 = 최근 24시간 조회 증가 = KST 오늘 칸 + 어제 칸. 그제 이전은 빠진다.
 * 0건·동점이면 최신 발행순.
 */
import { describe, expect, it } from "vitest";
import {
  bucketsToPrune,
  isValidArticleSlug,
  previousKstDate,
  sortTrending,
  trendScore,
  viewDayKey,
} from "@/lib/news/articleViews";

describe("viewDayKey — KST 날짜 → 기사 문서의 날짜 칸 이름", () => {
  it("YYYY-MM-DD 를 d<YYYYMMDD> 로", () => {
    expect(viewDayKey("2026-11-18")).toBe("d20261118");
  });
});

describe("previousKstDate — 어제(KST 날짜 글자만 다룬다)", () => {
  it("보통 날", () => expect(previousKstDate("2026-11-18")).toBe("2026-11-17"));
  it("달 넘김", () => expect(previousKstDate("2026-12-01")).toBe("2026-11-30"));
  it("해 넘김", () => expect(previousKstDate("2027-01-01")).toBe("2026-12-31"));
  it("윤년 2월", () => expect(previousKstDate("2028-03-01")).toBe("2028-02-29"));
});

describe("trendScore — 오늘 + 어제 칸 합", () => {
  const views = { total: 50, d20261116: 30, d20261117: 4, d20261118: 3 };
  it("KST 자정을 넘긴 직후에도 어제 칸이 들어간다", () => {
    expect(trendScore(views, "2026-11-18")).toBe(7);
  });
  it("그제 칸은 빠진다", () => {
    expect(trendScore(views, "2026-11-19")).toBe(3);
  });
  it("칸이 없거나 views 자체가 없으면 0", () => {
    expect(trendScore({ total: 9 }, "2026-11-18")).toBe(0);
    expect(trendScore(undefined, "2026-11-18")).toBe(0);
  });
  it("숫자가 아닌 값은 0으로 본다", () => {
    expect(trendScore({ d20261118: "x" as unknown as number }, "2026-11-18")).toBe(0);
  });
});

describe("bucketsToPrune — 오늘·어제만 남기고 옛 날짜 칸을 지운다", () => {
  it("total 은 지우지 않는다", () => {
    const views = { total: 9, d20261115: 1, d20261116: 1, d20261117: 1, d20261118: 1 };
    expect(bucketsToPrune(views, "2026-11-18").sort()).toEqual(["d20261115", "d20261116"]);
  });
  it("views 가 없으면 빈 목록", () => {
    expect(bucketsToPrune(undefined, "2026-11-18")).toEqual([]);
  });
});

describe("sortTrending — 급등 순, 0·동점은 최신 발행순", () => {
  const today = "2026-11-18";
  const a = { slug: "a", publishedAtMs: 3000, views: { d20261118: 1 } };
  const b = { slug: "b", publishedAtMs: 2000, views: { d20261117: 5 } };
  const c = { slug: "c", publishedAtMs: 1000, views: { d20261118: 5 } };
  const d = { slug: "d", publishedAtMs: 4000 };
  it("점수 높은 순 · 동점이면 최신 발행 먼저", () => {
    expect(sortTrending([a, b, c, d], today).map((x) => x.slug)).toEqual(["b", "c", "a", "d"]);
  });
  it("모두 0이면 최신 발행순", () => {
    const list = [
      { slug: "old", publishedAtMs: 1 },
      { slug: "new", publishedAtMs: 9 },
      { slug: "mid", publishedAtMs: 5 },
    ];
    expect(sortTrending(list, today).map((x) => x.slug)).toEqual(["new", "mid", "old"]);
  });
  it("받은 배열을 바꾸지 않는다", () => {
    const list = [a, b];
    sortTrending(list, today);
    expect(list.map((x) => x.slug)).toEqual(["a", "b"]);
  });
});

describe("isValidArticleSlug — 콜러블이 받는 기사 주소 이름", () => {
  it("기존 기사 주소 모양(날짜-토큰)", () => {
    expect(isValidArticleSlug("20260722-pub001")).toBe(true);
  });
  it("빈 글자 · 경로 글자 · 너무 긴 글자 · 문자열 아님은 거부", () => {
    expect(isValidArticleSlug("")).toBe(false);
    expect(isValidArticleSlug("a/b")).toBe(false);
    expect(isValidArticleSlug("x".repeat(121))).toBe(false);
    expect(isValidArticleSlug(42)).toBe(false);
  });
});
