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

/**
 * LAB-FIX-3 §3-6 — 펼친 목록이 창 안에 들어온다. 원인(2026-11-13 재현): 목록 상자와 줄 목록이 격자(grid)인데
 * 격자 칸의 최소 너비 기본값이 "내용 너비"라, 제목이 긴 초안이 있으면 칸이 제목 길이만큼 늘어나 [열기]가 상자
 * 오른쪽 밖(= 창 밖)으로 밀렸다. 칸을 minmax(0, 1fr) 로 묶어 제목이 "…"로 잘리게 하고, 상자 폭은 창 폭을 넘지 않게 한다.
 */
import { DRAFT_MENU_LIST_STYLE, DRAFT_MENU_STYLE } from "@/components/admin/lab/DraftMenu";

describe("초안 목록 펼침 — 창 안에", () => {
  it("상자·줄 목록 격자 칸은 minmax(0, 1fr) — 긴 제목이 칸을 넓히지 못한다", () => {
    expect(DRAFT_MENU_STYLE.gridTemplateColumns).toBe("minmax(0, 1fr)");
    expect(DRAFT_MENU_LIST_STYLE.gridTemplateColumns).toBe("minmax(0, 1fr)");
  });
  it("상자 폭은 창 폭 - 32px 를 넘지 않는다", () => {
    expect(DRAFT_MENU_STYLE.maxWidth).toBe("calc(100vw - 32px)");
  });
});
