/**
 * 관리자 비교 스크립트는 아무것도 쓰지 않는다 — 실서비스에 대고 돌리는 도구라서,
 * 쓰기 호출이 소스에 한 줄이라도 있으면 막는다(소스 글자로 확인).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = readFileSync(join(__dirname, "../../scripts/compare-ranking-accum.mjs"), "utf8");

describe("compare-ranking-accum.mjs 읽기 전용", () => {
  const FORBIDDEN = [".set(", ".update(", ".delete(", ".add(", "batch(", "runTransaction", "bulkWriter", "recursiveDelete"];
  for (const word of FORBIDDEN) {
    it(`소스에 ${word} 0건`, () => {
      expect(SRC.split(word).length - 1).toBe(0);
    });
  }
  it("누적 · 전량 비교 도구를 빌드 결과에서 가져온다", () => {
    expect(SRC).toContain("../lib/core/rankingAccumStore.js");
    expect(SRC).toContain("../lib/core/incrementalTally.js");
  });
});
