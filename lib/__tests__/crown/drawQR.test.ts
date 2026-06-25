import { describe, it, expect } from "vitest";
import { drawQR } from "@/lib/crown/canvas/drawQR";
import { createRecordingCtx } from "./recordingCtx";

/**
 * AC-13 · drawQR — scannable, deterministic QR (wireframe line 1169-1180).
 * Navy modules on a white rounded background, quiet zone = 2 cells. The matrix
 * must be deterministic so the card is visually stable across renders.
 */
const URL = "https://worldcrown48.com";

describe("drawQR", () => {
  it("draws a white rounded background, then navy modules", () => {
    const ctx = createRecordingCtx();
    drawQR(ctx, 10, 20, 100, URL);
    // white background: a fill() with #FFFFFF before any module fillRect
    const whiteFill = ctx.ops("fill").find((c) => c.fillStyle === "#FFFFFF");
    expect(whiteFill, "white rounded background fill").toBeTruthy();
    // modules are navy (#00003A) fillRects
    const modules = ctx.ops("fillRect").filter((c) => c.fillStyle === "#00003A");
    expect(modules.length).toBeGreaterThan(0);
  });

  it("renders the exact dark-module count for the canonical URL (deterministic)", () => {
    const ctx = createRecordingCtx();
    drawQR(ctx, 0, 0, 100, URL);
    const modules = ctx.ops("fillRect").filter((c) => c.fillStyle === "#00003A");
    expect(modules.length).toBe(322); // 25×25 'M'-level matrix for worldcrown48.com
  });

  it("produces byte-identical geometry across two renders (matrix determinism)", () => {
    const a = createRecordingCtx();
    const b = createRecordingCtx();
    drawQR(a, 0, 0, 100, URL);
    drawQR(b, 0, 0, 100, URL);
    const geom = (ctx: ReturnType<typeof createRecordingCtx>) =>
      ctx.ops("fillRect").filter((c) => c.fillStyle === "#00003A").map((c) => c.args);
    expect(geom(a)).toEqual(geom(b));
  });

  it("offsets modules by a 2-cell quiet zone (cell = size / (moduleCount + 4))", () => {
    const ctx = createRecordingCtx();
    const size = 116; // moduleCount 25 → total 29 → cell = 4
    drawQR(ctx, 1000, 500, size, URL);
    const first = ctx.ops("fillRect").filter((c) => c.fillStyle === "#00003A")[0];
    // module (0,0) is dark → x = 1000 + 2*cell, y = 500 + 2*cell, cell=4
    expect(first.args[0]).toBeCloseTo(1000 + 8, 5);
    expect(first.args[1]).toBeCloseTo(500 + 8, 5);
  });

  it("is a no-op safe call (never throws) for an empty string", () => {
    const ctx = createRecordingCtx();
    expect(() => drawQR(ctx, 0, 0, 80, "")).not.toThrow();
  });
});
