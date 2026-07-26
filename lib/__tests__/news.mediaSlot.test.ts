/**
 * ND-1 §3 #12 — MediaSlot 스왑 판정 (하위호환 · embed 파사드 · clip 렌더 배제). AC 10.
 *
 * 기존 데이터(imageUrl만)는 100% 하위호환 — media 부재 시 image 취급. embed는 파사드
 * (정지 썸네일 → hover iframe, mute·start). clip은 스키마 예약만 — 저장은 되나 렌더
 * 경로가 없어야 한다 (decideMediaRender가 clip을 절대 'embed'로 내보내지 않음).
 */
import { describe, expect, it } from "vitest";
import {
  decideMediaRender,
  buildEmbedFacade,
  isValidVideoId,
  extractVideoId,
} from "../media/mediaSlot";

describe("하위호환 — imageUrl만 있는 기존 Contestant", () => {
  it("media 부재 → image 렌더", () => {
    expect(decideMediaRender(undefined, "https://img/x.jpg")).toEqual({
      render: "image",
      imageUrl: "https://img/x.jpg",
    });
  });
  it("type:'image' → image 렌더", () => {
    expect(decideMediaRender({ type: "image" }, "u")).toEqual({
      render: "image",
      imageUrl: "u",
    });
  });
  it("media·imageUrl 둘 다 없음 → none", () => {
    expect(decideMediaRender(undefined, "")).toEqual({ render: "none" });
  });
});

describe("embed — 파사드 렌더", () => {
  it("유효 videoId → embed(파사드 데이터)", () => {
    const d = decideMediaRender(
      { type: "embed", embed: { videoId: "9bZkp7q19f0" } },
      "fallback.jpg",
    );
    expect(d.render).toBe("embed");
    if (d.render === "embed") {
      expect(d.facade.videoId).toBe("9bZkp7q19f0");
      expect(d.facade.thumbnailUrl).toContain("9bZkp7q19f0");
      expect(d.facade.iframeSrc).toContain("youtube-nocookie.com/embed/9bZkp7q19f0");
      expect(d.facade.iframeSrc).toContain("mute=1"); // 무음
    }
  });

  it("invalid videoId → image fallback (렌더 실패로 흐르지 않음)", () => {
    expect(
      decideMediaRender({ type: "embed", embed: { videoId: "bad" } }, "f.jpg"),
    ).toEqual({ render: "image", imageUrl: "f.jpg" });
  });

  it("videoId 무효 + imageUrl 없음 → none", () => {
    expect(
      decideMediaRender({ type: "embed", embed: { videoId: "" } }, ""),
    ).toEqual({ render: "none" });
  });
});

describe("clip — 스키마 예약만, 렌더 경로 없음 (AC 10)", () => {
  it("type:'clip'은 절대 embed로 렌더되지 않고 image로 fallback한다", () => {
    const d = decideMediaRender(
      { type: "clip", embed: { videoId: "9bZkp7q19f0" } },
      "still.jpg",
    );
    expect(d).toEqual({ render: "image", imageUrl: "still.jpg" });
    expect(d.render).not.toBe("embed"); // clip은 재생 경로 없음
  });
  it("clip + imageUrl 없음 → none (여전히 clip 렌더 안 함)", () => {
    expect(decideMediaRender({ type: "clip" }, "")).toEqual({ render: "none" });
  });
});

describe("buildEmbedFacade — start·mute 파라미터", () => {
  it("start 초를 iframe src에 붙인다", () => {
    const f = buildEmbedFacade({ videoId: "9bZkp7q19f0", start: 42 });
    expect(f.iframeSrc).toContain("start=42");
    expect(f.iframeSrc).toContain("autoplay=1");
    expect(f.iframeSrc).toContain("mute=1");
  });
  it("start 없으면 start 파라미터를 넣지 않는다", () => {
    const f = buildEmbedFacade({ videoId: "9bZkp7q19f0" });
    expect(f.iframeSrc).not.toContain("start=");
  });
});

describe("videoId 유틸", () => {
  it("11자 [A-Za-z0-9_-]만 유효", () => {
    expect(isValidVideoId("9bZkp7q19f0")).toBe(true);
    expect(isValidVideoId("short")).toBe(false);
    expect(isValidVideoId("has space!!")).toBe(false);
  });
  it("watch·youtu.be·shorts·embed URL에서 id 추출", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=9bZkp7q19f0")).toBe("9bZkp7q19f0");
    expect(extractVideoId("https://youtu.be/9bZkp7q19f0")).toBe("9bZkp7q19f0");
    expect(extractVideoId("https://www.youtube.com/shorts/9bZkp7q19f0")).toBe("9bZkp7q19f0");
    expect(extractVideoId("nope")).toBeNull();
  });
});
