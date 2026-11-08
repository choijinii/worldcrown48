/**
 * IMAGE-1 PR 1 (원장 D-77) — 공유 카드(서버 1.91:1): 그림 엔트리 챔피언은 그 그림을 사진 자리에.
 * 영상 대회의 유튜브 썸네일은 PR 3. 그림을 못 받으면 사진 없이(이니셜) 굽는다 — 렌더 실패로 세지 않는다.
 */
import { describe, expect, it } from "vitest";
import { createCanvas, loadImage } from "canvas";
import { championPhoto } from "../core/onChampionConfirmedCore";
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
    ).toEqual({ storagePath: "entry-images/tournaments/t1/3.jpg", focusY: 20 });
  });
  it("영상 + 그림 → 그림(영상 썸네일은 PR 3)", () => {
    expect(
      championPhoto({
        media: { type: "embed", embed: { videoId: "dQw4w9WgXcQ" }, image: { storagePath: "entry-images/tournaments/t1/0.jpg" } },
      }),
    ).toEqual({ storagePath: "entry-images/tournaments/t1/0.jpg", focusY: 40 });
  });
  it("그림 없음 · 초안 경로 · 이상한 경로 → null", () => {
    expect(championPhoto({ media: { type: "embed", embed: { videoId: "dQw4w9WgXcQ" } } })).toBeNull();
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
