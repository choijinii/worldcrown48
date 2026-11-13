/**
 * LAB-FIX-3 (원장 D-89) — 칸 카드의 버튼(정적 렌더).
 * 자동 칸 = [새 영상 찾기]만 · 수동 칸 = [영상]·[이미지]·[이미지 파일] · 🔎·[그림 지우기]·수동 칸 [영상 찾기] 없음 ·
 * 이름만 있는 빈 칸 가운데 크라운 로고. 맥락 없는 정적 렌더의 언어는 en(lib/i18n.tsx) — 한국어 글자는
 * labFix3Copy.test.ts 가 지킨다.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContestantEditor } from "@/components/admin/lab/ContestantEditor";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

const noop = () => {};
const image = { onFile: noop, onUrl: async () => null, onRemove: noop };
const video = { onAdd: async () => null, onRemove: noop };
const base: ContestantDraft = { name: "민지", nationality: "KR", affiliation: "NewJeans", imageSearchKeyword: "민지 직캠" };
const render = (c: ContestantDraft) =>
  renderToStaticMarkup(
    createElement(ContestantEditor, { index: 4, contestant: c, onChange: noop, image, video, onRefreshVideo: noop }),
  );

describe("칸 버튼 — 자동 칸", () => {
  const html = render({ ...base, videoId: "dQw4w9WgXcQ" });
  it("[새 영상 찾기]만 보인다", () => {
    expect(html).toContain('data-testid="contestant-refresh-4"');
    expect(html).toContain(">Find another<");
  });
  it("[영상]·[이미지]·[이미지 파일]은 안 보인다", () => {
    expect(html).not.toContain('data-testid="slot-video-4"');
    expect(html).not.toContain('data-testid="slot-image-url-4"');
    expect(html).not.toContain('data-testid="slot-image-file-4"');
  });
});

describe("칸 버튼 — 수동 칸", () => {
  it("비어 있음: [영상]·[이미지]·[이미지 파일] 꺼짐 · [영상 찾기] 없음", () => {
    const html = render(base);
    expect(html).toMatch(/data-testid="slot-video-4"[^>]*aria-pressed="false"/);
    expect(html).toMatch(/data-testid="slot-image-url-4"[^>]*aria-pressed="false"/);
    expect(html).toContain('data-testid="slot-image-file-4"');
    expect(html).not.toContain('data-testid="contestant-refresh-4"');
    expect(html).toContain(">Video<");
    expect(html).toContain(">Image<");
    expect(html).toContain(">Image file<");
  });
  it("손으로 넣은 영상: [영상] 켜짐", () => {
    const html = render({ ...base, videoId: "dQw4w9WgXcQ", manualVideo: true });
    expect(html).toMatch(/data-testid="slot-video-4"[^>]*aria-pressed="true"/);
    expect(html).not.toContain('data-testid="contestant-refresh-4"');
  });
  it("그림 칸: [이미지] 켜짐 · [그림 지우기] 없음", () => {
    const html = render({ ...base, imageUrl: "https://x/f", imageThumbUrl: "https://x/t" });
    expect(html).toMatch(/data-testid="slot-image-url-4"[^>]*aria-pressed="true"/);
    expect(html).not.toContain("slot-image-remove-4");
  });
});

describe("없어진 것 · 빈 칸 그림", () => {
  it("🔎 검색어 힌트 없음", () => {
    const html = render(base);
    expect(html).not.toContain("contestant-hint-4");
    expect(html).not.toContain("🔎");
  });
  it("이름만 있는 빈 칸 가운데 = 크라운 로고(🏆 아님)", () => {
    const html = render(base);
    expect(html).toMatch(/data-testid="slot-crown-4"[^>]*src="\/brand\/wc48-crown-filled.svg"|src="\/brand\/wc48-crown-filled.svg"[^>]*data-testid="slot-crown-4"/);
    expect(html).not.toContain("🏆");
  });
  it("완전히 빈 칸은 + 그대로", () => {
    const html = render({ name: "", nationality: "", affiliation: "", imageSearchKeyword: "" });
    expect(html).not.toContain("slot-crown-4");
    expect(html).toMatch(/>\+</);
  });
});
