/**
 * IMAGE-1 PR 1 (마티오 메모 · D-77 보충) — [만들기 매뉴얼] 창 · [토너먼트 생성] 확인창.
 * 서버 렌더로 처음 모양을 본다: 체크 전 [발행하기] 꺼짐 · 불일치 칸 번호는 누르는 버튼 · 승인 문구.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MakingManualDialog } from "@/components/admin/lab/MakingManualDialog";
import { PublishConfirmDialog } from "@/components/admin/lab/PublishConfirmDialog";
import { resolveMessage } from "@/lib/i18n/messages";

const noop = () => {};
// 공급자 없이 그리면 화면 언어는 영어다(lib/i18n.tsx 기본값).
const ko = (k: Parameters<typeof resolveMessage>[1]) => resolveMessage("en", k);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#x27;");

describe("MakingManualDialog", () => {
  it("열리면 제목 · 순서 5줄 · 꼭 지킬 것 7줄", () => {
    const html = renderToStaticMarkup(createElement(MakingManualDialog, { open: true, onClose: noop }));
    expect(html).toContain('data-testid="making-manual"');
    expect(html).toContain(esc(ko("lab.manual.title")));
    for (let i = 1; i <= 5; i++) expect(html).toContain(esc(ko(`lab.manual.step${i}` as never)));
    expect(html).toContain(esc(ko("lab.manual.mustTitle")));
    for (let i = 1; i <= 7; i++) expect(html).toContain(esc(ko(`lab.manual.must${i}` as never)));
  });
  it("닫혀 있으면 아무것도 없다", () => {
    expect(renderToStaticMarkup(createElement(MakingManualDialog, { open: false, onClose: noop }))).toBe("");
  });
});

describe("PublishConfirmDialog", () => {
  const props = { open: true, mismatch: [2, 9], onGoTo: noop, onBack: noop, onPublish: noop, onManual: noop };
  it("체크 3칸 · 체크 전 [발행하기] 꺼짐 · 돌아가기 · 매뉴얼 다시 보기", () => {
    const html = renderToStaticMarkup(createElement(PublishConfirmDialog, props));
    expect(html).toContain(esc(ko("lab.confirm.title")));
    expect((html.match(/type="checkbox"/g) ?? []).length).toBe(3);
    const publishTag = html.match(/<button[^>]*data-testid="confirm-publish"[^>]*>/)?.[0] ?? "";
    expect(publishTag).toContain('disabled=""');
    expect(html).toContain(esc(ko("lab.confirm.back")));
    expect(html).toContain(esc(ko("lab.confirm.manualAgain")));
  });
  it("불일치 칸 번호(1부터)는 누르는 버튼 · 개수는 경고 줄에", () => {
    const html = renderToStaticMarkup(createElement(PublishConfirmDialog, props));
    expect(html).toContain('data-testid="confirm-goto-2"');
    expect(html).toContain('data-testid="confirm-goto-9"');
    expect(html).toContain(">3</button>");
    expect(html).toContain(">10</button>");
    expect(html).toContain("2 slots where name and video may not match — ");
    expect(html).toContain(" (tap to go)");
  });
  it("불일치 칸이 없으면 경고 줄 없음", () => {
    const html = renderToStaticMarkup(createElement(PublishConfirmDialog, { ...props, mismatch: [] }));
    expect(html).not.toContain('data-testid="confirm-warn"');
  });
});
