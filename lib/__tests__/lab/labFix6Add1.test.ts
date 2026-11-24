/**
 * LAB-FIX-6 추가 지시 1(대표 눈검사 2026-11-24) — 부품 단위 시험.
 *   · "선택" 표시 = "필수"와 같은 금색 토큰(lab.gold) — 새 색 없음
 *   · 설명 빈칸 안내 글 = "설명" 칸 제목의 "필수" 바로 옆 · 비었을 때만(공백만도 빈 것)
 *   · 통합: 안내 글이 보이는 때 = [다음 →]이 꺼지는 때(isStep1NextReady)
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FieldTag } from "@/components/admin/lab/FieldTag";
import { DescriptionInput } from "@/components/admin/lab/DescriptionInput";
import { lab } from "@/components/admin/lab/theme";
import { isStep1NextReady } from "@/lib/lab/step1Ready";

const colorOf = (html: string) => /color:\s*([^;"]+)/.exec(html)?.[1]?.trim();

describe("FieldTag — 선택도 필수와 같은 금색", () => {
  it("선택 = lab.gold", () => {
    const html = renderToStaticMarkup(createElement(FieldTag, { kind: "optional", children: "Optional" }));
    expect(colorOf(html)).toBe(lab.gold);
  });
  it("필수와 같은 값(새 색을 만들지 않는다)", () => {
    const opt = renderToStaticMarkup(createElement(FieldTag, { kind: "optional", children: "a" }));
    const req = renderToStaticMarkup(createElement(FieldTag, { kind: "required", children: "a" }));
    expect(colorOf(opt)).toBe(colorOf(req));
    expect(opt).not.toContain("crimson");
  });
});

const render = (value: string) =>
  renderToStaticMarkup(createElement(DescriptionInput, { value, onChange: () => {} }));

describe("DescriptionInput — 빈칸 안내 글 자리", () => {
  it("비면 안내 글이 '필수' 바로 뒤, 입력 칸보다 앞(제목 줄 안)에 있다", () => {
    const html = render("");
    const tag = html.indexOf('data-testid="lab-field-tag-required"');
    const missing = html.indexOf('data-testid="lab-description-missing"');
    const textarea = html.indexOf("<textarea");
    expect(tag).toBeGreaterThan(-1);
    expect(missing).toBeGreaterThan(tag);
    expect(missing).toBeLessThan(textarea);
    expect(html).toContain("Please write a description.");
  });
  it("공백만 있으면 빈 것으로 본다", () => {
    expect(render("   ")).toContain('data-testid="lab-description-missing"');
  });
  it("한 글자라도 적으면 사라진다", () => {
    expect(render("a")).not.toContain('data-testid="lab-description-missing"');
  });
});

describe("통합 — 안내 글이 보이는 때 = [다음 →]이 꺼지는 때", () => {
  const base = {
    title: "Best K-POP Idols",
    category: "KPOP",
    keywords: ["idol"],
    deadlineMs: Date.now() + 7 * 86_400_000,
    validCategoryIds: ["KPOP"],
    nowMs: Date.now(),
  };
  for (const description of ["", "   ", "a", "2026년에 사랑받은 노래"]) {
    it(`설명 ${JSON.stringify(description)}`, () => {
      const shown = render(description).includes('data-testid="lab-description-missing"');
      expect(shown).toBe(!isStep1NextReady({ ...base, description }));
    });
  }
});
