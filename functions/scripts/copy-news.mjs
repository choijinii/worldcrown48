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

for (const file of ["articleDoc.ts"]) {
  copyFileSync(join(libNews, file), join(dest, file));
}

console.log("[copy-news] mirrored lib/news/{articleDoc} → functions/src/_news");
