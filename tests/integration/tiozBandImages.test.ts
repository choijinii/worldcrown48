/**
 * TIOZ-BAND-ON v1.1 통합 (대표 2026-11-26) — 그림 띠 파일이 public/pitch/tioz/ 에 있고 크기가 지시서 표와 같다.
 * 그림은 다시 그리거나 줄이지 않는다(PNG 원본 그대로 · 같은 크기 webp 를 함께 둠).
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "public/pitch/tioz");
/** PNG 머리(IHDR)에서 가로 · 세로. */
function pngSize(file: string): [number, number] {
  const b = readFileSync(file);
  expect(b.subarray(1, 4).toString()).toBe("PNG");
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}
/** WebP(VP8 · VP8L · VP8X) 머리에서 가로 · 세로. */
function webpSize(file: string): [number, number] {
  const b = readFileSync(file);
  expect(b.subarray(0, 4).toString()).toBe("RIFF");
  expect(b.subarray(8, 12).toString()).toBe("WEBP");
  const kind = b.subarray(12, 16).toString();
  if (kind === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === "VP8L") {
    const bits = b.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
  }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}

describe("TIOZ.AI 그림 띠 파일", () => {
  for (const [name, w, h] of [
    ["tioz-band-desktop@2x", 2640, 144],
    ["tioz-band-mobile@2x", 700, 112],
  ] as const) {
    it(`${name} — PNG · webp 둘 다 ${w}×${h}`, () => {
      const png = path.join(DIR, `${name}.png`);
      const webp = path.join(DIR, `${name}.webp`);
      expect(existsSync(png), png).toBe(true);
      expect(existsSync(webp), webp).toBe(true);
      expect(pngSize(png)).toEqual([w, h]);
      expect(webpSize(webp)).toEqual([w, h]);
    });
  }
});
