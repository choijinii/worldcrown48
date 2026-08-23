/**
 * LAB-UX-1 Phase B — STEP 2 헤더 한 줄의 숫자.
 *
 * "손볼 칸"의 정의가 화면의 약속이라 여기서 잠근다. 특히 소싱을 **아직 돌리지
 * 않은** 칸을 세면 이미지 경로에서 48칸 전부가 손볼 칸이 되어 숫자가 무의미해진다.
 */
import { describe, expect, it } from "vitest";
import { step2Counters } from "@/lib/lab/step2Counters";
import type { SourcingStates } from "@/lib/lab/sourcingDraft";
import type { ReviewFlags } from "@/lib/lab/reviewFlags";

const TOTAL = 4;

function names(...values: string[]): { name: string }[] {
  return values.map((name) => ({ name }));
}

describe("step2Counters", () => {
  it("이름이 있는 칸만 채움으로 센다", () => {
    const c = step2Counters(names("지수", "  ", "윈터", ""), {}, {}, TOTAL);
    expect(c.filled).toBe(2);
    expect(c.total).toBe(TOTAL);
  });

  it("소싱을 안 돌렸으면 손볼 칸은 0 — 이미지 경로가 전부 빨개지지 않는다", () => {
    const c = step2Counters(names("지수", "윈터", "설윤", "유나"), {}, {}, TOTAL);
    expect(c.suggested).toBe(0);
    expect(c.todo).toBe(0);
  });

  it("제안으로 끝나지 않은 칸만 손볼 칸이다", () => {
    const states: SourcingStates = {
      0: { status: "suggested" },
      1: { status: "manual", reason: "no-results" },
      2: { status: "unknown-person" },
    };
    const c = step2Counters(names("지수", "윈터", "설윤", "유나"), states, {}, TOTAL);
    expect(c.suggested).toBe(1);
    expect(c.todo).toBe(2);
  });

  it("검수 배지가 붙은 칸도 손볼 칸이다 — 제안이 떠 있어도", () => {
    const states: SourcingStates = { 0: { status: "suggested" } };
    const flags: ReviewFlags = {
      0: [{ kind: "duplicate-suspect", pairedIndexes: [2], suggestedNameTokens: [] }],
    };
    const c = step2Counters(names("설윤", "윈터", "설윤", ""), states, flags, TOTAL);
    expect(c.suggested).toBe(1);
    expect(c.todo).toBe(1);
  });

  it("한 칸에 두 이유가 겹쳐도 한 번만 센다", () => {
    const states: SourcingStates = { 0: { status: "manual", reason: "no-results" } };
    const flags: ReviewFlags = {
      0: [{ kind: "name-hint-mismatch", pairedIndexes: [], suggestedNameTokens: ["yunjin"] }],
    };
    const c = step2Counters(names("김채원", "", "", ""), states, flags, TOTAL);
    expect(c.todo).toBe(1);
  });

  it("빈 칸에 남은 배지는 세지 않는다 — 이름이 없으면 손볼 인물도 없다", () => {
    const states: SourcingStates = { 3: { status: "manual", reason: "no-results" } };
    const c = step2Counters(names("지수", "", "", ""), states, {}, TOTAL);
    expect(c.filled).toBe(1);
    expect(c.todo).toBe(0);
  });
});
