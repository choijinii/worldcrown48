/**
 * canvasServer — server-side 1.91:1 Crown Card PNG renderer.
 *
 * Renders the SAME Link card as the client by importing the shared isomorphic
 * modules copied into src/_crown by scripts/copy-crown.mjs (handoff §3 — no
 * duplicate implementation). `canvas`(node-canvas) 3.x 는 **필수 의존성**이다
 * (CARD-FIX, 2026-10-04). 2.11.2 를 선택 설치(optionalDependencies)로 두었을 때 Node 22
 * 배포(2026-09-27)에서 설치가 실패했는데 배포는 성공으로 끝났고, 실행 때마다
 * `Cannot find module 'canvas'` 로 카드 없이 조용히 끝났다. 2.11.2 는 Node 21(ABI 120)까지만
 * 미리 만든 설치 파일이 있다. 3.x 는 N-API 설치 파일이라 Node 버전에 묶이지 않고, 필수 의존성이라
 * 설치가 실패하면 배포 자체가 실패한다. 그리기 엔진(Cairo)과 API 는 2.x 와 같다.
 * `require` 는 여전히 늦게 부른다 — 이 파일을 import 만 하는 단위 테스트가 네이티브 모듈을
 * 불러오지 않게.
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
 * import("canvas")`) so this file's types don't depend on the native package.
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
  // Lazy require: 필수 의존성(canvas 3.x) — 배포된 함수에는 언제나 있다.
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
