/**
 * IMAGE-1 PR 1 — 에뮬레이터 E2E 용 시험 그림 48장(1600×900 단색 + 번호 jpg) + 세로 300px 그림 한 장.
 * 저작권 없는 생성 파일이다 — 실제 인물 사진을 저장소에 넣지 않는다(지시서 4절).
 *
 *   node scripts/make-entry-fixtures.mjs      → e2e/fixtures/entry-images/01.jpg … 48.jpg · short-300.jpg
 *
 * 그리기는 functions 의 canvas(node-canvas 3)를 빌려 쓴다(루트에 새 의존성 0).
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "functions", "package.json"));
const { createCanvas } = require("canvas");
const out = join(root, "e2e", "fixtures", "entry-images");
mkdirSync(out, { recursive: true });

function jpg(w, h, hue, label) {
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d");
  ctx.fillStyle = `hsl(${hue}, 70%, 45%)`;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `bold ${Math.round(h * 0.4)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, w / 2, h / 2);
  return c.toBuffer("image/jpeg", { quality: 0.6 });
}

for (let i = 1; i <= 48; i++) {
  const n = String(i).padStart(2, "0");
  writeFileSync(join(out, `${n}.jpg`), jpg(1600, 900, (i * 37) % 360, n));
}
writeFileSync(join(out, "short-300.jpg"), jpg(800, 300, 200, "300"));
console.log(`[make-entry-fixtures] 48 + 1 → ${out}`);
