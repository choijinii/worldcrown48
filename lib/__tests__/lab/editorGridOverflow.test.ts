/**
 * EDITOR-GRID-FIX 통합 — 48칸 판 전체를 그려(긴 영상 제목 칸 1개 + 짧은 칸 47개) 넘침을
 * 막는 세 장치가 실제 화면 코드에 걸려 있는지 본다.
 *   ① 그리드 열 = minmax(0, 1fr) — 칸 너비가 내용 때문에 늘지 않는다
 *   ② 제목 줄 = 블록 — 인라인이면 "…" 잘림이 작동하지 않는다
 *   ③ 칸 루트 = min-width 0 — 다른 긴 글자(소속·출처 도메인)로 같은 고장이 다시 생기지 않게
 * 실제 픽셀 넘침은 E2E(e2e/editor-fix1-draft.spec.ts)가 1440 창에서 잰다.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContestantGrid } from "@/components/admin/lab/ContestantGrid";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

const LONG_TITLE = "아주긴영상제목".repeat(30).slice(0, 200);
const contestants: ContestantDraft[] = Array.from({ length: 48 }, (_, i) => ({
  name: `엔트리 ${i + 1}`,
  nationality: "KR",
  affiliation: "E2E",
  imageSearchKeyword: "",
  videoId: "dQw4w9WgXcQ",
  videoTitle: i === 0 ? LONG_TITLE : "짧은 제목",
  videoChannel: "채널",
}));
const html = renderToStaticMarkup(createElement(ContestantGrid, { contestants, onChange: () => {} }));

function styleOf(testId: string): string {
  const m = html.match(new RegExp(`data-testid="${testId}"[^>]*style="([^"]*)"`));
  if (!m) throw new Error(`${testId} 의 style 을 못 찾음`);
  return m[1];
}

describe("편집기 48칸 판 — 긴 영상 제목 칸 넘침 막기", () => {
  it("① 그리드 열은 repeat(8, minmax(0, 1fr))", () => {
    expect(styleOf("contestant-grid")).toContain("grid-template-columns:repeat(8, minmax(0, 1fr))");
  });

  it("② 200자 제목 줄은 블록 + 한 줄 잘림, 전체 제목은 title 속성에", () => {
    const s = styleOf("slot-meta-0");
    expect(s).toContain("display:block");
    expect(s).toContain("white-space:nowrap");
    expect(s).toContain("overflow:hidden");
    expect(s).toContain("text-overflow:ellipsis");
    expect(html).toContain(`title="${LONG_TITLE} · 채널"`);
  });

  it("③ 칸 48개 루트 모두 min-width:0", () => {
    for (let i = 0; i < 48; i++) {
      expect(styleOf(`contestant-node-${i}`), `칸 ${i}`).toMatch(/(^|;)min-width:0(;|$)/);
    }
  });
});
