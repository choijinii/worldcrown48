import { describe, it, expect } from "vitest";
import { drawPortrait } from "@/lib/crown/canvas/drawPortrait";
import { GOLD, TEXT, SUB } from "@/lib/crown/canvas/primitives";
import { createRecordingCtx } from "./recordingCtx";
import type { CrownData } from "@/lib/crown/formats";

/**
 * AC-11 · drawPortrait (9:16 story + 4:5 feed) coordinate lock.
 *
 * Expected values HARDCODED from the wireframe formulas (Domain 3 · The Arena
 * .html line 1182-1250) for the story format W=1080, H=1920, so a transcription
 * slip cannot hide behind a matching formula. Tolerance ±2px (AC-11). The same
 * renderer drives the 4:5 feed format — exercised in the dimensions-agnostic case.
 */
const D: CrownData = {
  initial: "A",
  name: "M. Adeyemi",
  title: "Strikers of the Century",
  url: "worldcrown48.com",
  path: "48 → 24 → 12 → 6 → THE FINAL",
};

function expectText(ctx: ReturnType<typeof createRecordingCtx>, text: string, x: number, y: number) {
  const hit = ctx.texts(text)[0];
  expect(hit, `fillText("${text}")`).toBeTruthy();
  expect(hit.args[1] as number).toBeCloseTo(x, 1);
  expect(hit.args[2] as number).toBeCloseTo(y, 1);
  return hit;
}

describe("drawPortrait (9:16 story · 1080×1920)", () => {
  const W = 1080;
  const H = 1920;

  it("paints the deep-navy background first across the full canvas", () => {
    const ctx = createRecordingCtx();
    drawPortrait(ctx, W, H, D, null);
    expect(ctx.ops("fillRect")[0].args).toEqual([0, 0, 1080, 1920]);
    expect(ctx.ops("fillRect")[0].fillStyle).toBe("#00003A");
  });

  it("locks the caption block coordinates (CHAMPION / name / title / tagline / url)", () => {
    const ctx = createRecordingCtx();
    drawPortrait(ctx, W, H, D, null);
    // pad=W*0.05=54 ; innerH=H-2*pad=1812 ; ph=innerH*0.95=1721.4 ; py=pad+(innerH-ph)/2=99.3
    // cx=540
    const cx = 540;
    const py = 99.3;
    const ph = 1721.4;
    // CHAMPION at py + ph - ph*0.265
    const champ = expectText(ctx, "CHAMPION", cx, py + ph - ph * 0.265);
    expect(champ.fillStyle).toBe(SUB);
    // name at py + ph - ph*0.195, GOLD
    const name = expectText(ctx, "M. Adeyemi", cx, py + ph - ph * 0.195);
    expect(name.fillStyle).toBe(GOLD);
    // title at py + ph - ph*0.15, TEXT
    const title = expectText(ctx, "Strikers of the Century", cx, py + ph - ph * 0.15);
    expect(title.fillStyle).toBe(TEXT);
    // tagline at py + ph - ph*0.082
    expectText(ctx, "Who is your Crown?", cx, py + ph - ph * 0.082);
    // url at py + ph - ph*0.032
    expectText(ctx, "WorldCrown48.com", cx, py + ph - ph * 0.032);
  });

  it("draws the big champion initial centred in the photo", () => {
    const ctx = createRecordingCtx();
    drawPortrait(ctx, W, H, D, null);
    // initial at (cx, py + ph*0.33) = (540, 99.3 + 568.062) = (540, 667.362)
    expectText(ctx, "A", 540, 667.362);
  });

  // QR 제거(2026-08-31 대표 확정): drawPortrait는 이제 qr 파라미터 자체가 없다 —
  // 타입 시그니처에서 빠졌으므로 컴파일이 이를 보장한다. 별도 런타임 테스트 불필요.

  it("renders the gold crown glyph fallback when no image is supplied", () => {
    const ctx = createRecordingCtx();
    drawPortrait(ctx, W, H, D, null);
    expect(ctx.ops("drawImage")).toHaveLength(0);
    expect(ctx.ops("fill").filter((c) => c.fillStyle === GOLD).length).toBeGreaterThan(0);
  });
});

describe("drawPortrait (4:5 feed · 1080×1350) — same renderer, different ratio", () => {
  it("scales the caption block to the feed height without overflow", () => {
    const ctx = createRecordingCtx();
    const W = 1080;
    const H = 1350;
    drawPortrait(ctx, W, H, D, null);
    // pad=54; innerH=1242; ph=1179.9; py=54+(1242-1179.9)/2=85.05
    const cx = 540;
    const py = 85.05;
    const ph = 1179.9;
    expectText(ctx, "M. Adeyemi", cx, py + ph - ph * 0.195);
    expectText(ctx, "WorldCrown48.com", cx, py + ph - ph * 0.032);
  });

  it("shrinks an overlong name via fit() between min and start sizes", () => {
    const ctx = createRecordingCtx({ charWidthRatio: 0.5 });
    const W = 1080;
    const long = "Maximilian Alexandrovich Adeyemi-Constantine";
    drawPortrait(ctx, W, 1920, { ...D, name: long }, null);
    const hit = ctx.texts(long)[0];
    const px = parseFloat(/(\d+(?:\.\d+)?)px/.exec(hit.font)![1]);
    // start W*0.10=108, min W*0.05=54
    expect(px).toBeGreaterThanOrEqual(54);
    expect(px).toBeLessThanOrEqual(108);
  });
});
