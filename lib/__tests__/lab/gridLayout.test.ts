/**
 * LAB-UX-1 Phase A — 그리드 열 수는 상수 하나에서 나온다.
 *
 * 48/6/8을 컴포넌트에 손으로 적으면 규모가 바뀔 때 그리드와 카운터가 갈라진다
 * (R5 — 48 리터럴 금지와 같은 이유).
 */
import { describe, expect, it } from "vitest";
import { GRID_COLUMNS, gridRows } from "@/lib/lab/gridLayout";
import { TOTAL_CONTESTANTS } from "@/lib/types/tournament";

describe("gridLayout", () => {
  it("48칸은 8열 × 6행으로 깔린다 (대표 확정 2026-08-23)", () => {
    expect(GRID_COLUMNS).toBe(8);
    expect(gridRows(TOTAL_CONTESTANTS)).toBe(6);
  });

  it("나누어떨어지지 않는 규모는 마지막 행을 올림한다", () => {
    expect(gridRows(1)).toBe(1);
    expect(gridRows(GRID_COLUMNS + 1)).toBe(2);
  });

  it("0칸은 0행", () => {
    expect(gridRows(0)).toBe(0);
  });
});
