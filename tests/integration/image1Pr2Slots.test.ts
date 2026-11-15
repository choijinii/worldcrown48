/**
 * (정적 그리기의 기본 언어는 en — 문구는 승인표 영어 줄로 본다.)
 * IMAGE-1 PR 2 통합 — 엔트리 칸 · 생성 패널을 정적으로 그려 본다.
 *   [새 이미지 찾기] = 이미지 대회에서 검색으로 들어온 그림 칸에만([새 영상 찾기]와 같은 자리 · 손으로 넣은 칸 없음)
 *   못 찾은 칸 = 칸 아래 이유 줄(문구 6) · 도구 줄 = 이미지 대회에만 [이미지만 찾기](마우스 올림 문구 8) · [이미지 주소 한꺼번에 넣기]
 *   이미지 대회 [이미지 생성]은 진행 표시(문구 3) · 영상 대회 화면은 그대로.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContestantEditor } from "@/components/admin/lab/ContestantEditor";
import { GeneratePanel } from "@/components/admin/lab/GeneratePanel";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

const noop = () => {};
const base: ContestantDraft = { name: "Pony", nationality: "KR", affiliation: "", imageSearchKeyword: "" };
const img = (origin: "upload" | "url" | "search"): ContestantDraft => ({
  ...base,
  imageUrl: "https://store/0.jpg",
  imageThumbUrl: "https://store/0_600.jpg",
  imageStoragePath: "entry-images/drafts/u/d/0.jpg",
  imageSource: { origin, sourceUrl: "https://i/0.jpg", sourcePage: "https://p/0" },
});
const slot = (contestant: ContestantDraft, extra: Record<string, unknown> = {}, kind: "video" | "image" = "image") =>
  renderToStaticMarkup(
    createElement(ContestantEditor, {
      index: 0,
      contestant,
      onChange: noop,
      mediaKind: kind,
      image: { onFile: noop, onUrl: async () => null, onRemove: noop },
      video: { onAdd: async () => null, onRemove: noop },
      onRefreshImage: noop,
      ...extra,
    } as never),
  );

describe("[새 이미지 찾기]", () => {
  it("검색으로 들어온 그림 칸에만 보인다", () => {
    expect(slot(img("search"))).toContain('data-testid="contestant-image-refresh-0"');
    expect(slot(img("search"))).toContain("Find another image");
  });
  it("손으로 넣은 그림(파일 · 주소) · 그림 없는 칸 · 영상 대회에는 없다", () => {
    for (const html of [slot(img("upload")), slot(img("url")), slot(base), slot(img("search"), {}, "video")]) {
      expect(html).not.toContain("contestant-image-refresh-0");
    }
  });
  it("[새 영상 찾기](contestant-refresh)와 같은 모양의 칸 아래 줄 — 칸의 마지막 줄", () => {
    const html = slot(img("search"));
    expect(html.lastIndexOf("contestant-image-refresh-0")).toBeGreaterThan(html.indexOf("slot-row-0"));
  });
});

describe("못 찾은 칸의 이유", () => {
  it("문구 6 이 칸 아래 이유 줄로 보인다(주소 칸 자리 안)", () => {
    const html = slot(base, { imageNotFound: true });
    expect(html).toContain('data-testid="slot-image-notfound-0"');
    expect(html).toContain("No image 400 px tall or more was found");
    const line = html.indexOf('data-testid="slot-line-0"');
    expect(line).toBeGreaterThan(-1);
    expect(html.indexOf("slot-image-notfound-0")).toBeGreaterThan(line);
  });
  it("표시가 없으면 이유도 없다", () => {
    expect(slot(base)).not.toContain("slot-image-notfound-0");
  });
});

const panel = (kind: "video" | "image" | null, extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    createElement(GeneratePanel, {
      counters: { filled: 0, total: 48, suggested: 0, todo: 0 },
      stage: null,
      progress: null,
      onGenerateVideos: noop,
      onGenerateImages: noop,
      onPasteLinks: noop,
      onFillBlanks: noop,
      onFindImages: noop,
      onPasteImageLinks: noop,
      hasBlanks: true,
      mediaKind: kind,
      ...extra,
    } as never),
  );

describe("생성 패널", () => {
  it("[이미지 생성] 아래 설명 = 문구 1", () => {
    expect(panel(null)).toContain("AI fills all 48 → finds images → inspects them");
  });
  it("이미지 대회 찾는 중 = 문구 3 · 꺼진 [동영상 생성]은 이름 그대로", () => {
    const html = panel("image", { stage: "sourcing", progress: { done: 6, total: 48 } });
    expect(html).toContain("Finding images… 6/48");
    expect(html).not.toContain("Finding videos");
  });
  it("영상 대회 찾는 중은 그대로", () => {
    const html = panel("video", { stage: "sourcing", progress: { done: 6, total: 48 } });
    expect(html).toContain("Finding videos… 6/48");
    expect(html).not.toContain("Finding images");
  });
});
