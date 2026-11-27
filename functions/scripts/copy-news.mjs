/**
 * copy-news — mirror the pure `news` article contract into the functions build
 * tree so the callable/triggers/cron construct the SAME draft docs (and lean on
 * the SAME "no auto-publish" invariant) as the client without duplicating them
 * (ND-1 §3 #1, same single-source pattern as copy-ranking / copy-crown).
 *
 * Functions use a separate tsconfig (`rootDir: src`) and cannot import the repo-
 * root `lib/`, so we copy the import-free `lib/news/articleDoc.ts` into
 * `functions/src/_news/` at build time. The copy is git-ignored and regenerated
 * by `npm run build` (predeploy) — single source of truth: `lib/news`.
 */
import { mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)); // functions/scripts
const root = join(here, "..", "..");                  // repo root
const libNews = join(root, "lib", "news");
const dest = join(here, "..", "src", "_news");

mkdirSync(dest, { recursive: true });

for (const file of ["articleDoc.ts", "articleViews.ts"]) {
  copyFileSync(join(libNews, file), join(dest, file));
}

// NEWS-0a — 시험 대회 판정 하나(isTestTournament). 공개 목록과 뉴스 초안 신호가 같은 파일을 쓴다(import 없는 순수 TS).
copyFileSync(join(root, "lib", "ops", "e2eLeftovers.ts"), join(dest, "e2eLeftovers.ts"));

console.log("[copy-news] mirrored lib/news/{articleDoc,articleViews} + lib/ops/e2eLeftovers → functions/src/_news");
