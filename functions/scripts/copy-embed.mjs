/**
 * copy-embed — mirror the pure `lib/embed` contract into the functions build tree
 * so the검수기 callable·크론이 클라이언트와 **같은 규칙**으로 판정하게 만든다
 * (LAB-EV-1 §3, copy-news / copy-ranking / copy-crown과 같은 단일 소스 패턴).
 *
 * Functions use a separate tsconfig (`rootDir: src`) and cannot import the repo-
 * root `lib/`, so the import-free `lib/embed/*.ts` files are copied into
 * `functions/src/_embed/` at build time. The copy is git-ignored and regenerated
 * by `npm run build` (predeploy) — single source of truth: `lib/embed`.
 *
 * 여기 복사되는 파일은 절대 `@/` 경로나 브라우저 API를 import하지 않아야 한다.
 */
import { mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)); // functions/scripts
const root = join(here, "..", "..");                  // repo root
const libEmbed = join(root, "lib", "embed");
const dest = join(here, "..", "src", "_embed");

mkdirSync(dest, { recursive: true });

const files = [
  "constants.ts",
  "youtubeUrl.ts",
  "timestamps.ts",
  "parseBatch.ts",
  "killingPart.ts",
  "loopRange.ts",
  "verdict.ts",
];

/**
 * LAB-EV-2 — 자동 소싱 코어는 `lib/embed/sourcing/`에 있고(R3 "새 로직은 여기에"),
 * 상대 경로로 상위의 constants·killingPart·verdict를 참조한다. 그 구조를 그대로
 * 미러링해야 functions 쪽에서도 `../constants`가 맞는다.
 */
const sourcingFiles = ["types.ts", "quota.ts", "searchQuery.ts", "relevance.ts", "pipeline.ts"];

for (const file of files) {
  copyFileSync(join(libEmbed, file), join(dest, file));
}

mkdirSync(join(dest, "sourcing"), { recursive: true });
for (const file of sourcingFiles) {
  copyFileSync(join(libEmbed, "sourcing", file), join(dest, "sourcing", file));
}

console.log(
  `[copy-embed] mirrored lib/embed/{${files.length} files} + sourcing/{${sourcingFiles.length} files}` +
    ` → functions/src/_embed`,
);
