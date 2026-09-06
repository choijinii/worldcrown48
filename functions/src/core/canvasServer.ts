/**
 * canvasServer — server-side 1.91:1 Crown Card PNG renderer.
 *
 * Renders the SAME Link card as the client by importing the shared isomorphic
 * modules copied into src/_crown by scripts/copy-crown.mjs (handoff §3 — no
 * duplicate implementation). `node-canvas` is an OPTIONAL dependency and is
 * `require`d lazily so the functions build + unit tests don't need the native
 * binary (it builds on the node-20 runtime / CI, not necessarily on a dev box).
 *
 * The server renders with no crown image (glyph fallback) — the 1.91:1 PNG is
 * the SNS/OG asset and a 1-2px difference from the client is acceptable
 * (handoff §9 trap #7). The downloadable client cards remain pixel-faithful.
 */
import { drawLink } from "../_crown/canvas/drawLink";
import type { Canvas2D } from "../_crown/canvas/primitives";
import type { CrownData } from "../_crown/formats";

/**
 * Minimal node-canvas surface we use. Declared locally (not `typeof
 * import("canvas")`) so tsc never tries to resolve the optional native module at
 * build time — it only exists at runtime on the node-20 Functions instance.
 */
interface NodeCanvas {
  getContext(type: "2d"): unknown;
  toBuffer(mime: "image/png"): Buffer;
}
interface CanvasLib {
  createCanvas(width: number, height: number): NodeCanvas;
}

/** Render the 1.91:1 Crown Card and return a PNG buffer. */
export function renderCrownPng(data: CrownData): Buffer {
  // Lazy require: optionalDependency, present in the node-20 Functions runtime.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createCanvas } = require("canvas") as CanvasLib;
  const W = 1200;
  const H = 630;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d") as unknown as Canvas2D;
  // PR #89가 QR을 없애며 drawLink 인자를 6→5로 줄였다. 서버 호출부가 그때 같이
  // 안 고쳐져 functions 빌드가 깨져 있었다.
  drawLink(ctx, W, H, data, null);
  return canvas.toBuffer("image/png");
}
