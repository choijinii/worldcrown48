/**
 * C-2 Crown Card · drawLink — the 1.91:1 Link / OG card (1200×630).
 *
 * Ported verbatim from the wireframe truth source
 * (docs/design/wireframes/Domain 3 · The Arena.html line 1252-1296).
 * Layout: left photo square with the champion initial, right column with a
 * gold crown above the name/title/tagline/url.
 *
 * Isomorphic: runs against the browser canvas (client preview / download) and
 * node-canvas (server OG PNG).
 *
 * QR 제거(2026-08-31 대표 확정): 카드 본체 안에 QR을 넣지 않기로 정책이
 * 바뀌었다 — marketing/00_strategy/UTM_RULES_v1.0.md와 WC48 Card Mockup 문서가 독립적으로
 * 같은 결론(QR은 카드 이미지 밖에서만)을 냈고, 대표님이 "아예 삭제"로
 * 최종 확정했다. 이전엔 QrDrawer를 주입받아 bottom-right에 그렸으나, 이제
 * 이 렌더러는 QR을 전혀 그리지 않는다.
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
  BG_ELEV,
  BG_SOFT,
  type Canvas2D,
  type CrownImage,
} from "./primitives";
import type { CrownData } from "../formats";

export function drawLink(
  ctx: Canvas2D,
  W: number,
  H: number,
  d: CrownData,
  img: CrownImage,
): void {
  bg(ctx, W, H, H * 0.42);
  const pad = W * 0.022;
  ctx.lineWidth = W * 0.005;
  ctx.strokeStyle = GOLD;
  rr(ctx, pad, pad, W - 2 * pad, H - 2 * pad, W * 0.012);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = G(0.3);
  const ip2 = pad + W * 0.01;
  rr(ctx, ip2, ip2, W - 2 * ip2, H - 2 * ip2, W * 0.01);
  ctx.stroke();

  // photo (left) with large initial
  const m = W * 0.022,
    side = H - 2 * pad - 2 * m,
    px = pad + m,
    py = pad + m,
    rad = W * 0.012;
  rr(ctx, px, py, side, side, rad);
  ctx.save();
  ctx.clip();
  const pg = ctx.createLinearGradient(px, py, px + side, py + side);
  pg.addColorStop(0, BG_ELEV);
  pg.addColorStop(1, BG_SOFT);
  ctx.fillStyle = pg;
  ctx.fillRect(px, py, side, side);
  ctx.fillStyle = G(0.9);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 italic " + side * 0.56 + 'px "Playfair Display","Playfair Display Local",serif';
  ctx.fillText(d.initial, px + side / 2, py + side * 0.5);
  ctx.restore();
  ctx.lineWidth = Math.max(2, W * 0.003);
  ctx.strokeStyle = G(0.5);
  rr(ctx, px, py, side, side, rad);
  ctx.stroke();

  // right column — crown ABOVE name, then name + title below
  const ix = px + side,
    rRight = W - pad - m,
    rcx = (ix + rRight) / 2,
    rW = rRight - ix;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  drawBadge(ctx, rcx, py + H * 0.055, H * 0.058, "WORLD'S TOP 10 · MY PICK");
  crownHero(ctx, rcx, H * 0.33, H * 0.27, img);

  const nf = (s: number): string => "900 italic " + s + 'px "Playfair Display","Playfair Display Local",serif';
  ctx.font = nf(fit(ctx, d.name, nf, rW - W * 0.04, H * 0.13, H * 0.05));
  ctx.fillStyle = GOLD;
  ctx.fillText(d.name, rcx, H * 0.6);

  const tf = (s: number): string => "600 " + s + 'px "Inter","Pretendard",sans-serif';
  ctx.font = tf(fit(ctx, d.title, tf, rW - W * 0.06, H * 0.046, H * 0.026));
  ctx.fillStyle = TEXT;
  ctx.fillText(d.title, rcx, H * 0.685);

  ctx.font = "700 italic " + H * 0.05 + 'px "Playfair Display","Playfair Display Local",serif';
  ctx.fillStyle = G(0.92);
  ctx.fillText("Who is your Crown?", rcx, H * 0.79);

  ctx.font = "800 " + H * 0.042 + 'px "Inter","Pretendard",sans-serif';
  ls(ctx, W * 0.003 + "px");
  ctx.fillStyle = TEXT;
  ctx.fillText("WorldCrown48.com", rcx, H * 0.875);
  ls(ctx, "0px");

}
