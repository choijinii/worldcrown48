/**
 * 기존 참가자 루프 구간 보정 계획 (ARENA-1 PR 1 · 원장 D-12 · 대표 판정 2026-09-19).
 *
 * 규칙: end = start + 15. 이미 15초 이상이면 건드리지 않는다. 영상이 없는 문서는 대상 아님.
 * 계획(plan) = 실제로 쓸 내용 — 드라이런 로그가 곧 --apply 결과다.
 */
import { describe, expect, it } from "vitest";
import { LOOP_15_SECONDS, planLoopFix } from "../../../scripts/fix-loop-15.lib.mjs";
import { LOOP_SECONDS } from "@/lib/embed/constants";

const doc = (id: string, embed: Record<string, unknown> | null, name = id) => ({
  id,
  data: {
    name,
    tournamentId: "t1",
    ...(embed ? { media: { type: "embed", embed } } : {}),
  },
});

describe("planLoopFix", () => {
  it("상수는 15 — 앱의 LOOP_SECONDS 와 어긋나지 않는다", () => {
    expect(LOOP_15_SECONDS).toBe(15);
    expect(LOOP_15_SECONDS).toBe(LOOP_SECONDS);
  });

  it("10초 구간 → end = start + 15", () => {
    expect(planLoopFix([doc("a", { videoId: "abcdefghijk", start: 60, end: 70 })])).toEqual([
      { id: "a", name: "a", tournamentId: "t1", start: 60, oldEnd: 70, newEnd: 75 },
    ]);
  });

  it("이미 15초 이상이면 건드리지 않는다", () => {
    expect(planLoopFix([doc("a", { videoId: "abcdefghijk", start: 60, end: 75 })])).toEqual([]);
    expect(planLoopFix([doc("b", { videoId: "abcdefghijk", start: 0, end: 40 })])).toEqual([]);
  });

  it("end 가 없으면 채운다, start 가 없으면 0 부터", () => {
    expect(planLoopFix([doc("a", { videoId: "abcdefghijk", start: 30 })])[0]).toMatchObject({
      oldEnd: null,
      newEnd: 45,
    });
    expect(planLoopFix([doc("b", { videoId: "abcdefghijk" })])[0]).toMatchObject({
      start: 0,
      newEnd: 15,
    });
  });

  it("영상이 없거나 videoId 가 비면 대상 아님", () => {
    expect(planLoopFix([doc("a", null), doc("b", { start: 3, end: 5 })])).toEqual([]);
  });

  it("영상 종류가 embed 가 아니면 대상 아님 (clip 예약 등)", () => {
    const clip = { id: "c", data: { name: "c", media: { type: "clip", embed: { videoId: "x", start: 0, end: 5 } } } };
    expect(planLoopFix([clip])).toEqual([]);
  });

  it("소수 초는 내려서 계산한다", () => {
    expect(planLoopFix([doc("a", { videoId: "abcdefghijk", start: 12.7, end: 20 })])[0]).toMatchObject({
      start: 12,
      newEnd: 27,
    });
  });
});
