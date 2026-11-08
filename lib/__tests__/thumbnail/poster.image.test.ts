/** IMAGE-1 — VS 표지 한 칸의 그림 주소: 그림 칸은 600 사본 한 장 · 확대 없음. 영상 칸은 지금 그대로. */
import { describe, expect, it } from "vitest";
import { coverSideSources, coverSideZoom } from "@/lib/thumbnail/poster";

const VID = "dQw4w9WgXcQ";
describe("coverSideSources · coverSideZoom", () => {
  it("그림 칸 → 그 주소 한 장, 확대 1", () => {
    const side = { videoId: "", orientation: "landscape" as const, imageUrl: "https://firebasestorage.googleapis.com/x" };
    expect(coverSideSources(side)).toEqual(["https://firebasestorage.googleapis.com/x"]);
    expect(coverSideZoom(side, 0)).toBe(1);
  });
  it("영상 칸 → 유튜브 포스터 두 장 · 마지막(hqdefault)은 확대", () => {
    const side = { videoId: VID, orientation: "landscape" as const };
    expect(coverSideSources(side)).toHaveLength(2);
    expect(coverSideZoom(side, 0)).toBe(1);
    expect(coverSideZoom(side, 1)).toBeCloseTo(4 / 3);
  });
});
