/**
 * Recording fake Canvas2D context for node-env vitest.
 *
 * The repo has no jsdom / node-canvas, and the canvas renderers are isomorphic
 * pure functions over a structural `Canvas2D` (lib/crown/canvas/primitives.ts).
 * This recorder implements that surface, logs every draw call with a snapshot
 * of the drawing state at call time, and models `measureText` deterministically
 * so `fit()` (dynamic font sizing) is fully testable without a real canvas.
 *
 * NOT a *.test.ts file → vitest does not collect it as a suite.
 */
import type { Canvas2D, CanvasGradientLike } from "@/lib/crown/canvas/primitives";

export interface RecordedCall {
  op: string;
  args: unknown[];
  /** Snapshot of style state when the call was made. */
  fillStyle: string | CanvasGradientLike;
  strokeStyle: string | CanvasGradientLike;
  lineWidth: number;
  font: string;
  textAlign: string;
  textBaseline: string;
  shadowBlur: number;
  letterSpacing: string;
}

export interface RecordingCtx extends Canvas2D {
  calls: RecordedCall[];
  /** All calls of a given op, in order. */
  ops(op: string): RecordedCall[];
  /** fillText calls whose text === the given string. */
  texts(text: string): RecordedCall[];
}

/** Extract the px size from a CSS font shorthand, e.g. '900 italic 120px "X"' → 120. */
function fontPx(font: string): number {
  const m = /(\d+(?:\.\d+)?)px/.exec(font);
  return m ? parseFloat(m[1]) : 10;
}

export interface RecordingCtxOptions {
  /** If true, the letterSpacing setter throws (models node-canvas). `ls()` must swallow it. */
  letterSpacingThrows?: boolean;
  /** Width-per-character multiplier of the font px size (deterministic measureText). */
  charWidthRatio?: number;
}

export function createRecordingCtx(opts: RecordingCtxOptions = {}): RecordingCtx {
  const charWidthRatio = opts.charWidthRatio ?? 0.5;
  const calls: RecordedCall[] = [];

  const state = {
    fillStyle: "#000000" as string | CanvasGradientLike,
    strokeStyle: "#000000" as string | CanvasGradientLike,
    lineWidth: 1,
    font: "10px sans-serif",
    textAlign: "start",
    textBaseline: "alphabetic",
    shadowColor: "rgba(0,0,0,0)",
    shadowBlur: 0,
    globalAlpha: 1,
    letterSpacing: "0px",
  };

  function rec(op: string, ...args: unknown[]): void {
    calls.push({
      op,
      args,
      fillStyle: state.fillStyle,
      strokeStyle: state.strokeStyle,
      lineWidth: state.lineWidth,
      font: state.font,
      textAlign: state.textAlign,
      textBaseline: state.textBaseline,
      shadowBlur: state.shadowBlur,
      letterSpacing: state.letterSpacing,
    });
  }

  function gradient(kind: string): CanvasGradientLike {
    rec(kind);
    return { addColorStop: (offset: number, color: string) => rec("addColorStop", offset, color) };
  }

  const ctx: RecordingCtx = {
    calls,
    ops: (op) => calls.filter((c) => c.op === op),
    texts: (text) => calls.filter((c) => c.op === "fillText" && c.args[0] === text),

    get fillStyle() { return state.fillStyle; },
    set fillStyle(v) { state.fillStyle = v; },
    get strokeStyle() { return state.strokeStyle; },
    set strokeStyle(v) { state.strokeStyle = v; },
    get lineWidth() { return state.lineWidth; },
    set lineWidth(v) { state.lineWidth = v; },
    get font() { return state.font; },
    set font(v) { state.font = v; },
    get textAlign() { return state.textAlign; },
    set textAlign(v) { state.textAlign = v; },
    get textBaseline() { return state.textBaseline; },
    set textBaseline(v) { state.textBaseline = v; },
    get shadowColor() { return state.shadowColor; },
    set shadowColor(v) { state.shadowColor = v; },
    get shadowBlur() { return state.shadowBlur; },
    set shadowBlur(v) { state.shadowBlur = v; },
    get globalAlpha() { return state.globalAlpha; },
    set globalAlpha(v) { state.globalAlpha = v; },
    get letterSpacing() { return state.letterSpacing; },
    set letterSpacing(v) {
      if (opts.letterSpacingThrows) throw new Error("letterSpacing unsupported");
      state.letterSpacing = v;
    },

    save: () => rec("save"),
    restore: () => rec("restore"),
    beginPath: () => rec("beginPath"),
    closePath: () => rec("closePath"),
    moveTo: (x, y) => rec("moveTo", x, y),
    lineTo: (x, y) => rec("lineTo", x, y),
    arcTo: (x1, y1, x2, y2, r) => rec("arcTo", x1, y1, x2, y2, r),
    rect: (x, y, w, h) => rec("rect", x, y, w, h),
    fill: () => rec("fill"),
    stroke: () => rec("stroke"),
    clip: () => rec("clip"),
    fillRect: (x, y, w, h) => rec("fillRect", x, y, w, h),
    fillText: (t, x, y) => rec("fillText", t, x, y),
    drawImage: (...a: unknown[]) => rec("drawImage", ...a),
    measureText: (t: string) => {
      rec("measureText", t);
      return { width: t.length * fontPx(state.font) * charWidthRatio };
    },
    createLinearGradient: () => gradient("createLinearGradient"),
    createRadialGradient: () => gradient("createRadialGradient"),
  };

  return ctx;
}
