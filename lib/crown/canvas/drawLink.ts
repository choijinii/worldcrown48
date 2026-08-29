/**
 * C-2 Crown Card · drawLink — the 1.91:1 Link / OG card (1200×630).
 *
 * Ported verbatim from the wireframe truth source
 * (docs/design/wireframes/Domain 3 · The Arena.html line 1252-1296).
 * Layout: left photo square with the champion initial, right column with a
 * gold crown above the name/title/tagline/url, and a scannable QR bottom-right.
 *
 * Isomorphic: runs against the browser canvas (client preview / download) and
 * node-canvas (server OG PNG). The QR drawer is injected so this module carries
 * no `qrcode-generator` dependency — Phase 2's drawQR.ts supplies the real one;
 * tests inject a spy; the default is a no-op (matches the wireframe, whose QR is
 * a guarded no-op until the CDN script loads).
 *
 * 딥링크화(2026-08-29 대표 확정, marketing-instrumentation-kick.md ③): QR이
 * 가리키는 곳은 이제 `d.url`(그 대회의 Crown Card 페이지, championLoader 참고)에
 * utm_source=qr을 붙인 주소다 — 예전엔 "https://worldcrown48.com" 고정이었다.
 * 화면에 보이는 "WorldCrown48.com" 글자는 브랜드 표기라 그대로 둔다(화면 문구
 * 변경 아님 — QR은 스캔하는 것이지 읽는 게 아니라서 승인 게이트 대상이 아니다).
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
import { withShareUtm } from "../shareIntents";

/** Draws a scannable QR of `text` at (x, y) with the given size. */
export type QrDrawer = (ctx: Canvas2D, x: number, y: number, size: number, text: string) => void;

const noopQr: QrDrawer = () => {};

export function drawLink(
  ctx: Canvas2D,
  W: number,
  H: number,
  d: CrownData,
  img: CrownImage,
  qr: QrDrawer = noopQr,
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

  // scannable mini QR, bottom-right corner
  const qrs = H * 0.17;
  qr(ctx, rRight - qrs, H - pad - m - qrs, qrs, withShareUtm(d.url, "qr"));
}
