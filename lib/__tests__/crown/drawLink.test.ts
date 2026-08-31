import { describe, it, expect } from "vitest";
import { drawLink } from "@/lib/crown/canvas/drawLink";
import { GOLD, TEXT } from "@/lib/crown/canvas/primitives";
import { createRecordingCtx } from "./recordingCtx";
import type { CrownData } from "@/lib/crown/formats";

/**
 * AC-12 · drawLink (1.91:1 Link card) coordinate lock.
 *
 * Expected values are HARDCODED (computed once from the wireframe formulas for
 * W=1200, H=630 — docs/design/wireframes/Domain 3 · The Arena.html line
 * 1252-1296) rather than re-derived in the test, so a transcription slip in
 * the port cannot hide behind a matching formula. Tolerance: ±2px (AC-12).
 */
const W = 1200;
const H = 630;
const D: CrownData = {
  initial: "A",
  name: "M. Adeyemi",
  title: "Strikers of the Century",
  url: "worldcrown48.com",
  path: "48 → 24 → 12 → 6 → THE FINAL",
  campaign: "site",
};

/** Assert a fillText for `text` landed at (x, y) within ±2px. */
function expectText(ctx: ReturnType<typeof createRecordingCtx>, text: string, x: number, y: number) {
  const hit = ctx.texts(text)[0];
  expect(hit, `fillText("${text}") should exist`).toBeTruthy();
  expect(hit.args[1] as number).toBeCloseTo(x, 1);
  expect(hit.args[2] as number).toBeCloseTo(y, 1);
  return hit;
}

describe("drawLink (1.91:1 OG card)", () => {
  it("paints the deep-navy background first across the full canvas", () => {
    const ctx = createRecordingCtx();
    drawLink(ctx, W, H, D, null);
    const firstFill = ctx.ops("fillRect")[0];
    expect(firstFill.args).toEqual([0, 0, 1200, 630]);
    expect(firstFill.fillStyle).toBe("#00003A"); // BG_DEEP
  });

  it("fills the left photo square (side 524.4 at 52.8,52.8) and the big initial at its centre", () => {
    const ctx = createRecordingCtx();
    drawLink(ctx, W, H, D, null);
    // photo square fillRect: px=52.8, py=52.8, side=524.4 (H-2*pad-2*m, pad=m=26.4)
    const square = ctx.ops("fillRect").find((c) => Math.abs((c.args[2] as number) - 524.4) < 0.01);
    expect(square, "photo square fillRect").toBeTruthy();
    expect(square!.args[0] as number).toBeCloseTo(52.8, 1);
    expect(square!.args[1] as number).toBeCloseTo(52.8, 1);
    // initial at (px+side/2, py+side*0.5) = (315, 315)
    expectText(ctx, "A", 315, 315);
  });

  it("locks the right-column text coordinates (name/title/tagline/url) to ±2px", () => {
    const ctx = createRecordingCtx();
    drawLink(ctx, W, H, D, null);
    // rcx = ((px+side) + (W-pad-m)) / 2 = (577.2 + 1147.2)/2 = 862.2
    const name = expectText(ctx, "M. Adeyemi", 862.2, 378); // rcx, H*0.60
    expect(name.fillStyle).toBe(GOLD);
    const title = expectText(ctx, "Strikers of the Century", 862.2, 431.55); // H*0.685
    expect(title.fillStyle).toBe(TEXT);
    expectText(ctx, "Who is your Crown?", 862.2, 497.7); // H*0.79
    const url = expectText(ctx, "WorldCrown48.com", 862.2, 551.25); // H*0.875
    expect(url.fillStyle).toBe(TEXT);
  });

  // QR 제거(2026-08-31 대표 확정): drawLink는 이제 qr 파라미터 자체가 없다 —
  // 타입 시그니처에서 빠졌으므로 컴파일이 이를 보장한다. 별도 런타임 테스트 불필요.

  it("renders the gold crown glyph fallback when no image is supplied", () => {
    const ctx = createRecordingCtx();
    drawLink(ctx, W, H, D, null);
    // crownHero → crownGlyph fills a path with GOLD (no drawImage)
    expect(ctx.ops("drawImage")).toHaveLength(0);
    const goldFills = ctx.ops("fill").filter((c) => c.fillStyle === GOLD);
    expect(goldFills.length).toBeGreaterThan(0);
  });

  it("shrinks an overlong champion name via fit() (never overflows the column)", () => {
    const ctx = createRecordingCtx({ charWidthRatio: 0.5 });
    const longName = "Maximilian Alexandrovich Adeyemi-Constantine";
    drawLink(ctx, W, H, { ...D, name: longName }, null);
    const hit = ctx.texts(longName)[0];
    // font size chosen by fit must be ≤ start (H*0.13=81.9) and ≥ min (H*0.05=31.5)
    const px = parseFloat(/(\d+(?:\.\d+)?)px/.exec(hit.font)![1]);
    expect(px).toBeGreaterThanOrEqual(31.5);
    expect(px).toBeLessThanOrEqual(81.9);
  });
});
