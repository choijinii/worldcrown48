/**
 * IMAGE-1 PR 1 (원장 D-77) — 크라운 카드 사진 자리: 그림 엔트리 챔피언은 그 그림을 사진 자리에 그린다.
 * 그림이 없거나 못 그리면 지금처럼 이니셜. 자르기는 cover(가운데 · 위아래는 focusY).
 */
import { describe, expect, it } from "vitest";
import { drawPhotoCover } from "@/lib/crown/canvas/primitives";
import { drawLink } from "@/lib/crown/canvas/drawLink";
import { drawPortrait } from "@/lib/crown/canvas/drawPortrait";
import { createRecordingCtx } from "./recordingCtx";
import type { CrownData } from "@/lib/crown/formats";

const D: CrownData = { initial: "A", name: "Name", title: "T", url: "worldcrown48.com", path: "", campaign: "site" };
const photo = { width: 1600, height: 900 };

describe("drawPhotoCover", () => {
  it("가로 그림 → 정사각 칸: 양옆을 잘라 가운데", () => {
    const ctx = createRecordingCtx();
    expect(drawPhotoCover(ctx, photo, 10, 20, 100, 100, 40)).toBe(true);
    const [call] = ctx.ops("drawImage");
    // 소스 900×900 · 가로 가운데 sx=350 · 세로는 남는 게 없어 0
    expect(call.args.slice(1)).toEqual([350, 0, 900, 900, 10, 20, 100, 100]);
  });
  it("세로 그림 → 가로 칸: 위아래는 focusY 비율로 버린다", () => {
    const ctx = createRecordingCtx();
    drawPhotoCover(ctx, { width: 900, height: 1600 }, 0, 0, 160, 90, 40);
    const [call] = ctx.ops("drawImage");
    const [sx, sy, sw, sh] = call.args.slice(1, 5) as number[];
    expect(sx).toBe(0);
    expect(sw).toBe(900);
    expect(sh).toBeCloseTo(506.25);
    expect(sy).toBeCloseTo((1600 - 506.25) * 0.4);
  });
  it("사진 없음 · 크기 0 → false, 그리지 않음", () => {
    const ctx = createRecordingCtx();
    expect(drawPhotoCover(ctx, null, 0, 0, 10, 10, 40)).toBe(false);
    expect(drawPhotoCover(ctx, { width: 0, height: 0 }, 0, 0, 10, 10, 40)).toBe(false);
    expect(ctx.ops("drawImage")).toHaveLength(0);
  });
});

describe("drawLink · drawPortrait 사진", () => {
  for (const [name, draw, W, H] of [
    ["drawLink", drawLink, 1200, 630],
    ["drawPortrait", drawPortrait, 1080, 1350],
  ] as const) {
    it(`${name}: 사진 있음 → drawImage 1회 · 이니셜 없음`, () => {
      const ctx = createRecordingCtx();
      draw(ctx, W, H, D, null, photo);
      expect(ctx.ops("drawImage")).toHaveLength(1);
      expect(ctx.texts("A")).toHaveLength(0);
    });
    it(`${name}: 사진 없음 → 이니셜(지금 그대로)`, () => {
      const ctx = createRecordingCtx();
      draw(ctx, W, H, D, null);
      expect(ctx.texts("A")).toHaveLength(1);
      expect(ctx.ops("drawImage")).toHaveLength(0);
    });
  }
});
