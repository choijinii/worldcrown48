/**
 * assign-founding-rank — 옛 사전등록 문서 번호 매기기 계획 (PRE-REG-1).
 *
 * 옛 화면은 번호 없이 `waitlist` 에 썼다. 이 계획은 번호 없는 문서를 **등록 시각 순서대로**
 * 이어서 번호를 매기고, 그 결과 "등록 순서 = 번호 순서" 가 깨지는 곳이 있으면 숨기지 않고
 * 문제로 보고한다. 운영 문서를 고치는 되돌리기 어려운 작업이라 dry-run 출력이 곧 계획이다.
 */
import { describe, expect, it } from "vitest";
import {
  maskEmail,
  planFoundingRanks,
  rankOrderProblems,
} from "../../scripts/assign-founding-rank.lib.mjs";

const T = (min: number) => Date.UTC(2026, 9, 1, 0, min);

describe("planFoundingRanks — 번호 없는 문서를 등록 시각 순서대로", () => {
  it("옛 문서뿐이면 1부터 등록 시각 순서대로 매긴다(같은 시각은 문서 ID 순)", () => {
    const plan = planFoundingRanks(
      [
        { id: "c", createdAtMs: T(3), rank: null },
        { id: "a", createdAtMs: T(1), rank: null },
        { id: "b2", createdAtMs: T(2), rank: null },
        { id: "b1", createdAtMs: T(2), rank: null },
      ],
      null,
    );
    expect(plan.assignments).toEqual([
      { id: "a", rank: 1 },
      { id: "b1", rank: 2 },
      { id: "b2", rank: 3 },
      { id: "c", rank: 4 },
    ]);
    expect(plan.lastRank).toBe(4);
    expect(plan.problems).toEqual([]);
  });

  it("이미 번호가 있는 문서는 건드리지 않고, 봉인한 마지막 번호 다음부터 이어 간다", () => {
    const plan = planFoundingRanks(
      [
        { id: "old1", createdAtMs: T(1), rank: 1 },
        { id: "old2", createdAtMs: T(2), rank: 2 },
        { id: "late", createdAtMs: T(9), rank: null },
      ],
      2,
    );
    expect(plan.assignments).toEqual([{ id: "late", rank: 3 }]);
    expect(plan.lastRank).toBe(3);
    expect(plan.problems).toEqual([]);
  });

  it("할 일이 없으면 빈 계획 — 다시 돌려도 안전하다", () => {
    const plan = planFoundingRanks([{ id: "x", createdAtMs: T(1), rank: 1 }], 1);
    expect(plan.assignments).toEqual([]);
    expect(plan.lastRank).toBe(1);
  });

  it("번호 없는 문서가 번호 있는 문서보다 먼저 등록됐으면 순서 깨짐을 보고한다", () => {
    const plan = planFoundingRanks(
      [
        { id: "ranked", createdAtMs: T(5), rank: 1 },
        { id: "straggler", createdAtMs: T(4), rank: null },
      ],
      1,
    );
    expect(plan.assignments).toEqual([{ id: "straggler", rank: 2 }]);
    expect(plan.problems.join("\n")).toMatch(/straggler/);
  });

  it("등록 시각이 없는 문서는 맨 뒤에 두고 보고한다", () => {
    const plan = planFoundingRanks(
      [
        { id: "nots", createdAtMs: null, rank: null },
        { id: "a", createdAtMs: T(1), rank: null },
      ],
      null,
    );
    expect(plan.assignments.map((a) => a.id)).toEqual(["a", "nots"]);
    expect(plan.problems.join("\n")).toMatch(/nots/);
  });

  it("봉인 기록보다 큰 번호가 이미 있으면 그 다음부터 — 중복 번호를 만들지 않는다", () => {
    const plan = planFoundingRanks(
      [
        { id: "r3", createdAtMs: T(1), rank: 3 },
        { id: "new", createdAtMs: T(2), rank: null },
      ],
      2,
    );
    expect(plan.assignments).toEqual([{ id: "new", rank: 4 }]);
  });
});

describe("rankOrderProblems — 번호 전체 점검", () => {
  it("1~n 빈틈·중복 없고 등록 시각 순서와 같으면 문제 없음", () => {
    expect(
      rankOrderProblems([
        { id: "a", createdAtMs: T(1), rank: 1 },
        { id: "b", createdAtMs: T(2), rank: 2 },
      ]),
    ).toEqual([]);
  });
  it("빈틈 · 중복 · 순서 뒤집힘 · 번호 없음을 각각 보고한다", () => {
    const problems = rankOrderProblems([
      { id: "a", createdAtMs: T(1), rank: 1 },
      { id: "b", createdAtMs: T(2), rank: 3 },
      { id: "c", createdAtMs: T(0), rank: 4 },
      { id: "d", createdAtMs: T(5), rank: 4 },
      { id: "e", createdAtMs: T(6), rank: null },
    ]).join("\n");
    expect(problems).toMatch(/빈틈.*2/);
    expect(problems).toMatch(/중복.*4/);
    expect(problems).toMatch(/순서.*c/);
    expect(problems).toMatch(/번호 없음.*e/);
  });
});

describe("maskEmail — 출력에 메일 원문을 남기지 않는다", () => {
  it("앞 한 글자와 도메인만", () => {
    expect(maskEmail("fan@example.com")).toBe("f***@example.com");
    expect(maskEmail("a@b.co")).toBe("a***@b.co");
    expect(maskEmail("broken")).toBe("***");
  });
});
