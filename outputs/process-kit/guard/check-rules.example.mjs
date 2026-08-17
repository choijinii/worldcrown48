#!/usr/bin/env node
/**
 * check-rules.example.mjs — 리포 규칙 재유입 가드 (실행 진입점).
 *
 * 규칙을 배열로 등록하면 리포를 훑어 위반을 보고하고, 하나라도 있으면
 * exit 1 로 CI를 막는다. 사람이 리뷰로 매번 잡을 수 없는 것을 기계가 잡는다.
 *
 * ── 사용법 ──
 *   node scripts/guard/check-rules.mjs             # 위반이 있으면 exit 1
 *   node scripts/guard/check-rules.mjs --json      # 기계용 출력 (항상 exit 0)
 *   node scripts/guard/check-rules.mjs --summary   # 건수만 (기준선 스냅샷용)
 *   node scripts/guard/check-rules.mjs --root=/path/to/repo --config=/path/rules.json
 *
 * ── 새 프로젝트에 깔 때 ──
 *   1. 이 파일과 check-rules.lib.example.mjs 를 scripts/guard/ 로 복사하고
 *      이름에서 `.example` 을 뗀다 (아래 import 줄도 함께 고친다).
 *   2. rules.example.json → rules.json 으로 복사하고 규칙을 자기 것으로 바꾼다.
 *   3. package.json 에 `"check:rules": "node scripts/guard/check-rules.mjs"` 추가.
 *   4. ci.example.yml 을 .github/workflows/ 에 설치.
 *
 * ── 기준선 방식 ──
 * 처음 돌리면 위반이 잔뜩 나온다. 그게 정상이다(RED 기준선). `--summary` 로
 * 숫자를 스냅샷해 두고 0으로 만들어 가면, 추정과 실측이 얼마나 다르든
 * 구조가 흡수한다.
 *
 * 탐지·범위·예외 로직은 check-rules.lib.example.mjs 에 있다 — 그쪽을
 * 단위테스트로 잠근다. 가드가 조용히 고장 나면 위반 0건도 의미가 없다.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  compileRules,
  filterAllowlisted,
  findUnusedAllowlist,
  formatReport,
  isScannedPath,
  scanContent,
} from "./check-rules.lib.example.mjs"; // ← 이름 바꿀 때 이 줄도 함께

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const has = (name) => argv.includes(`--${name}`);

// 기본값은 <repo>/scripts/guard/ 에 설치된 상태를 가정한다.
const REPO_ROOT = path.resolve(flag("root", path.join(SCRIPT_DIR, "..", "..")));
const CONFIG_PATH = path.resolve(flag("config", path.join(SCRIPT_DIR, "rules.json")));

function loadConfig() {
  let raw;
  try {
    raw = readFileSync(CONFIG_PATH, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error(`✗ 설정 파일이 없습니다: ${CONFIG_PATH}`);
      console.error("  rules.example.json 을 rules.json 으로 복사해 시작하세요.");
      process.exit(2);
    }
    throw err;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`✗ ${path.basename(CONFIG_PATH)} 이 올바른 JSON이 아닙니다: ${err.message}`);
    process.exit(2);
  }
}

/** 아예 내려가지 않을 디렉터리 — 파일마다 거르는 것보다 싸다. */
const HARD_SKIP = new Set([".git", "node_modules"]);

function walk(dir, scan, acc = []) {
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    let stat;
    try {
      stat = statSync(abs);
    } catch {
      continue; // 깨진 심볼릭 링크 등
    }
    const rel = path.relative(REPO_ROOT, abs).split(path.sep).join("/");
    if (stat.isDirectory()) {
      if (HARD_SKIP.has(name)) continue;
      // 제외 접두사에 걸리는 트리는 통째로 건너뛴다 (수천 파일 stat 비용).
      const prefixed = `${rel}/`;
      if ((scan.excludePrefixes ?? []).some((p) => prefixed.startsWith(p))) continue;
      walk(abs, scan, acc);
      continue;
    }
    if (isScannedPath(rel, scan)) acc.push(rel);
  }
  return acc;
}

const config = loadConfig();
let compiled;
try {
  compiled = compileRules(config);
} catch (err) {
  console.error(`✗ 설정 오류: ${err.message}`);
  process.exit(2);
}

const scan = config.scan ?? {};
const allowlist = config.allowlist ?? [];
const files = walk(REPO_ROOT, scan);
const all = files.flatMap((rel) =>
  scanContent(rel, readFileSync(path.join(REPO_ROOT, rel), "utf8"), compiled),
);
const violations = filterAllowlisted(all, allowlist);
const unused = findUnusedAllowlist(all, allowlist);

if (has("json")) {
  console.log(
    JSON.stringify(
      { root: REPO_ROOT, scanned: files.length, rules: compiled.map((r) => r.id), violations, unused },
      null,
      2,
    ),
  );
} else if (has("summary")) {
  const fileCount = new Set(violations.map((v) => v.file)).size;
  console.log(
    `scanned ${files.length} files · ${violations.length} violations in ${fileCount} files · ` +
      `${all.length - violations.length} allowlisted · ${unused.length} stale`,
  );
} else if (violations.length > 0) {
  console.error(formatReport(violations, compiled));
  const fileCount = new Set(violations.map((v) => v.file)).size;
  console.error(`\n✗ 규칙 위반 ${violations.length}건 / ${fileCount}파일.`);
  console.error(
    `  예외가 필요하면 ${path.basename(CONFIG_PATH)} 의 allowlist에 rule+file+match와 **사유**를 함께 등록하세요.`,
  );
} else {
  console.log(`✓ 규칙 위반 없음 (${files.length}파일 검사 · 규칙 ${compiled.length}개)`);
}

if (unused.length > 0 && !has("json")) {
  console.error(`\n✗ 낡은 예외 ${unused.length}건 — 이제 아무것도 매치하지 않습니다:`);
  for (const e of unused) {
    console.error(`  [${e.rule}] ${e.file}  ${e.match}  (${e.reason ?? "사유 없음"})`);
  }
  console.error("  설정에서 삭제하세요. 남겨두면 그 자리에 새로 들어오는 것까지 덮어줍니다.");
}

const failed = violations.length > 0 || unused.length > 0;
process.exit(failed && !has("json") && !has("summary") ? 1 : 0);
