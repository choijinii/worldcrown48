#!/usr/bin/env node
// 문서 검사 3가지 — 금지 낱말 · 링크 깨짐 · Stale-Doc 대조 (DOC-PR D-77 · 지시서 §11.2).
// 로컬 파일과 git diff 만 읽는다. 기준(base)은 DOCS_BASE (기본 origin/main) 와의 merge-base.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
  addedLines,
  extractPaths,
  withoutChangelogRows,
  findForbidden,
  languageChecks,
  missingPaths,
  staleChecks,
} from "./check-docs.lib.mjs";

const DOCS = ["CLAUDE.md", "LANGUAGE.md"];
const LEDGER = "outputs/DECISIONS_결정원장_v1.0_2026-09-11.md";
const base = process.env.DOCS_BASE || "origin/main";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
const mergeBase = git("merge-base", base, "HEAD").trim();
// merge-base 와 작업 트리를 비교 — 커밋 전에도 같은 결과(로컬 빨강/초록 확인용).
const diff = git("diff", "--unified=0", mergeBase, "--", ...DOCS);

let failed = false;
const report = (title, items) => {
  console.log(`${items.length ? "✗" : "✓"} ${title}${items.length ? ` — ${items.length}건` : ""}`);
  for (const i of items) console.log(`    ${i}`);
  if (items.length) failed = true;
};

report(
  "금지 낱말 (바뀐 줄)",
  findForbidden(addedLines(diff)).map((h) => `${h.file}: "${h.word}" ← ${h.text.trim().slice(0, 80)}`),
);

const allow = JSON.parse(readFileSync("scripts/docs-link-allowlist.json", "utf8"));
const allowPaths = allow.map((a) => a.path);
const broken = [];
for (const f of DOCS) {
  for (const p of missingPaths(extractPaths(withoutChangelogRows(readFileSync(f, "utf8"))), existsSync, allowPaths))
    broken.push(`${f}: ${p}`);
}
report("링크 깨짐 (marketing/ · docs/ · lib/)", broken);

report("Stale-Doc 대조", [
  ...staleChecks(readFileSync("CLAUDE.md", "utf8"), readFileSync(LEDGER, "utf8")),
  ...languageChecks(readFileSync("LANGUAGE.md", "utf8")),
]);

process.exit(failed ? 1 : 0);
