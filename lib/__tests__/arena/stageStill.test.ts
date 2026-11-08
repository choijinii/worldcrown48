/**
 * IMAGE-1 PR 1 (원장 D-77 · D-76) — 그림 엔트리의 무대: 16:9 상자에 정지 그림(재생기 없음) ·
 * 이름 버튼 옆 출처 도메인 글자(링크 없음). 파일 올리기는 출처 글자 없음. 영상 엔트리는 지금 그대로.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StageBox, StageNameButton } from "@/components/arena/StageSide";
import type { ContestantMedia } from "@/lib/media/mediaSlot";

const IMG_URL = "https://firebasestorage.googleapis.com/v0/b/b/o/full?alt=media";
const imageMedia = (origin: "upload" | "url"): ContestantMedia => ({
  type: "image",
  image: {
    url: IMG_URL,
    thumbUrl: IMG_URL,
    storagePath: "p",
    origin,
    sourcePage: "https://www.example.com/a",
    width: 1600,
    height: 900,
    addedAt: 1,
    focusY: 25,
  },
});
const contestant = (media?: ContestantMedia) => ({ id: "c1", name: "엔트리", nationality: "KR", affiliation: "", media });
const noop = () => {};
const box = (media: ContestantMedia | undefined, armed = true) =>
  renderToStaticMarkup(
    createElement(StageBox, { contestant: contestant(media), side: "L", size: null, armed, dimmed: false, onEnter: noop, onLeave: noop, onTap: noop }),
  );
const nameBtn = (media: ContestantMedia | undefined) =>
  renderToStaticMarkup(
    createElement(StageNameButton, {
      contestant: contestant(media),
      side: "L",
      focused: false,
      dimmed: false,
      confirmed: false,
      locked: false,
      onEnter: noop,
      onLeave: noop,
      onPress: noop,
    }),
  );

describe("무대 — 그림 엔트리", () => {
  it("정지 그림 · focusY 위치 · 재생기 없음(눌러도)", () => {
    const html = box(imageMedia("url"));
    expect(html).toContain('data-testid="stage-still"');
    expect(html).toContain(`src="${IMG_URL.replace(/&/g, "&amp;")}"`);
    expect(html).toContain("object-position:50% 25%");
    expect(html).not.toContain('data-testid="stage-player"');
    expect(html).not.toContain("ytimg.com");
  });
  it("이름 버튼 옆 출처 도메인 글자 — 링크 아님", () => {
    const html = nameBtn(imageMedia("url"));
    expect(html).toContain('data-testid="stage-source"');
    expect(html).toContain("example.com");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("href=");
  });
  it("파일 올리기는 출처 글자 없음", () => {
    expect(nameBtn(imageMedia("upload"))).not.toContain('data-testid="stage-source"');
  });
  it("영상 엔트리는 출처 글자 없음 · 정지 그림 없음", () => {
    const video: ContestantMedia = { type: "embed", embed: { videoId: "dQw4w9WgXcQ" }, image: imageMedia("url").image };
    expect(nameBtn(video)).not.toContain('data-testid="stage-source"');
    expect(box(video, false)).not.toContain('data-testid="stage-still"');
  });
  it("아무것도 없으면 이니셜(지금 그대로)", () => {
    expect(box(undefined)).not.toContain('data-testid="stage-still"');
  });
});
