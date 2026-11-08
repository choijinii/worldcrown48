/**
 * IMAGE-1 — 차트 아바타 재료. 그림만 있는 엔트리는 600 사본 주소를 싣고,
 * 영상이 있으면(아바타는 영상 우선) imageUrl 은 null.
 */
import { describe, expect, it } from "vitest";
import { buildTallies, contestantMetaOf } from "../core/rankingAggregator";

const THUMB = "https://firebasestorage.googleapis.com/v0/b/b/o/t?alt=media";

describe("contestantMetaOf + buildTallies — 그림(IMAGE-1)", () => {
  it("그림만 → imageUrl = thumbUrl", () => {
    const m = contestantMetaOf("a", { name: "A", media: { type: "image", image: { thumbUrl: THUMB, url: "full" } } });
    expect(buildTallies(new Map(), [m])[0].imageUrl).toBe(THUMB);
  });
  it("thumbUrl 이 없으면 url", () => {
    const m = contestantMetaOf("a", { name: "A", media: { type: "image", image: { url: "full" } } });
    expect(buildTallies(new Map(), [m])[0].imageUrl).toBe("full");
  });
  it("영상이 있으면 imageUrl null", () => {
    const m = contestantMetaOf("a", {
      name: "A",
      media: { type: "embed", embed: { videoId: "dQw4w9WgXcQ" }, image: { thumbUrl: THUMB } },
    });
    const t = buildTallies(new Map(), [m])[0];
    expect(t.videoId).toBe("dQw4w9WgXcQ");
    expect(t.imageUrl ?? null).toBeNull();
  });
  it("내려간 영상 + 그림 → 그림", () => {
    const m = contestantMetaOf("a", {
      name: "A",
      media: { type: "embed", embed: { videoId: "dQw4w9WgXcQ", gone: true }, image: { thumbUrl: THUMB } },
    });
    const t = buildTallies(new Map(), [m])[0];
    expect(t.imageUrl).toBe(THUMB);
  });
  it("둘 다 없음 → null", () => {
    expect(buildTallies(new Map(), [contestantMetaOf("a", { name: "A" })])[0].imageUrl ?? null).toBeNull();
  });
});
