/**
 * IMAGE-1 PR 1 — 칸 카드: [파일]·[URL] 칩 · 그림 미리보기(600) · "그림" 배지 · [그림 지우기] ·
 * 이름 아래 영상 제목·채널 한 줄(그림 엔트리는 출처 도메인) · 이름↔영상 불일치 배지(새 것이 앞).
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContestantEditor } from "@/components/admin/lab/ContestantEditor";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

const noop = () => {};
const image = { onFile: noop, onUrl: async () => null, onRemove: noop };
const base: ContestantDraft = { name: "민지", nationality: "KR", affiliation: "NewJeans", imageSearchKeyword: "" };
const render = (c: ContestantDraft, extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(ContestantEditor, { index: 4, contestant: c, onChange: noop, image, ...extra }));

describe("칸 카드 — 그림", () => {
  it("칩 [파일]·[URL] 이 늘 있다", () => {
    const html = render(base);
    expect(html).toContain('data-testid="slot-image-file-4"');
    expect(html).toContain('data-testid="slot-image-url-4"');
  });
  it("그림만 → 600 미리보기 · 그림 배지 · 그림 지우기 · 출처 도메인 한 줄", () => {
    const html = render({
      ...base,
      imageUrl: "https://firebasestorage.googleapis.com/full",
      imageThumbUrl: "https://firebasestorage.googleapis.com/thumb",
      imageSource: { origin: "url", sourcePage: "https://www.example.com/p" },
    });
    expect(html).toContain("url(https://firebasestorage.googleapis.com/thumb)");
    expect(html).toContain('data-testid="slot-image-badge-4"');
    expect(html).toContain('data-testid="slot-image-remove-4"');
    expect(html).toContain('data-testid="slot-meta-4"');
    expect(html).toContain("example.com");
  });
  it("영상 + 그림 → 영상 썸네일 · 그림 배지 없음 · 지우기는 있음", () => {
    const html = render({ ...base, videoId: "dQw4w9WgXcQ", imageUrl: "f", imageThumbUrl: "t" });
    expect(html).toContain("ytimg.com");
    expect(html).not.toContain('data-testid="slot-image-badge-4"');
    expect(html).toContain('data-testid="slot-image-remove-4"');
  });
  it("영상 칸 → 이름 아래 제목 · 채널 한 줄", () => {
    const html = render({ ...base, videoId: "dQw4w9WgXcQ", videoTitle: "Ditto MV", videoChannel: "HYBE LABELS" });
    expect(html).toMatch(/data-testid="slot-meta-4"[^>]*>Ditto MV · HYBE LABELS</);
  });
  it("불일치 배지 — 새 배지가 기존 이름↔검색어 배지보다 앞", () => {
    const html = render(
      { ...base, videoId: "dQw4w9WgXcQ", videoTitle: "IVE MV", videoChannel: "STARSHIP" },
      { videoMismatch: true, reviewFlags: [{ kind: "name-hint-mismatch", suggestedNameTokens: [] }] },
    );
    const a = html.indexOf('data-review-flag="name-video-mismatch"');
    const b = html.indexOf('data-review-flag="name-hint-mismatch"');
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
  });
  it("image 손잡이가 없으면(옛 호출) 칩도 없다", () => {
    const html = renderToStaticMarkup(createElement(ContestantEditor, { index: 4, contestant: base, onChange: noop }));
    expect(html).not.toContain('data-testid="slot-image-file-4"');
  });
});
