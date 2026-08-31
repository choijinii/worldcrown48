/**
 * C-2 Crown Card · drawPortrait — the 9:16 Story + 4:5 Feed cards.
 *
 * Ported verbatim from the wireframe truth source
 * (docs/design/wireframes/Domain 3 · The Arena.html line 1182-1250). One
 * renderer serves both portrait formats (story 1080×1920, feed 1080×1350) — the
 * layout is expressed in fractions of W/H. Photo fills ~90% of the card with the
 * champion initial + a bottom scrim caption (CHAMPION / name / title / tagline /
 * url) and a hero crown straddling the top edge.
 *
 * Isomorphic (browser canvas + node-canvas).
 *
 * QR 제거(2026-08-31 대표 확정): drawLink.ts와 동일한 이유로 카드 본체에서
 * QR을 뺐다 — 상세 사유는 drawLink.ts 헤더 참고.
 */
import {
  bg,
  crownHero,
  drawBadge,
  fit,
  ls,
  rr,
  GOLD,
  G,
  TEXT,
  SUB,
  BG_ELEV,
  BG_SOFT,
  type Canvas2D,
  type CrownImage,
} from "./primitives";
import type { CrownData } from "../formats";

export function drawPortrait(
  ctx: Canvas2D,
  W: number,
  H: number,
  d: CrownData,
  img: CrownImage,
): void {
  bg(ctx, W, H, H * 0.42);
  const pad = W * 0.05;
  // thin yellow frame line near the card outline
  ctx.lineWidth = W * 0.007;
  ctx.strokeStyle = GOLD;
  rr(ctx, pad, pad, W - 2 * pad, H - 2 * pad, W * 0.035);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = G(0.3);
  const ip = pad + W * 0.026;
  rr(ctx, ip, ip, W - 2 * ip, H - 2 * ip, W * 0.026);
  ctx.stroke();

  const cx = W / 2;
  const innerW = W - 2 * pad,
    innerH = H - 2 * pad;
  const pw = innerW * 0.95,
    ph = innerH * 0.95;
  const px = cx - pw / 2,
    py = pad + (innerH - ph) / 2;
  const rad = W * 0.03;

  // ── photo (≈90% of card) — fill, initial, scrim + caption (clipped) ──
  rr(ctx, px, py, pw, ph, rad);
  ctx.save();
  ctx.clip();
  const pg = ctx.createLinearGradient(px, py, px + pw, py + ph);
  pg.addColorStop(0, BG_ELEV);
  pg.addColorStop(1, BG_SOFT);
  ctx.fillStyle = pg;
  ctx.fillRect(px, py, pw, ph);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = G(0.9);
  const isz = Math.min(pw, ph) * 0.4;
  ctx.font = "900 italic " + isz + 'px "Playfair Display","Playfair Display Local",serif';
  ctx.fillText(d.initial, cx, py + ph * 0.33);
  ctx.textBaseline = "alphabetic";

  const sc = ctx.createLinearGradient(0, py + ph * 0.42, 0, py + ph);
  sc.addColorStop(0, "rgba(0,0,28,0)");
  sc.addColorStop(0.5, "rgba(4,2,26,0.6)");
  sc.addColorStop(1, "rgba(2,1,16,0.96)");
  ctx.fillStyle = sc;
  ctx.fillRect(px, py + ph * 0.42, pw, ph * 0.58);

  ctx.textAlign = "center";
  ctx.fillStyle = SUB;
  ls(ctx, W * 0.012 + "px");
  ctx.font = "700 " + W * 0.024 + 'px "Inter","Pretendard",sans-serif';
  ctx.fillText("CHAMPION", cx, py + ph - ph * 0.265);
  ls(ctx, "0px");

  const nf = (s: number): string => "900 italic " + s + 'px "Playfair Display","Playfair Display Local",serif';
  ctx.font = nf(fit(ctx, d.name, nf, pw - W * 0.08, W * 0.1, W * 0.05));
  ctx.fillStyle = GOLD;
  ctx.fillText(d.name, cx, py + ph - ph * 0.195);

  const tf = (s: number): string => "600 " + s + 'px "Inter","Pretendard",sans-serif';
  ctx.font = tf(fit(ctx, d.title, tf, pw - W * 0.12, W * 0.028, W * 0.016));
  ctx.fillStyle = TEXT;
  ctx.fillText(d.title, cx, py + ph - ph * 0.15);

  ctx.font = "700 italic " + W * 0.032 + 'px "Playfair Display","Playfair Display Local",serif';
  ctx.fillStyle = G(0.92);
  ctx.fillText("Who is your Crown?", cx, py + ph - ph * 0.082);

  ctx.font = "800 " + W * 0.026 + 'px "Inter","Pretendard",sans-serif';
  ls(ctx, W * 0.004 + "px");
  ctx.fillStyle = TEXT;
  ctx.fillText("WorldCrown48.com", cx, py + ph - ph * 0.032);
  ls(ctx, "0px");
  ctx.restore();

  // photo gold border
  ctx.lineWidth = Math.max(2, W * 0.004);
  ctx.strokeStyle = G(0.5);
  rr(ctx, px, py, pw, ph, rad);
  ctx.stroke();

  // crown + badge geometry (anchored to the frame so the crown never pokes past the top)
  const cs = W * 0.19,
    crownTop = pad + W * 0.02,
    cyCrown = crownTop + cs / 2;

  // global-tournament badge — fixed gap below the crown's bottom edge
  drawBadge(ctx, cx, crownTop + cs + W * 0.05, W * 0.044, "WORLD'S TOP 10 · MY PICK");

  // crown layer ON TOP of the photo, straddling its top edge
  crownHero(ctx, cx, cyCrown, cs, img);
}
