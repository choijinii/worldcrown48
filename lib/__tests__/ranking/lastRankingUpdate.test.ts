/**
 * CHART-HEAD — 발표 시각 알약의 "지난 발표" 부분을 정하는 순수 함수.
 *
 * `ranking_cache.generatedAt` 을 KST로 바꿔 오늘·어제·그 이전(날짜) 중 하나로 말한다.
 * 판정은 시각이 아니라 **KST 날짜**로 한다 — "12시간 안이면 오늘" 같은 시각 기준은
 * 자정 근처에서 틀린 글자를 띄운다(nextRankingUpdate 와 같은 원칙).
 *
 * 시계는 주입한다(함수가 스스로 `Date.now()` 를 읽지 않는다).
 */
import { describe, expect, it } from "vitest";
import { lastRankingUpdate } from "@/lib/ranking/lastRankingUpdate";

/** KST 벽시계 시각 → epoch ms. */
const kst = (iso: string) => Date.parse(`${iso}+09:00`);

describe("lastRankingUpdate — 지난 발표 판정 (CHART-HEAD)", () => {
  it("같은 KST 날짜 → today + HH:MM", () => {
    expect(lastRankingUpdate(kst("2026-09-27T09:00:04"), kst("2026-09-27T14:00:00"))).toEqual({
      day: "today",
      time: "09:00",
      date: "09·27",
    });
  });

  it("새벽에 보면 지난 발표는 어제 21:00 — 매일 나오는 경우", () => {
    expect(lastRankingUpdate(kst("2026-09-26T21:00:02"), kst("2026-09-27T03:10:00"))).toEqual({
      day: "yesterday",
      time: "21:00",
      date: "09·26",
    });
  });

  it("이틀 이상 지났으면 날짜로 (크론 정지 · 시드 대회)", () => {
    expect(lastRankingUpdate(kst("2026-09-24T21:00:00"), kst("2026-09-27T10:00:00"))).toEqual({
      day: "date",
      time: "21:00",
      date: "09·24",
    });
  });

  it("판정은 KST 날짜 기준 — UTC로는 같은 날이어도 KST로 어제면 yesterday", () => {
    // KST 09-26 23:59 = UTC 09-26 14:59 · KST 09-27 00:01 = UTC 09-26 15:01
    expect(lastRankingUpdate(kst("2026-09-26T23:59:00"), kst("2026-09-27T00:01:00")).day).toBe(
      "yesterday",
    );
  });

  it("시드 대회처럼 정각이 아닌 시각도 그대로 (분까지)", () => {
    expect(lastRankingUpdate(kst("2026-09-27T14:32:59"), kst("2026-09-27T15:00:00")).time).toBe(
      "14:32",
    );
  });

  it("월말→월초 경계도 날짜로 판정", () => {
    expect(lastRankingUpdate(kst("2026-09-30T21:00:00"), kst("2026-10-01T08:00:00")).day).toBe(
      "yesterday",
    );
  });

  it("연말→연초 경계", () => {
    expect(lastRankingUpdate(kst("2026-12-31T21:00:00"), kst("2027-01-01T08:00:00")).day).toBe(
      "yesterday",
    );
  });

  it("자정은 00:00 (24:00 이 아니다)", () => {
    expect(lastRankingUpdate(kst("2026-09-27T00:00:00"), kst("2026-09-27T01:00:00")).time).toBe(
      "00:00",
    );
  });

  it("시계가 약간 뒤처져 generatedAt 이 미래여도 today", () => {
    expect(lastRankingUpdate(kst("2026-09-27T09:00:30"), kst("2026-09-27T09:00:00")).day).toBe(
      "today",
    );
  });
});
