/**
 * C-2 Crown Card · drawQR — scannable mini QR.
 *
 * Ported verbatim from the wireframe truth source
 * (docs/design/wireframes/Domain 3 · The Arena.html line 1169-1180). Navy
 * (#00003A) modules on a white rounded background with a 2-cell quiet zone.
 *
 * Uses qrcode-generator@1.4.4 — the SAME library/version the wireframe loads
 * from CDN, pinned so the module matrix is byte-identical (handoff §9 trap #9;
 * a different QR lib would change the matrix and break visual regression).
 * This is the only canvas module with the QR dependency; drawLink/drawPortrait
 * receive it by injection so they stay dependency-free and isomorphic.
 */
import qrcode from "qrcode-generator";
import { rr, type Canvas2D } from "./primitives";

export function drawQR(ctx: Canvas2D, x: number, y: number, size: number, text: string): void {
  if (!text) return;
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount(),
    quiet = 2,
    total = n + quiet * 2,
    cell = size / total;
  ctx.save();
  rr(ctx, x, y, size, size, size * 0.08);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.fillStyle = "#00003A";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect(x + (c + quiet) * cell, y + (r + quiet) * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }
  }
  ctx.restore();
}
