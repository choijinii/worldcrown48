#!/usr/bin/env node
/**
 * compare-colors.mjs — "색이 하나도 안 바뀌었다"를 증명하는 하네스.
 *
 * 같은 라우트를 기준 빌드와 대상 빌드에서 각각 열어, body 이하 **모든 요소의
 * 계산된 색상값**을 문서 순서대로 대조한다. 값의 이름만 바꾸는 작업
 * (토큰 치환·테마 전환 준비)에서 "시각 결과 변화 0"을 눈이 아니라 수치로
 * 확인하기 위한 도구다. TOK-1에서 만들었고, 테마 B안 전환 킥에서 재사용한다.
 *
 * ── 왜 정적 검토로는 부족한가 ──
 * TOK-1에서 light 토큰 정의를 :root로 올렸더니 다크 네비바에 **없던 그림자가
 * 생겼다**. `box-shadow: var(--shadow-gnb)`가 다크 스코프에서는 토큰이 없어
 * 선언째 무효화되던 것이, 토큰이 생기자 살아난 것이다. 값 대조·grep으로는
 * 안 잡히고 실제 렌더에서만 드러난다.
 *
 * ── 사용법 ──
 *   # 1. 기준 커밋을 별도 워크트리에 준비
 *   git worktree add --detach /tmp/wc48-base <기준SHA>
 *   cp .env.local /tmp/wc48-base/.env.local
 *   (cd /tmp/wc48-base && npm ci && npm run build)
 *
 *   # 2. 양쪽 다 프로덕션 빌드로 띄운다 (dev 서버는 .next를 덮어쓰므로 주의)
 *   (cd /tmp/wc48-base && PORT=3001 npm run start &)
 *   npm run build && PORT=3000 npm run start &
 *
 *   # 3. 대조
 *   node scripts/visual-diff/compare-colors.mjs
 *   node scripts/visual-diff/compare-colors.mjs --routes=/news,/admin
 *   node scripts/visual-diff/compare-colors.mjs --base=3001 --head=3000
 *   node scripts/visual-diff/compare-colors.mjs --json
 *
 *   # 4. 정리
 *   git worktree remove --force /tmp/wc48-base
 *
 * 차이가 하나라도 있거나 비교 자체가 불가능한 라우트가 있으면 exit 1.
 *
 * ── JS를 차단하는 이유 ──
 * 기본적으로 스크립트 요청을 막고 프리렌더된 HTML + CSS만 본다. 로컬
 * .env.local의 Firebase 공개 키가 비어 있으면 하이드레이션이 던지면서 React가
 * 서버 HTML을 통째로 지워버려 비교할 DOM이 남지 않는다. 색은 CSS가 칠하므로
 * JS 없이도 검증 대상은 온전하다. 자격증명이 있고 클라이언트 렌더 화면까지
 * 보려면 --with-js 를 준다.
 *
 * 비교 로직은 compare-colors.lib.mjs, 단위테스트는
 * lib/__tests__/visualDiff.test.ts.
 */
import { chromium } from "playwright";

import {
  COLOUR_PROPS,
  diffSnapshots,
  snapshotSource,
  summarise,
} from "./compare-colors.lib.mjs";

const DEFAULT_ROUTES = [
  "/launch",
  "/",
  "/news",
  "/policies/terms",
  "/policies/privacy",
  "/account",
  "/admin",
  "/admin/lab",
  "/admin/newsdesk",
];

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const has = (name) => argv.includes(`--${name}`);

const basePort = flag("base", "3001");
const headPort = flag("head", "3000");
const routes = flag("routes", "")
  ? flag("routes", "").split(",").filter(Boolean)
  : DEFAULT_ROUTES;
const withJs = has("with-js");
const asJson = has("json");

const snapshot = snapshotSource(COLOUR_PROPS);
const browser = await chromium.launch();

async function grab(port, route) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  if (!withJs) await page.route("**/*.js*", (r) => r.abort());
  try {
    await page.goto(`http://localhost:${port}${route}`, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    // Let fonts and stylesheets settle so computed values are final.
    await page.waitForTimeout(1200);
    return await page.evaluate(snapshot);
  } finally {
    await page.close();
  }
}

const results = [];
for (const route of routes) {
  let base, head;
  try {
    [base, head] = await Promise.all([
      grab(basePort, route),
      grab(headPort, route),
    ]);
  } catch (err) {
    results.push({
      route,
      comparable: false,
      reason: `로드 실패: ${String(err).slice(0, 160)}`,
      diffs: [],
    });
    continue;
  }
  results.push({ route, ...diffSnapshots(base, head) });
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
    if (r.diffs.length > 25) {
      console.log(`    … 외 ${r.diffs.length - 25}건`);
    }
  }
  console.log(
    `\n총 비교 요소 ${total.elements} · 색상 차이 ${total.differences}건` +
      (total.skipped ? ` · 비교 불가 ${total.skipped}개 라우트` : "") +
      (total.ok ? " → 시각 결과 변화 0 ✓" : " → ⚠ STOP"),
  );
}

process.exit(total.ok ? 0 : 1);
