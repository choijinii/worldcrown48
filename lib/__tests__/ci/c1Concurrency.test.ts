/**
 * COOKIE-1 검수 3 — C-1 E2E 는 같은 브랜치에서 동시에 돌지 않는다.
 *
 * 잡으려는 사고(2026-10-05 PR #117): 연달아 push 하자 c1-e2e 두 실행이 동시에 돌며 같은 테스트
 * 계정·같은 시드 대회(arena1-e2e-tournament)를 서로 지우고 다시 만들어 무대 로딩 실패·포스터
 * 없음 등이 제각각 났다. 같은 ref 의 앞선 실행은 취소한다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const yml = readFileSync(path.join(ROOT, ".github/workflows/c1-e2e.yml"), "utf8");

describe("c1-e2e.yml concurrency", () => {
  it("최상위 concurrency — 같은 ref 는 한 줄로, 앞선 실행은 취소", () => {
    const block = yml.match(/^concurrency:\n((?:[ \t]+.*\n)+)/m)?.[1] ?? "";
    expect(block).toMatch(/^\s+group:\s*c1-e2e-\$\{\{\s*github\.ref\s*\}\}\s*$/m);
    expect(block).toMatch(/^\s+cancel-in-progress:\s*true\s*$/m);
  });
});
