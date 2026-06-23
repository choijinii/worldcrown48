/**
 * C-2 Crown Card · isomorphic canvas primitives.
 *
 * Ported verbatim from the wireframe truth source
 * (docs/design/wireframes/Domain 3 · The Arena.html line 1081-1166).
 * Runs unchanged against the browser CanvasRenderingContext2D (client preview)
 * and node-canvas (functions/src/core/canvasServer.ts) — hence the structural
 * `Canvas2D` type rather than the DOM lib type. Coordinates/colors are the
 * single source of truth; do NOT tweak (handoff §5 DO).
 */

// ── palette (wireframe line 1081-1083) ──────────────────────────────────────
/** Crown Gold — the only gold (CLAUDE.md 불변 원칙 #2). */
export const GOLD = "#FCD006";
/** Gold rgba with a given alpha. */
export const G = (a: number): string => `rgba(252,208,6,${a})`;
export const BG_DEEP = "#00003A";
export const BG_SOFT = "#241754";
export const BG_ELEV = "#362261";
export const TEXT = "#F2F2F5";
export const SUB = "#B1B5C4";
export const MUT = "#7A7FB0";

// ── structural canvas surface (browser + node-canvas common subset) ─────────
export interface CanvasGradientLike {
  addColorStop(offset: number, color: string): void;
}

export interface Canvas2D {
  fillStyle: string | CanvasGradientLike;
  strokeStyle: string | CanvasGradientLike;
  lineWidth: number;
  font: string;
  textAlign: string;
  textBaseline: string;
  shadowColor: string;
  shadowBlur: number;
  globalAlpha: number;
  letterSpacing?: string;

  save(): void;
  restore(): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
  rect(x: number, y: number, w: number, h: number): void;
  fill(): void;
  stroke(): void;
  clip(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void;
  measureText(text: string): { width: number };
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradientLike;
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradientLike;
}

/** Image-like accepted by the renderers — null in node/tests → glyph fallback. */
export type CrownImage = { complete?: boolean; naturalWidth?: number } | null;

/** A font-string maker, e.g. (s) => `900 italic ${s}px "Playfair Display"`. */
export type FontMaker = (size: number) => string;

// ── primitives (wireframe line 1097-1166) ───────────────────────────────────

/** Rounded-rect path (does not fill/stroke — caller decides). */
export function rr(ctx: Canvas2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Largest font size in [min, start] (step −2) whose measured width ≤ max. */
export function fit(ctx: Canvas2D, text: string, mk: FontMaker, max: number, start: number, min: number): number {
  let s = start;
  while (s > min) {
    ctx.font = mk(s);
    if (ctx.measureText(text).width <= max) return s;
    s -= 2;
  }
  return min;
}

/** Set letterSpacing, tolerating engines (node-canvas) that lack the setter. */
export function ls(ctx: Canvas2D, v: string): void {
  try {
    ctx.letterSpacing = v;
  } catch {
    /* node-canvas — letterSpacing unsupported; ignore (handoff §9 trap #7) */
  }
}

/** Simple gold crown glyph (fallback when no crown image is loaded). */
export function crownGlyph(ctx: Canvas2D, cx: number, cy: number, s: number): void {
  const w = s,
    h = s * 0.78,
    x = cx - w / 2,
    y = cy - h / 2;
  ctx.save();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w * 0.06, y + h * 0.3);
  ctx.lineTo(x + w * 0.28, y + h * 0.62);
  ctx.lineTo(x + w * 0.5, y);
  ctx.lineTo(x + w * 0.72, y + h * 0.62);
  ctx.lineTo(x + w * 0.94, y + h * 0.3);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Hero crown: big, top-centred, radiant gaussian bloom (no concentric rings). */
export function crownHero(ctx: Canvas2D, cx: number, cy: number, size: number, img: CrownImage): void {
  ctx.save();
  const hr = size * 1.5;
  const hg = ctx.createRadialGradient(cx, cy, size * 0.12, cx, cy, hr);
  hg.addColorStop(0, G(0.26));
  hg.addColorStop(0.5, G(0.07));
  hg.addColorStop(1, "rgba(252,208,6,0)");
  ctx.fillStyle = hg;
  ctx.fillRect(cx - hr, cy - hr, hr * 2, hr * 2);
  const paint = (): void => {
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
    else crownGlyph(ctx, cx, cy, size * 0.78);
  };
  ctx.shadowColor = G(0.7);
  ctx.shadowBlur = size * 0.6;
  paint();
  ctx.shadowBlur = size * 0.3;
  paint();
  ctx.shadowBlur = 0;
  paint();
  ctx.restore();
}

/** Deep-navy background with gold radial glow + bottom vignette. */
export function bg(ctx: Canvas2D, W: number, H: number, glowY: number): void {
  ctx.fillStyle = BG_DEEP;
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, glowY, 0, W / 2, glowY, Math.max(W, H) * 0.72);
  g.addColorStop(0, G(0.18));
  g.addColorStop(0.45, G(0.05));
  g.addColorStop(1, "rgba(0,0,58,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const v = ctx.createLinearGradient(0, H * 0.55, 0, H);
  v.addColorStop(0, "rgba(0,0,26,0)");
  v.addColorStop(1, "rgba(0,0,18,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

/** Pill badge with gold outline, e.g. "WORLD'S TOP 10 · MY PICK". */
export function drawBadge(ctx: Canvas2D, cx: number, cy: number, h: number, text: string): void {
  ctx.save();
  ctx.font = "700 " + h * 0.46 + 'px "JetBrains Mono", monospace';
  ls(ctx, h * 0.1 + "px");
  const tw = ctx.measureText(text).width;
  const w = tw + h * 1.4,
    x = cx - w / 2,
    y = cy - h / 2;
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = "rgba(0,0,42,0.62)";
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, h * 0.05);
  ctx.strokeStyle = G(0.6);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy + h * 0.04);
  ls(ctx, "0px");
  ctx.restore();
}
