/**
 * LAB-FIX-3 추가분 통합 (원장 D-90) — 생성 버튼이 정한 종류가 초안 저장 → 불러오기를 거쳐도 남고,
 * 그 뒤 화면 부품들이 모두 반대쪽을 막는지 한 줄로 이어 본다: 생성 패널 · 칸 버튼 · 도구 · 발행.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GeneratePanel, kindTools } from "@/components/admin/lab/GeneratePanel";
import { slotButtons } from "@/lib/lab/manualMedia";
import { isMediaPublishable } from "@/lib/lab/mediaKind";
import { fromDraftDoc, toDraftFields, type DraftEditorState } from "@/lib/lab/tournamentDraft";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import { EMPTY_PICK } from "@/lib/thumbnail/pick";

const slot = (i: number): ContestantDraft => ({ name: `e${i}`, nationality: "", affiliation: "", imageSearchKeyword: "" });
const editor = (mediaKind: DraftEditorState["mediaKind"]): DraftEditorState => ({
  step: 2, title: "t", category: "KPOP", description: "", keywords: ["k"], campaignSlug: "", deadlineMs: 1,
  contestants: Array.from({ length: 48 }, (_, i) => slot(i)), thumbnailPair: EMPTY_PICK, entryUnit: "individual", mediaKind,
});
const disabled = (html: string, id: string) =>
  /disabled/.test(html.match(new RegExp(`<button[^>]*data-testid="${id}"[^>]*>`))?.[0] ?? "");
const panel = (mediaKind: DraftEditorState["mediaKind"]) =>
  renderToStaticMarkup(createElement(GeneratePanel, {
    counters: { filled: 48, total: 48, suggested: 0, todo: 0 }, stage: null, progress: null,
    onGenerateVideos: () => {}, onGenerateImages: () => {}, onPasteLinks: () => {}, onFillBlanks: () => {},
    hasBlanks: false, mediaKind,
  }));

describe("생성 버튼 → 종류 저장 → 반대쪽 막힘", () => {
  for (const [kind, other] of [["video", "lab-generate-images"], ["image", "lab-generate-videos"]] as const) {
    it(`${kind}: 저장·불러오기 뒤에도 같은 종류 · 반대쪽 생성 버튼 · 칸 버튼 · 도구 · 섞인 발행이 막힌다`, () => {
      // 미정 초안에서 버튼을 누른 순간 = 종류가 정해진 편집기 상태
      expect(disabled(panel(null), other)).toBe(false);
      const back = fromDraftDoc({ hostUid: "u", ...toDraftFields(editor(kind)) })!;
      expect(back.mediaKind).toBe(kind);

      expect(disabled(panel(back.mediaKind), other)).toBe(true);
      const b = slotButtons(back.contestants[0], back.mediaKind);
      if (kind === "video") {
        expect([b.video, b.image, b.imageFile]).toEqual(["off", null, false]);
        expect(kindTools(back.mediaKind)).toMatchObject({ pasteLinks: true, imageFiles: false });
        expect(isMediaPublishable(back.mediaKind, [{ ...slot(0), imageUrl: "https://x/1.jpg" }])).toBe(false);
      } else {
        expect([b.video, b.image, b.imageFile]).toEqual([null, "off", true]);
        expect(kindTools(back.mediaKind)).toMatchObject({ pasteLinks: false, imageFiles: true });
        expect(isMediaPublishable(back.mediaKind, [{ ...slot(0), videoId: "dQw4w9WgXcQ" }])).toBe(false);
      }
    });
  }
});
