/** IMAGE-1 — 우선순위 영상 > 그림 > 없음 (contestantThumbnail · decideMediaRender). */
import { describe, expect, it } from "vitest";
import { contestantThumbnail, decideMediaRender, type ContestantMedia, type EntryImage } from "@/lib/media/mediaSlot";

const IMAGE: EntryImage = {
  url: "https://firebasestorage.googleapis.com/v0/b/b/o/full?alt=media",
  thumbUrl: "https://firebasestorage.googleapis.com/v0/b/b/o/thumb?alt=media",
  storagePath: "entry-images/tournaments/t/0.jpg",
  origin: "upload",
  width: 1600,
  height: 900,
  addedAt: 1,
};
const VID = "dQw4w9WgXcQ";

describe("contestantThumbnail", () => {
  it("영상이 있으면 영상 썸네일(그림이 있어도)", () => {
    const m: ContestantMedia = { type: "embed", embed: { videoId: VID }, image: IMAGE };
    expect(contestantThumbnail(m)).toContain("ytimg.com");
  });
  it("그림만 → 600 사본", () => {
    expect(contestantThumbnail({ type: "image", image: IMAGE })).toBe(IMAGE.thumbUrl);
  });
  it("600 사본이 비면 원본", () => {
    expect(contestantThumbnail({ type: "image", image: { ...IMAGE, thumbUrl: "" } })).toBe(IMAGE.url);
  });
  it("내려간(gone) 영상 + 그림 → 그림", () => {
    const m: ContestantMedia = { type: "embed", embed: { videoId: VID, gone: true }, image: IMAGE };
    expect(contestantThumbnail(m)).toBe(IMAGE.thumbUrl);
  });
  it("image 가 빈 옛 type:image 문서 · 아무것도 없음 → 빈 글자", () => {
    expect(contestantThumbnail({ type: "image" })).toBe("");
    expect(contestantThumbnail(undefined)).toBe("");
  });
});

describe("decideMediaRender", () => {
  it("그림만 있는 칸 → image(media.image.url)", () => {
    expect(decideMediaRender({ type: "image", image: IMAGE }, "")).toEqual({ render: "image", imageUrl: IMAGE.url });
  });
  it("영상 + 그림 → embed", () => {
    expect(decideMediaRender({ type: "embed", embed: { videoId: VID }, image: IMAGE }, "").render).toBe("embed");
  });
  it("gone 영상 + 그림 → image", () => {
    expect(decideMediaRender({ type: "embed", embed: { videoId: VID, gone: true }, image: IMAGE }, "")).toEqual({
      render: "image",
      imageUrl: IMAGE.url,
    });
  });
  it("옛 type:image(그림 없음) + 바깥 imageUrl 인자 → 지금처럼 그 인자", () => {
    expect(decideMediaRender({ type: "image" }, "https://x/y.jpg")).toEqual({ render: "image", imageUrl: "https://x/y.jpg" });
    expect(decideMediaRender({ type: "image" }, "")).toEqual({ render: "none" });
  });
});
