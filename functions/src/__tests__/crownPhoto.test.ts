/**
 * IMAGE-1 PR 1 (원장 D-77) — 공유 카드(서버 1.91:1): 그림 엔트리 챔피언은 그 그림을 사진 자리에.
 * IMAGE-1 PR 3 — 영상 대회는 그 엔트리의 유튜브 썸네일(무대 포스터와 같은 순서) · 내린 엔트리는 늘 이니셜.
 * 그림을 못 받으면 사진 없이(이니셜) 굽는다 — 렌더 실패로 세지 않는다.
 */
import { describe, expect, it } from "vitest";
import { createCanvas, loadImage } from "canvas";
import { championPhoto } from "../core/onChampionConfirmedCore";
import { fetchFirstThumb, youtubeThumbBase } from "../core/youtubeThumb";
import { renderCrownPng } from "../core/canvasServer";

const DATA = { initial: "A", name: "Name", title: "T", url: "worldcrown48.com", path: "", campaign: "site" };

function solid(w: number, h: number, color: string): Buffer {
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  return c.toBuffer("image/png");
}

async function pixel(png: Buffer, x: number, y: number): Promise<number[]> {
  const img = await loadImage(png);
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return Array.from(ctx.getImageData(x, y, 1, 1).data);
}

describe("championPhoto", () => {
  it("그림 엔트리 → 대회 경로 storagePath · focusY", () => {
    expect(
      championPhoto({ media: { type: "image", image: { storagePath: "entry-images/tournaments/t1/3.jpg", focusY: 20 } } }),
    ).toEqual({ kind: "storage", storagePath: "entry-images/tournaments/t1/3.jpg", focusY: 20 });
  });
  it("영상 + 그림 → 그림", () => {
    expect(
      championPhoto({
        media: { type: "embed", embed: { videoId: "dQw4w9WgXcQ" }, image: { storagePath: "entry-images/tournaments/t1/0.jpg" } },
      }),
    ).toEqual({ kind: "storage", storagePath: "entry-images/tournaments/t1/0.jpg", focusY: 40 });
  });
  it("영상 엔트리 → 유튜브 썸네일 주소 두 개(가로 hq720 → hqdefault · 세로 oar2 → hqdefault)", () => {
    expect(championPhoto({ media: { type: "embed", embed: { videoId: "dQw4w9WgXcQ" } } }, "https://i.ytimg.com")).toEqual({
      kind: "youtube",
      urls: ["https://i.ytimg.com/vi/dQw4w9WgXcQ/hq720.jpg", "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"],
    });
    expect(
      championPhoto({ media: { type: "embed", embed: { videoId: "dQw4w9WgXcQ", orientation: "portrait" } } }, "http://127.0.0.1:9312"),
    ).toEqual({ kind: "youtube", urls: ["http://127.0.0.1:9312/vi/dQw4w9WgXcQ/oar2.jpg", "http://127.0.0.1:9312/vi/dQw4w9WgXcQ/hqdefault.jpg"] });
  });
  it("내린 엔트리 · 내려간 영상 · 틀린 id → null(이니셜)", () => {
    expect(
      championPhoto({ media: { type: "image", image: { storagePath: "entry-images/tournaments/t1/3.jpg" }, takedown: { at: 1 } } }),
    ).toBeNull();
    expect(championPhoto({ media: { type: "embed", embed: { videoId: "dQw4w9WgXcQ" }, takedown: { at: 1 } } })).toBeNull();
    expect(championPhoto({ media: { type: "embed", embed: { videoId: "dQw4w9WgXcQ", gone: true } } })).toBeNull();
    expect(championPhoto({ media: { type: "embed", embed: { videoId: "bad" } } })).toBeNull();
  });
  it("그림 없음 · 초안 경로 · 이상한 경로 → null", () => {
    expect(championPhoto({})).toBeNull();
    expect(championPhoto({ media: { image: { storagePath: "entry-images/drafts/u/d/0.jpg" } } })).toBeNull();
    expect(championPhoto({ media: { image: { storagePath: "crown-cards/x.png" } } })).toBeNull();
  });
});

describe("renderCrownPng — 사진", () => {
  // drawLink 의 사진 칸: pad = m = 1200×0.022 = 26.4 · side = 630 − 4×26.4 = 524.4 → 가운데 ≈ (315, 315)
  it("사진 바이트가 있으면 사진 칸 가운데가 그 그림 색", async () => {
    const png = renderCrownPng(DATA, solid(800, 600, "#ff0000"));
    const [r, g, b] = await pixel(png, 315, 315);
    expect(r).toBeGreaterThan(200);
    expect(g).toBeLessThan(40);
    expect(b).toBeLessThan(40);
  });
  it("못 읽는 바이트 · 없음 → 사진 없이 그린다(던지지 않는다)", async () => {
    const png = renderCrownPng(DATA, Buffer.from("not an image"));
    const [r] = await pixel(png, 315, 315);
    expect(r).toBeLessThan(200);
    expect(() => renderCrownPng(DATA)).not.toThrow();
  });
});

describe("fetchFirstThumb — 유튜브 썸네일 받기", () => {
  const png = solid(1280, 720, "#00ff00");
  const tiny = solid(120, 90, "#888888"); // 유튜브 회색 자리 그림 = 실패
  const res = (status: number, body?: Buffer) => ({
    ok: status >= 200 && status < 300,
    status,
    arrayBuffer: async () => (body ?? Buffer.alloc(0)).buffer.slice((body ?? Buffer.alloc(0)).byteOffset, (body ?? Buffer.alloc(0)).byteOffset + (body ?? Buffer.alloc(0)).length),
  });
  it("첫 주소가 되면 그것", async () => {
    const got = await fetchFirstThumb(["a", "b"], async (u) => (u === "a" ? res(200, png) : res(200, tiny)));
    expect(got?.length).toBe(png.length);
  });
  it("첫 주소 404 · 회색 자리 그림이면 다음 주소", async () => {
    expect((await fetchFirstThumb(["a", "b"], async (u) => (u === "a" ? res(404) : res(200, png))))?.length).toBe(png.length);
    expect((await fetchFirstThumb(["a", "b"], async (u) => (u === "a" ? res(200, tiny) : res(200, png))))?.length).toBe(png.length);
  });
  it("모두 실패 · 던짐 → null(이니셜)", async () => {
    expect(await fetchFirstThumb(["a", "b"], async () => res(404))).toBeNull();
    expect(
      await fetchFirstThumb(["a"], async () => {
        throw new Error("timeout");
      }),
    ).toBeNull();
  });
  it("주소 앞부분: 에뮬레이터에서만 YT_THUMB_BASE · 실서비스는 늘 i.ytimg.com", () => {
    expect(youtubeThumbBase({ YT_THUMB_BASE: "http://127.0.0.1:9312" })).toBe("https://i.ytimg.com");
    expect(youtubeThumbBase({ FUNCTIONS_EMULATOR: "true", YT_THUMB_BASE: "http://127.0.0.1:9312" })).toBe("http://127.0.0.1:9312");
    expect(youtubeThumbBase({ FUNCTIONS_EMULATOR: "true" })).toBe("https://i.ytimg.com");
  });
});
