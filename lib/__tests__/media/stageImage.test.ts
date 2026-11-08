/** IMAGE-1 — 무대 정지 그림(D-76 16:9 · D-77 출처 도메인 글자만). */
import { describe, expect, it } from "vitest";
import { resolveStageImage } from "@/lib/media/stageCrop";
import type { EntryImage } from "@/lib/media/mediaSlot";

const IMAGE: EntryImage = {
  url: "https://firebasestorage.googleapis.com/v0/b/b/o/full?alt=media",
  thumbUrl: "https://firebasestorage.googleapis.com/v0/b/b/o/thumb?alt=media",
  storagePath: "p",
  origin: "url",
  sourceUrl: "https://cdn.example.com/a.jpg",
  sourcePage: "https://www.example.com/news/1",
  width: 1600,
  height: 900,
  addedAt: 1,
};

describe("resolveStageImage", () => {
  it("그림만 있으면 url · focusY 기본 40 · 출처 도메인", () => {
    expect(resolveStageImage({ type: "image", image: IMAGE })).toEqual({
      url: IMAGE.url,
      focusY: 40,
      sourceHost: "example.com",
    });
  });
  it("focusY 는 그림 칸 값 · 0~100 으로 자른다", () => {
    expect(resolveStageImage({ type: "image", image: { ...IMAGE, focusY: 10 } })?.focusY).toBe(10);
    expect(resolveStageImage({ type: "image", image: { ...IMAGE, focusY: 150 } })?.focusY).toBe(100);
  });
  it("파일 올리기(upload)는 출처 글자 없음", () => {
    expect(resolveStageImage({ type: "image", image: { ...IMAGE, origin: "upload" } })?.sourceHost).toBe("");
  });
  it("유효 영상이 있으면 null(영상 우선)", () => {
    expect(resolveStageImage({ type: "embed", embed: { videoId: "dQw4w9WgXcQ" }, image: IMAGE })).toBeNull();
  });
  it("내려간 영상 + 그림 → 그림", () => {
    expect(resolveStageImage({ type: "embed", embed: { videoId: "dQw4w9WgXcQ", gone: true }, image: IMAGE })?.url).toBe(
      IMAGE.url,
    );
  });
  it("그림 없음 → null", () => {
    expect(resolveStageImage({ type: "image" })).toBeNull();
    expect(resolveStageImage(undefined)).toBeNull();
  });
});
