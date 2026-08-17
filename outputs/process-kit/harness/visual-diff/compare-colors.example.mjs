#!/usr/bin/env node
/**
 * compare-colors.example.mjs — "색이 하나도 안 바뀌었다"를 눈이 아니라 수치로
 * 증명하는 하네스.
 *
 * 같은 경로를 기준 빌드와 대상 빌드에서 각각 열어, body 이하 **모든 요소의
 * 계산된 색상값**을 문서 순서대로 대조한다. 값의 이름만 바꾸는 작업
 * (토큰 치환·테마 전환 준비·CSS 정리)에서 "시각 결과 변화 0"을 주장하려면
 * 이 정도의 증거가 필요하다.
 *
 * ── 왜 정적 검토로는 부족한가 ──
 * 값 대조와 grep이 전부 통과했는데도 실제 렌더에서만 드러나는 회귀가 있다.
 * 스코프 밖이라 무효화되던 `box-shadow: var(--x)` 선언이, 토큰이 스코프 안으로
 * 들어오자 살아나면서 **없던 그림자가 생긴** 사례가 실제로 있었다.
 *
 * ── 필요한 것 ──
 *   playwright (npm i -D playwright && npx playwright install chromium)
 *
 * ── 사용법 ──
 *   # 1. 기준 커밋을 별도 워크트리에 준비
 *   git worktree add --detach /tmp/base <기준SHA>
 *   cp .env.local /tmp/base/.env.local        # 환경변수 파일이 있으면
 *   (cd /tmp/base && npm ci && npm run build)
 *
 *   # 2. 양쪽 다 **프로덕션 빌드**로 띄운다 (dev 서버는 빌드 산출물을 덮어쓴다)
 *   (cd /tmp/base && PORT=3001 npm run start &)
 *   npm run build && PORT=3000 npm run start &
 *
 *   # 3. 대조
 *   node scripts/visual-diff/compare-colors.mjs
 *   node scripts/visual-diff/compare-colors.mjs --routes=/,/about
 *   node scripts/visual-diff/compare-colors.mjs --base=3001 --head=3000
 *   node scripts/visual-diff/compare-colors.mjs --json
 *
 *   # 4. 정리
 *   git worktree remove --force /tmp/base
 *
 * 차이가 하나라도 있거나 비교 자체가 불가능한 경로가 있으면 exit 1.
 *
 * ── 기본적으로 JS를 차단하는 이유 ──
 * 스크립트 요청을 막고 서버 렌더된 HTML + CSS만 본다. 로컬 환경변수가 비어 있어
 * 클라이언트 초기화가 던지면 프레임워크가 서버 HTML을 통째로 지워버려 비교할
 * DOM이 남지 않는다. 색은 CSS가 칠하므로 JS 없이도 검증 대상은 온전하다.
 * 자격증명이 있고 클라이언트 렌더 화면까지 보려면 `--with-js`.
 *
 * 설정은 visual-diff.config.json (경로·포트·뷰포트), 대조 로직은
 * compare-colors.lib.example.mjs 에 있다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import {
  COLOUR_PROPS,
  diffSnapshots,
  snapshotSource,
  summarise,
} from "./compare-colors.lib.example.mjs"; // ← 이름 바꿀 때 이 줄도 함께

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const has = (name) => argv.includes(`--${name}`);

const CONFIG_PATH = path.resolve(
  flag("config", path.join(SCRIPT_DIR, "visual-diff.config.json")),
);

let config;
try {
  config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
} catch (err) {
  if (err.code === "ENOENT") {
    console.error(`✗ 설정 파일이 없습니다: ${CONFIG_PATH}`);
    console.error("  visual-diff.config.example.json 을 복사해 경로 목록을 채우세요.");
    process.exit(2);
  }
  console.error(`✗ 설정이 올바른 JSON이 아닙니다: ${err.message}`);
  process.exit(2);
}

const routesArg = flag("routes", "");
const routes = routesArg ? routesArg.split(",").filter(Boolean) : (config.routes ?? []);
if (routes.length === 0) {
  console.error("✗ 대조할 경로가 없습니다 — 설정의 routes 또는 --routes= 를 채우세요.");
  process.exit(2);
}

const basePort = flag("base", String(config.basePort ?? 3001));
const headPort = flag("head", String(config.headPort ?? 3000));
const host = config.host ?? "http://localhost";
const viewport = config.viewport ?? { width: 1280, height: 900 };
const settleMs = config.settleMs ?? 1200;
const props = config.properties ?? COLOUR_PROPS;
const withJs = has("with-js") || config.blockScripts === false;
const asJson = has("json");

const snapshot = snapshotSource(props);
const browser = await chromium.launch();

async function grab(port, route) {
  const page = await browser.newPage({ viewport });
  if (!withJs) await page.route("**/*.js*", (r) => r.abort());
  try {
    await page.goto(`${host}:${port}${route}`, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    // 폰트·스타일시트가 자리를 잡아야 계산값이 최종값이 된다.
    await page.waitForTimeout(settleMs);
    return await page.evaluate(snapshot);
  } finally {
    await page.close();
  }
}

const results = [];
for (const route of routes) {
  let base, head;
  try {
    [base, head] = await Promise.all([grab(basePort, route), grab(headPort, route)]);
  } catch (err) {
    results.push({
      route,
      comparable: false,
      reason: `로드 실패: ${String(err).slice(0, 160)}`,
      diffs: [],
    });
    continue;
  }
  results.push({ route, ...diffSnapshots(base, head, props) });
}

await browser.close();

const total = summarise(results);

if (asJson) {
  console.log(JSON.stringify({ basePort, headPort, results, total }, null, 2));
} else {
  for (const r of results) {
    if (!r.comparable) {
      console.log(`${r.route.padEnd(22)} ⚠ ${r.reason}`);
      continue;
    }
    console.log(
      `${r.route.padEnd(22)} 요소 ${String(r.count).padStart(4)}  차이 ${r.diffs.length}`,
    );
    for (const d of r.diffs.slice(0, 25)) {
      console.log(`    ${d.path} [${d.prop}]  base=${d.base}  head=${d.head}`);
    }
    if (r.diffs.length > 25) console.log(`    … 외 ${r.diffs.length - 25}건`);
  }
  console.log(
    `\n총 비교 요소 ${total.elements} · 색상 차이 ${total.differences}건` +
      (total.skipped ? ` · 비교 불가 ${total.skipped}개 경로` : "") +
      (total.ok ? " → 시각 결과 변화 0 ✓" : " → ⚠ STOP"),
  );
}

process.exit(total.ok ? 0 : 1);
