/**
 * LAB-FIX-2 §3-5 — 편집 중 [초안 목록] 펼치기 목록의 줄. 지금 초안 줄은 표시만 하고 [열기]를 끈다.
 */
import { describe, expect, it } from "vitest";
import { draftMenuRows } from "@/lib/lab/tournamentDraft";

const list = [
  { id: "a", title: "런칭 대회 ①", updatedAtMs: 10 },
  { id: "b", title: "런칭 대회 ②", updatedAtMs: 30 },
  { id: "c", title: "", updatedAtMs: 20 },
];

describe("draftMenuRows", () => {
  it("최근 저장 순 · 지금 초안은 current", () => {
    expect(draftMenuRows(list, "c").map((r) => [r.id, r.current])).toEqual([
      ["b", false],
      ["c", true],
      ["a", false],
    ]);
  });
  it("지금 초안이 아직 저장 전(id 없음)이면 모두 열 수 있다", () => {
    expect(draftMenuRows(list, null).every((r) => !r.current)).toBe(true);
  });
  it("입력 목록을 바꾸지 않는다", () => {
    draftMenuRows(list, "a");
    expect(list.map((d) => d.id)).toEqual(["a", "b", "c"]);
  });
});
