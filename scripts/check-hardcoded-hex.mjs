#!/usr/bin/env node
/**
 * check-hardcoded-hex.mjs — re-entry guard for hardcoded colours (TOK-1, W4).
 *
 * Components must reference tokens (`var(--color-…)`), never raw hex. This
 * walks the repo, reports every hex literal outside `app/globals.css`, and
 * exits non-zero so CI blocks the regression.
 *
 * Usage:
 *   node scripts/check-hardcoded-hex.mjs            # fail on any violation
 *   node scripts/check-hardcoded-hex.mjs --json     # machine-readable output
 *   node scripts/check-hardcoded-hex.mjs --summary  # counts only (baseline snapshots)
 *
 * Exceptions live in `scripts/hex-allowlist.json`, file+colour specific, each
 * with a reason (ADR-TOK-3 — third-party brand palettes are not tokenised).
 *
 * Detection / exclusion / allowlist logic is in check-hardcoded-hex.lib.mjs
 * and unit-tested in lib/__tests__/hexGuard.test.ts.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  filterAllowlisted,
  findUnusedAllowlist,
  formatReport,
  isScannedPath,
  scanContent,
} from "./check-hardcoded-hex.lib.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWLIST_PATH = path.join(REPO_ROOT, "scripts", "hex-allowlist.json");

/** Directories never worth descending into (cheaper than filtering per file). */
const SKIP_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  "coverage",
  "playwright-report",
  "test-results",
  "docs",
  "public",
  "outputs",
]);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(abs, acc);
      continue;
    }
    const rel = path.relative(REPO_ROOT, abs).split(path.sep).join("/");
    if (isScannedPath(rel)) acc.push(rel);
  }
  return acc;
}

function loadAllowlist() {
  try {
    return JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return { entries: [] };
    throw new Error(`hex-allowlist.json is not valid JSON: ${err.message}`);
  }
}

const args = new Set(process.argv.slice(2));
const allowlist = loadAllowlist();
const files = walk(REPO_ROOT);
const all = files.flatMap((rel) =>
  scanContent(rel, readFileSync(path.join(REPO_ROOT, rel), "utf8")),
);
const violations = filterAllowlisted(all, allowlist);
const unused = findUnusedAllowlist(all, allowlist);

if (args.has("--json")) {
  console.log(
    JSON.stringify({ scanned: files.length, violations, unused }, null, 2),
  );
} else if (args.has("--summary")) {
  const fileCount = new Set(violations.map((v) => v.file)).size;
  console.log(
    `scanned ${files.length} files · ${violations.length} violations in ${fileCount} files · ${all.length - violations.length} allowlisted`,
  );
} else if (violations.length > 0) {
  console.error(formatReport(violations));
  console.error(
    `\n✗ ${violations.length} hardcoded hex colour(s) in ${new Set(violations.map((v) => v.file)).size} file(s).`,
  );
  console.error(
    "  Use a token from app/globals.css: var(--color-…). Third-party brand",
  );
  console.error(
    "  colours belong in scripts/hex-allowlist.json with a reason (ADR-TOK-3).",
  );
} else {
  console.log(`✓ no hardcoded hex colours (scanned ${files.length} files)`);
}

if (unused.length > 0 && !args.has("--json")) {
  console.error(
    `\n✗ ${unused.length} stale allowlist entr(ies) — they match nothing any more:`,
  );
  for (const e of unused) console.error(`  ${e.file}  ${e.hex}  (${e.reason})`);
  console.error("  Delete them from scripts/hex-allowlist.json.");
}

const failed = violations.length > 0 || unused.length > 0;
process.exit(failed && !args.has("--json") && !args.has("--summary") ? 1 : 0);
