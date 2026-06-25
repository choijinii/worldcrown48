import { describe, it, expect } from "vitest";
import { rr, fit, ls, GOLD, G } from "@/lib/crown/canvas/primitives";
import { createRecordingCtx } from "./recordingCtx";

/**
 * C-2 Crown Card · canvas primitives (handoff §3 · wireframe line 1097-1166).
 * Ported verbatim — coordinates/formulas must match the wireframe truth source.
 */
describe("rr (rounded rect path)", () => {
  it("traces moveTo + four arcTo + closePath at the wireframe corners", () => {
    const ctx = createRecordingCtx();
    rr(ctx, 10, 20, 100, 50, 8); // x,y,w,h,r
    const seq = ctx.calls.map((c) => c.op);
    expect(seq).toEqual(["beginPath", "moveTo", "arcTo", "arcTo", "arcTo", "arcTo", "closePath"]);
    // moveTo(x + r, y)
    expect(ctx.ops("moveTo")[0].args).toEqual([18, 20]);
    // first arcTo(x + w, y, x + w, y + h, r)
    expect(ctx.ops("arcTo")[0].args).toEqual([110, 20, 110, 70, 8]);
    // last arcTo(x, y, x + w, y, r)
    expect(ctx.ops("arcTo")[3].args).toEqual([10, 20, 110, 20, 8]);
  });
});

describe("fit (dynamic font sizing)", () => {
  const mk = (s: number) => `${s}px "Inter"`;

  it("returns the start size when the text already fits", () => {
    const ctx = createRecordingCtx({ charWidthRatio: 0.5 });
    // 4 chars × 100px × 0.5 = 200 ≤ max 500 → keep start (100)
    expect(fit(ctx, "WC48", mk, 500, 100, 20)).toBe(100);
  });

  it("steps down by 2 until the measured width fits the max", () => {
    const ctx = createRecordingCtx({ charWidthRatio: 0.5 });
    // 10 chars × s × 0.5 ≤ 250 → s ≤ 50 → first fitting size is 50 (start 100, step -2)
    expect(fit(ctx, "ABCDEFGHIJ", mk, 250, 100, 20)).toBe(50);
  });

  it("never returns below the min size even if nothing fits", () => {
    const ctx = createRecordingCtx({ charWidthRatio: 0.5 });
    expect(fit(ctx, "this is a very long champion name", mk, 1, 100, 16)).toBe(16);
  });
});

describe("ls (letterSpacing, node-canvas tolerant)", () => {
  it("sets letterSpacing when supported", () => {
    const ctx = createRecordingCtx();
    ls(ctx, "2px");
    expect(ctx.letterSpacing).toBe("2px");
  });

  it("swallows the error when the setter throws (handoff §9 trap #7)", () => {
    const ctx = createRecordingCtx({ letterSpacingThrows: true });
    expect(() => ls(ctx, "2px")).not.toThrow();
  });
});

describe("palette", () => {
  it("GOLD is the single Crown Gold token #FCD006 (CLAUDE.md 원칙 #2)", () => {
    expect(GOLD).toBe("#FCD006");
  });
  it("G(a) builds the gold rgba with the given alpha", () => {
    expect(G(0.7)).toBe("rgba(252,208,6,0.7)");
    expect(G(0)).toBe("rgba(252,208,6,0)");
  });
});
