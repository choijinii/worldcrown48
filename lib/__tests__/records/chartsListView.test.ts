/**
 * NAV-1 검수 반영 — 읽기 실패 때 /records 가 "아직 끝난 대회가 없어요"라고 거짓말하지 않는다.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChartsList } from "@/components/records/ChartsList";

const row = { id: "t1", title: "T1", titleI18n: null, chip: "K-POP", champion: null };

describe("ChartsList", () => {
  it("읽기 실패 = 묶음·빈 상태 문장을 그리지 않는다", () => {
    const html = renderToStaticMarkup(createElement(ChartsList, { data: { active: [], ended: [], failed: true } }));
    expect(html).not.toContain('data-testid="records-empty"');
    expect(html).not.toContain('data-testid="records-ended"');
  });

  it("정상 · 끝난 대회 0 = 빈 상태 한 줄", () => {
    const html = renderToStaticMarkup(createElement(ChartsList, { data: { active: [row], ended: [], failed: false } }));
    expect(html).toContain('data-testid="records-empty"');
    expect(html).toContain('href="/arena/t1/ranking"');
  });
});
