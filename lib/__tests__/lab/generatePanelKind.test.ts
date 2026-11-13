/**
 * LAB-FIX-3 추가분 (원장 D-90) — 생성 버튼 · 안내 한 줄 · 도구 · 발행 버튼이 대회 종류를 따른다(정적 렌더 · en).
 * 도구 줄은 접혀 있어 정적 렌더에 나오지 않는다 — 도구 판정은 순수 함수 kindTools 로 본다.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GeneratePanel, fillBlanksLabel, kindTools } from "@/components/admin/lab/GeneratePanel";
import { PublishButton } from "@/components/admin/lab/PublishButton";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

const noop = () => {};
const counters = { filled: 0, total: 48, suggested: 0, todo: 48 };
const panel = (mediaKind: "video" | "image" | null) =>
  renderToStaticMarkup(
    createElement(GeneratePanel, {
      counters, stage: null, progress: null, onGenerateVideos: noop, onGenerateImages: noop,
      onPasteLinks: noop, onFillBlanks: noop, hasBlanks: true, mediaKind,
    } as never),
  );
const button = (html: string, id: string) => html.match(new RegExp(`<button[^>]*data-testid="${id}"[^>]*>`))?.[0] ?? "";

describe("생성 버튼 — 처음 누른 버튼이 종류를 정한다", () => {
  it("미정: 두 버튼 모두 켜짐 · 밑에 안내 한 줄", () => {
    const html = panel(null);
    expect(button(html, "lab-generate-videos")).not.toContain("disabled");
    expect(button(html, "lab-generate-images")).not.toContain("disabled");
    expect(html).toContain('data-testid="lab-media-kind-note"');
    expect(html).toContain("The first button you press sets the tournament type (video or image). To change it, delete the draft and start over.");
  });
  it("영상 대회: [이미지 생성] 꺼짐 + 툴팁 2a", () => {
    const b = button(panel("video"), "lab-generate-images");
    expect(b).toContain("disabled");
    expect(b).toContain('title="This is a video tournament."');
    expect(button(panel("video"), "lab-generate-videos")).not.toContain("disabled");
  });
  it("이미지 대회: [동영상 생성] 꺼짐 + 툴팁 2b", () => {
    const b = button(panel("image"), "lab-generate-videos");
    expect(b).toContain("disabled");
    expect(b).toContain('title="This is an image tournament."');
  });
});

describe("kindTools — 직접 손보기 도구는 그 종류만", () => {
  it("미정: 도구 없음", () => {
    expect(kindTools(null)).toEqual({ pasteLinks: false, fillBlanks: false, imageFiles: false });
  });
  it("영상 대회: 검수기 · 빈칸만 AI", () => {
    expect(kindTools("video")).toEqual({ pasteLinks: true, fillBlanks: true, imageFiles: false });
  });
  it("이미지 대회: 빈칸만 AI · 이미지 파일 넣기", () => {
    expect(kindTools("image")).toEqual({ pasteLinks: false, fillBlanks: true, imageFiles: true });
  });
});

describe("빈칸 버튼 이름 — 대회 종류를 따른다(LAB-FIX-3b)", () => {
  it("영상 대회: 지금 이름 그대로(lab.fill.blanks)", () => {
    expect(fillBlanksLabel("video")).toBe("lab.fill.blanks");
  });
  it("이미지 대회: 이미지를 넣지 않으므로 lab.fill.blanksImage", () => {
    expect(fillBlanksLabel("image")).toBe("lab.fill.blanksImage");
  });
});

describe("발행 버튼 — 섞이면 꺼짐", () => {
  const filled = (extra: Partial<ContestantDraft> = {}): ContestantDraft[] =>
    Array.from({ length: 48 }, (_, i) => ({ name: `e${i}`, nationality: "", affiliation: "", imageSearchKeyword: "", ...(i === 0 ? extra : {}) }));
  const pub = (cs: ContestantDraft[], mediaReady: boolean) =>
    renderToStaticMarkup(createElement(PublishButton, { contestants: cs, busy: false, onClick: noop, pairReady: true, mediaReady }));
  it("mediaReady=false 면 48칸이 다 차도 꺼짐", () => {
    expect(pub(filled(), true)).not.toMatch(/<button[^>]*disabled/);
    expect(pub(filled(), false)).toMatch(/<button[^>]*disabled/);
  });
});
