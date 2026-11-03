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
  posterSources,
  resolveStageMedia,
} from "@/lib/media/stageCrop";

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

describe("내려간 영상 — 썸네일 대신 이름 첫 글자 (YT-FIX-1)", () => {
  it("gone 표시가 있으면 무대 재료가 없다", () => {
    expect(
      resolveStageMedia({ type: "embed", embed: { videoId: "9bZkp7q19f0", gone: true } }),
    ).toBeNull();
  });
});
