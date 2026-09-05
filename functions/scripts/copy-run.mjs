/**
 * copy-run — 판(Run) 판정의 순수 모듈 `lib/run` 을 functions 빌드 트리로 미러링한다.
 *
 * 핸드오프 §9 함정 5: 클라이언트 게이트와 서버 onVote의 판정이 어긋나면 P0다.
 * 같은 테스트로 묶는 것보다 **같은 코드를 실행**하는 것이 강하고, 그 관례가 이미 리포에 있다
 * (copy-crown / copy-ranking / copy-news / copy-embed).
 *
 * functions는 별도 tsconfig(`rootDir: src`)라 리포 루트의 `lib/` 를 import할 수 없다 →
 * import 없는 `lib/run/*.ts` 를 빌드 시 `functions/src/_run/` 으로 복사한다. 복사본은 git-ignore.
 * 단일 진실 공급원 = `lib/run`.
 *
 * 여기 복사되는 파일은 절대 `@/` 경로나 브라우저 API를 import하지 않아야 한다.
 */
import { mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)); // functions/scripts
const root = join(here, "..", "..");                  // repo root
const libRun = join(root, "lib", "run");
const dest = join(here, "..", "src", "_run");

mkdirSync(dest, { recursive: true });

const files = ["kstReset.ts", "runDocId.ts", "decideRun.ts", "guestRun.ts"];

for (const f of files) {
  copyFileSync(join(libRun, f), join(dest, f));
}
console.log(`[copy-run] ${files.length} files → functions/src/_run/`);
