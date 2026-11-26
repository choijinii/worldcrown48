/**
 * 관리자 다시 세기 요청 스크립트 — 실서비스에 대고 돌리는 도구라서, 쓰는 곳은
 * `ranking_recount_requests/{tid}` 의 `.set(` 한 곳뿐이어야 한다(소스 글자로 확인).
 * 누적 · job · 캐시 · 기록을 직접 고치는 길이 생기면 막는다 — 고치는 것은 다음 발표의 다시 세기 몫이다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = readFileSync(join(__dirname, "../../scripts/request-ranking-recount.mjs"), "utf8");
const count = (word: string) => SRC.split(word).length - 1;

describe("request-ranking-recount.mjs 쓰기는 요청 문서 하나뿐", () => {
  const FORBIDDEN = [".update(", ".delete(", ".add(", "batch(", "runTransaction", "bulkWriter", "recursiveDelete", ".create("];
  for (const word of FORBIDDEN) {
    it(`소스에 ${word} 0건`, () => {
      expect(count(word)).toBe(0);
    });
  }

  it(".set( 은 한 번 · 요청 모음(REQUESTS)의 문서에만", () => {
    expect(count(".set(")).toBe(1);
    expect(SRC).toMatch(/\.collection\(REQUESTS\)\s*\.doc\([^)]*\)\s*\.set\(/);
  });

  it('요청 모양 = {tournamentId, reason:"admin", requestedAt: 서버 시각}', () => {
    expect(SRC).toContain('reason: "admin"');
    expect(SRC).toContain("FieldValue.serverTimestamp()");
  });

  it("요청 모음 이름 · 창 시작은 빌드 결과에서 가져온다(크론과 같은 쿼리)", () => {
    expect(SRC).toContain("../lib/core/rankingAccumStore.js");
    expect(SRC).toContain("../lib/core/rankingWindow.js");
    expect(SRC).toContain('where("tournamentDeadline", ">"');
  });

  it("기본은 dry-run — 쓰기는 --apply 뒤에만 · --project 필수 · 대상은 --tournament 또는 --all-in-window", () => {
    for (const flag of ['"--apply"', '"--project"', '"--tournament"', '"--all-in-window"']) {
      expect(SRC).toContain(flag);
    }
    const setAt = SRC.indexOf(".set(");
    expect(SRC.lastIndexOf("if (!apply)", setAt)).toBeGreaterThan(-1);
  });
});
