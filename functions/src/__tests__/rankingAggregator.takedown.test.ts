/** IMAGE-1 PR 3 (D-93) — 내린 엔트리는 차트 아바타도 이니셜(영상 id · 그림 주소를 싣지 않는다). */
import { describe, expect, it } from "vitest";
import { contestantMetaOf } from "../core/rankingAggregator";

describe("contestantMetaOf — 내린 엔트리", () => {
  it("표시가 있으면 영상·그림이 남아 있어도 videoId 빈 글자 · imageUrl 없음", () => {
    const m = contestantMetaOf("c1", {
      name: "A",
      media: {
        type: "embed",
        embed: { videoId: "dQw4w9WgXcQ" },
        image: { url: "https://x/full", thumbUrl: "https://x/thumb" },
        takedown: { at: 1 },
      },
    });
    expect(m.videoId).toBe("");
    expect(m.imageUrl).toBeUndefined();
  });
});
