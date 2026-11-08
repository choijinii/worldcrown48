/** IMAGE-1 — VS 표지: 영상이 유효하거나 그림이 있으면 쓸 수 있다. 그림 칸은 600 사본으로 그린다. */
import { describe, expect, it } from "vitest";
import { coverEntry, coverSides, type CoverContestant } from "@/lib/thumbnail/cover";

const THUMB = "https://firebasestorage.googleapis.com/v0/b/b/o/t?alt=media";
const img = (order: number): CoverContestant => ({
  id: `c${order}`,
  order,
  media: { image: { thumbUrl: THUMB, url: THUMB + "&full" } },
});
const vid = (order: number): CoverContestant => ({ id: `c${order}`, order, media: { embed: { videoId: "dQw4w9WgXcQ" } } });
const NONE = new Set<string>();

describe("cover — 그림 엔트리", () => {
  it("그림만 있는 칸 usable", () => {
    expect(coverEntry(img(1), NONE).entry.usable).toBe(true);
  });
  it("그림 칸이 깨짐 목록에 있으면 false", () => {
    expect(coverEntry(img(1), new Set(["c1"])).entry.usable).toBe(false);
  });
  it("그림 칸 → videoId 빈 글자 + imageUrl = thumbUrl · 영상 칸은 imageUrl 없음", () => {
    const s = coverSides({ a: "c1", b: "c2", aPos: 50, bPos: 50 }, [img(1), vid(2)], NONE);
    expect(s.a).toMatchObject({ videoId: "", imageUrl: THUMB });
    expect(s.b?.videoId).toBe("dQw4w9WgXcQ");
    expect(s.b && "imageUrl" in s.b).toBe(false);
  });
  it("영상 + 그림 칸은 영상으로", () => {
    const both: CoverContestant = { id: "c1", order: 1, media: { embed: { videoId: "dQw4w9WgXcQ" }, image: { thumbUrl: THUMB } } };
    const s = coverSides({ a: "c1", b: "c2", aPos: 50, bPos: 50 }, [both, vid(2)], NONE);
    expect(s.a?.videoId).toBe("dQw4w9WgXcQ");
    expect(s.a && "imageUrl" in s.a).toBe(false);
  });
});
