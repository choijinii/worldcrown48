/**
 * ARENA-1 PR 1 — 정사각 창문 크롭 (원장 D-11 · D-14 · D-15).
 *
 *   영상 <iframe> → 영상과 **같은 비율**로 만든 뒤 정사각 창문 + overflow:hidden 으로 자른다.
 *                   (비율이 다르면 유튜브가 스스로 검은 띠를 넣는다 — D-11)
 *   포스터 <img>  → object-fit: cover + object-position.
 *   두 방식의 **잘리는 자리가 같아야** 포스터 → 영상 전환 때 인물이 튀지 않는다 (D-15 ①).
 *
 * 수치는 디자인 파일(Arena_Match_Stage_v1A_9boards) crop() 그대로.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_FOCUS_Y,
  posterCrop,
  posterSources,
  resolveStageMedia,
  videoCrop,
} from "@/lib/media/stageCrop";

describe("videoCrop — 디자인 파일 crop() 그대로", () => {
  it("가로 16:9 → width 177.78% · height 100% · left −38.89% · top 0", () => {
    expect(videoCrop("landscape")).toEqual({
      width: "177.78%",
      height: "100%",
      left: "-38.89%",
      top: "0%",
    });
  });

  it("세로 9:16, focusY 기본 40 → width 100% · height 177.78% · top −31.11%", () => {
    expect(videoCrop("portrait")).toEqual({
      width: "100%",
      height: "177.78%",
      left: "0%",
      top: "-31.11%",
    });
    expect(DEFAULT_FOCUS_Y).toBe(40);
  });

  it("세로 focusY 35 → top −(77.78 × 35 ÷ 100)% = −27.22%", () => {
    expect(videoCrop("portrait", 35).top).toBe("-27.22%");
  });

  it("가로는 focusY를 쓰지 않는다 — 언제나 가운데 56.25%", () => {
    expect(videoCrop("landscape", 10)).toEqual(videoCrop("landscape"));
  });

  it("focusY 는 0~100 으로 자른다 (잘못 저장된 값이 칸 밖을 보여 주지 않게)", () => {
    expect(videoCrop("portrait", -20).top).toBe("0.00%");
    expect(videoCrop("portrait", 180).top).toBe("-77.78%");
  });
});

describe("posterCrop — object-fit cover + object-position", () => {
  it("가로 → center center", () => {
    expect(posterCrop("landscape")).toEqual({ objectFit: "cover", objectPosition: "center 50%" });
  });
  it("세로 → center {focusY}%", () => {
    expect(posterCrop("portrait")).toEqual({ objectFit: "cover", objectPosition: "center 40%" });
    expect(posterCrop("portrait", 35).objectPosition).toBe("center 35%");
  });
});

/**
 * 잘린 양 중 위(또는 왼쪽)로 버려진 비율. object-position y% 는 정의상 이 비율이다
 * (넘치는 양 × y% 만큼 위로 민다). iframe 쪽은 top ÷ 넘치는 양(77.78%)으로 구한다.
 */
function iframeCutFraction(orientation: "landscape" | "portrait", focusY?: number): number {
  const c = videoCrop(orientation, focusY);
  const offset = orientation === "portrait" ? parseFloat(c.top) : parseFloat(c.left);
  return -offset / 77.78;
}
function posterCutFraction(orientation: "landscape" | "portrait", focusY?: number): number {
  const pos = posterCrop(orientation, focusY).objectPosition.split(" ")[1];
  return parseFloat(pos) / 100;
}

describe("포스터와 영상의 잘리는 자리가 같다 (D-15 ①)", () => {
  it.each([
    ["landscape", undefined],
    ["portrait", undefined],
    ["portrait", 35],
    ["portrait", 45],
    ["portrait", 0],
    ["portrait", 100],
  ] as const)("%s focusY=%s", (orientation, focusY) => {
    expect(iframeCutFraction(orientation, focusY)).toBeCloseTo(
      posterCutFraction(orientation, focusY),
      3,
    );
  });

  it("세로 기본값은 위 40 : 아래 60 (D-11: 199 : 299 = 224 : 336)", () => {
    expect(iframeCutFraction("portrait")).toBeCloseTo(0.4, 3);
  });
});

describe("posterSources — 포스터 원본은 영상 비율과 같아야 한다", () => {
  it("세로 숏츠 → oar2(원본 비율 1080×1920), 실패하면 hqdefault", () => {
    expect(posterSources("abcdefghijk", "portrait")).toEqual([
      "https://i.ytimg.com/vi/abcdefghijk/oar2.jpg",
      "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
    ]);
  });
  it("가로 → hq720(16:9, 위아래 검은 띠 없음), 실패하면 hqdefault", () => {
    expect(posterSources("abcdefghijk", "landscape")).toEqual([
      "https://i.ytimg.com/vi/abcdefghijk/hq720.jpg",
      "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
    ]);
  });
});

describe("resolveStageMedia — 참가자 자료 칸 (D-11 · D-12)", () => {
  it("영상 없음 → null (무대는 정지 포스터·이니셜 그대로)", () => {
    expect(resolveStageMedia(undefined)).toBeNull();
    expect(resolveStageMedia({ type: "image" })).toBeNull();
    expect(resolveStageMedia({ type: "embed", embed: { videoId: "bad" } })).toBeNull();
  });

  it("옛 문서(orientation·focusY 없음) → 가로 · 40 · 15초 구간", () => {
    expect(
      resolveStageMedia({ type: "embed", embed: { videoId: "abcdefghijk", start: 60 } }),
    ).toEqual({
      videoId: "abcdefghijk",
      orientation: "landscape",
      focusY: 40,
      startSec: 60,
      endSec: 75,
    });
  });

  it("저장된 start·end·orientation·focusY 를 그대로 쓴다", () => {
    expect(
      resolveStageMedia({
        type: "embed",
        embed: { videoId: "abcdefghijk", start: 42, end: 57, orientation: "portrait", focusY: 35 },
      }),
    ).toEqual({
      videoId: "abcdefghijk",
      orientation: "portrait",
      focusY: 35,
      startSec: 42,
      endSec: 57,
    });
  });

  it("start 가 없으면 0부터 15초", () => {
    expect(
      resolveStageMedia({ type: "embed", embed: { videoId: "abcdefghijk" } }),
    ).toMatchObject({ startSec: 0, endSec: 15 });
  });

  it("알 수 없는 orientation 값은 가로로 읽는다", () => {
    expect(
      resolveStageMedia({
        type: "embed",
        // 손으로 고친 문서에 오타가 있어도 무대가 깨지지 않게.
        embed: { videoId: "abcdefghijk", orientation: "vertical" as never },
      })?.orientation,
    ).toBe("landscape");
  });
});
