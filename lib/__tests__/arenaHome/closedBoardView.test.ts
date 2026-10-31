/**
 * ARENA-2 PR 1 — 마감 대회 게시판 그리기 (정본 D-5 · 원장 D-37 · D-68).
 *
 * "마감 대회가 하나도 없을 때"는 미리보기 DB 에 다른 마감 대회가 섞여 있어 E2E 로 만들 수 없다 —
 * 여기서 지킨다. 읽기 실패 때 "없어요"라고 거짓말하지 않는 것도.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ClosedBoard } from "@/components/arenaHome/ClosedBoard";
import type { ClosedRow } from "@/lib/arenaHome/arenaHome";

const base = {
  query: "",
  categories: [],
  onPage: () => {},
  activeAnchor: "arena-active",
};
const empty = { rows: [], total: 0, page: 1, pageCount: 1 };

const row = (id: string, champion: ClosedRow["champion"]): ClosedRow => ({
  t: {
    id,
    title: `제목 ${id}`,
    titleI18n: null,
    description: null,
    category: "KPOP",
    featured: false,
    createdAtMs: null,
    deadlineMs: Date.parse("2026-10-20T21:00:00+09:00"),
  },
  champion,
});

const render = (props: Partial<Parameters<typeof ClosedBoard>[0]>) =>
  renderToStaticMarkup(createElement(ClosedBoard, { ...base, board: empty, hasAnyClosed: false, failed: false, ...props }));

describe("ClosedBoard", () => {
  it("마감 대회가 하나도 없음 = 빈 상태(정본 D-5) + 진행 중 대회로 가는 버튼 · 쪽 넘김 없음", () => {
    const html = render({});
    expect(html).toContain('data-testid="arena-closed-empty"');
    expect(html).toContain('href="#arena-active"');
    expect(html).not.toContain('data-testid="arena-closed-pager"');
  });

  it("읽기 실패 = 빈 상태 문장을 그리지 않는다", () => {
    const html = render({ failed: true });
    expect(html).not.toContain('data-testid="arena-closed-empty"');
    expect(html).not.toContain('data-testid="arena-closed-noresult"');
  });

  it("검색 결과 없음 = 한 줄 안내", () => {
    const html = render({ hasAnyClosed: true, query: "zz" });
    expect(html).toContain('data-testid="arena-closed-noresult"');
    expect(html).not.toContain('data-testid="arena-closed-empty"');
  });

  it("줄 = 차트로 가는 링크 · 버튼 글자 '랭킹 보기'(D-68) · 챔피언 이름", () => {
    const html = render({
      hasAnyClosed: true,
      board: { rows: [row("a", { name: "에스파" }), row("b", { name: "트와이스" })], total: 2, page: 1, pageCount: 1 },
    });
    expect(html).toContain('href="/arena/a/ranking"');
    expect(html).toContain('href="/arena/b/ranking"');
    expect(html.match(/View ranking/g)?.length).toBe(2); // 맨 렌더의 기본 언어 = en
    expect(html).toContain("에스파");
    expect(html).toContain("트와이스");
    expect(html).not.toContain("Too few picks"); // '미정' 글자 없음(D-72)
    expect(html).toContain("10.20 21:00");
  });

  it("두 쪽 이상이면 쪽 넘김", () => {
    const html = render({
      hasAnyClosed: true,
      board: { rows: [row("a", { name: "에스파" })], total: 11, page: 2, pageCount: 2 },
    });
    expect(html).toContain('data-testid="arena-closed-pager"');
    expect(html).toContain('aria-current="page"');
  });
});
