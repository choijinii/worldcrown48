#!/usr/bin/env node
/**
 * FONT-1 — Pretendard 공식 배포본(npm `pretendard`)의 woff2-dynamic-subset 을 저장소 안으로 옮기고
 * 쓰는 굵기만 담은 app/pretendard.css 를 만든다. 외부 CDN 은 쓰지 않는다.
 *
 * 쓰는 법 (버전을 올릴 때만):
 *   npm pack pretendard@1.3.9 && tar xzf pretendard-1.3.9.tgz
 *   node scripts/build-pretendard-css.mjs ./package
 *
 * 굵기를 바꾸면 lib/__tests__/layout/fontFaces.test.ts 의 PRETENDARD_WEIGHTS 도 함께 바꾼다.
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const WEIGHTS = { 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black" };

const pkg = process.argv[2];
if (!pkg) {
  console.error("usage: node scripts/build-pretendard-css.mjs <unpacked pretendard package dir>");
  process.exit(1);
}
const version = JSON.parse(readFileSync(path.join(pkg, "package.json"), "utf8")).version;
const srcDir = path.join(pkg, "dist/web/static/woff2-dynamic-subset");
const outDir = path.join("public/fonts", `pretendard-${version}`);
const urlBase = `/fonts/pretendard-${version}`;
mkdirSync(outDir, { recursive: true });

const names = new Set(Object.values(WEIGHTS));
for (const f of readdirSync(srcDir)) {
  if (names.has(f.split(".")[0].replace("Pretendard-", ""))) copyFileSync(path.join(srcDir, f), path.join(outDir, f));
}
copyFileSync(path.join(pkg, "dist/LICENSE.txt"), path.join(outDir, "LICENSE.txt"));

const css = readFileSync(path.join(pkg, "dist/web/static/pretendard-dynamic-subset.css"), "utf8");
const faces = [];
for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
  const body = m[1];
  const weight = Number(/font-weight:\s*(\d+)/.exec(body)[1]);
  if (!WEIGHTS[weight]) continue;
  const file = /url\(\.\/woff2-dynamic-subset\/([^)]+\.woff2)\)/.exec(body)[1];
  const range = /unicode-range:\s*([^;]+);/.exec(body)[1];
  faces.push(
    `@font-face{font-family:"Pretendard";font-style:normal;font-weight:${weight};font-display:swap;` +
      `src:url("${urlBase}/${file}") format("woff2");unicode-range:${range}}`,
  );
}

const header = `/* Pretendard ${version} — woff2 dynamic subset (self-hosted). 만든 곳: scripts/build-pretendard-css.mjs · 손으로 고치지 않는다.
   Copyright (c) 2021 Kil Hyung-jin, with Reserved Font Name Pretendard. SIL Open Font License 1.1 — ${urlBase}/LICENSE.txt */\n`;
writeFileSync("app/pretendard.css", header + faces.join("\n") + "\n");
console.log(`app/pretendard.css: ${faces.length} faces · ${outDir}`);
