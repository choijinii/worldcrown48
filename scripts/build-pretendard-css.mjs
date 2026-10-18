#!/usr/bin/env node
/**
 * FONT-1 — Pretendard 공식 배포본(npm `pretendard`)의 가변 글꼴 woff2-dynamic-subset 을 저장소 안으로
 * 옮기고 app/pretendard.css 를 만든다. 외부 CDN 은 쓰지 않는다.
 *
 * 왜 가변 글꼴 한 벌인가(FONT-1 실측, 2026-10-17): 굵기별 고정 글꼴 6벌은 선언이 552개(CSS 300KB)라
 * 첫 화면을 막는 스타일시트가 커져 첫 그림이 1.0초 늦어졌다. 가변 한 벌은 선언 92개(약 50KB)이고,
 * 화면에서 받는 조각도 더 적고 가볍다(피치 26개 312KB → 9개 227KB).
 *
 * 쓰는 법 (버전을 올릴 때만):
 *   npm pack pretendard@1.3.9 && tar xzf pretendard-1.3.9.tgz
 *   node scripts/build-pretendard-css.mjs ./package
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const pkg = process.argv[2];
if (!pkg) {
  console.error("usage: node scripts/build-pretendard-css.mjs <unpacked pretendard package dir>");
  process.exit(1);
}
const version = JSON.parse(readFileSync(path.join(pkg, "package.json"), "utf8")).version;
const variableDir = path.join(pkg, "dist/web/variable");
const srcDir = path.join(variableDir, "woff2-dynamic-subset");
const outDir = path.join("public/fonts", `pretendard-${version}`);
const urlBase = `/fonts/pretendard-${version}`;
mkdirSync(outDir, { recursive: true });

for (const f of readdirSync(srcDir)) copyFileSync(path.join(srcDir, f), path.join(outDir, f));
copyFileSync(path.join(pkg, "dist/LICENSE.txt"), path.join(outDir, "LICENSE.txt"));

const css = readFileSync(path.join(variableDir, "pretendardvariable-dynamic-subset.css"), "utf8");
const faces = [];
for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
  const body = m[1];
  const weight = /font-weight:\s*([^;]+);/.exec(body)[1].trim();
  const file = /url\(\.\/woff2-dynamic-subset\/([^)]+\.woff2)\)/.exec(body)[1];
  const range = /unicode-range:\s*([^;]+);/.exec(body)[1];
  // 이름은 "Pretendard" 그대로 — --font-sans · --font-display 글꼴 목록을 바꾸지 않는다.
  faces.push(
    `@font-face{font-family:"Pretendard";font-style:normal;font-weight:${weight};font-display:swap;` +
      `src:url("${urlBase}/${file}") format("woff2");unicode-range:${range}}`,
  );
}

const header = `/* Pretendard ${version} — 가변 글꼴 woff2 dynamic subset (self-hosted). 만든 곳: scripts/build-pretendard-css.mjs · 손으로 고치지 않는다.
   Copyright (c) 2021 Kil Hyung-jin, with Reserved Font Name Pretendard. SIL Open Font License 1.1 — ${urlBase}/LICENSE.txt */\n`;
writeFileSync("app/pretendard.css", header + faces.join("\n") + "\n");
console.log(`app/pretendard.css: ${faces.length} faces · ${outDir}`);
