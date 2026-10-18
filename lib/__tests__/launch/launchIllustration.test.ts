/**
 * 사전등록 페이지 그림 자리 · 배너 자리 (PRE-REG-1 · 원장 D-54 · D-27 바뀜 · D-21 적용).
 *
 * 대표 결정 ②(2026-10-17): 그림은 왕관·슬로건(LaunchHero) **바로 아래**, 추천 대회·이메일 칸보다
 * 위. 비율은 그림 원래 비율(2068×499) — 16:9 로 자르지 않는다. 휴대폰(≤480)만 가운데 인물을
 * 중심으로 2:1 로 더 높게 자른다(대표 확정 2026-10-18). 그림 위에 글자를 얹지 않는다. 그림 파일이 없으면 자리를 그리지 않는다.
 * 대표 결정 ③: 배너 자리 `launch-below` 는 맨 아래(SNS 링크 아래) — 등록 칸 근처에 두지 않는다.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/lib/i18n/messages";
import { LAUNCH_ILLUSTRATION, LAUNCH_ILLUSTRATION_MOBILE_ASPECT } from "@/lib/launch/illustration";

const ROOT = path.resolve(__dirname, "../../..");

/** webp 머리에서 가로·세로를 읽는다(VP8 · VP8L · VP8X). */
function webpSize(buf: Buffer): { width: number; height: number } {
  expect(buf.toString("ascii", 0, 4)).toBe("RIFF");
  expect(buf.toString("ascii", 8, 12)).toBe("WEBP");
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  if (chunk === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  const b = buf.readUInt32LE(21);
  return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
}

describe("그림 — 대표 일러스트 Gemini-illust-001 (D-27 바뀜)", () => {
  it("public/images/launch 의 webp 이고 원래 크기 2068×499 그대로다", () => {
    expect(LAUNCH_ILLUSTRATION).not.toBeNull();
    const ill = LAUNCH_ILLUSTRATION!;
    expect(ill.src).toMatch(/^\/images\/launch\/.+\.webp$/);
    const file = path.join(ROOT, "public", ill.src);
    expect(existsSync(file)).toBe(true);
    expect(webpSize(readFileSync(file))).toEqual({ width: 2068, height: 499 });
    expect([ill.width, ill.height]).toEqual([2068, 499]);
  });

  it("휴대폰(≤480) 자르기 = 2:1 (350×175) — 가운데 인물이 보이게", () => {
    // 2:1 확정(대표 2026-10-18 · D-54) — 원래 비율보다 높고 16:9 보다 낮다.
    expect(LAUNCH_ILLUSTRATION_MOBILE_ASPECT).toBe(2);
  });

  it("대체 글(alt)이 3언어로 있다", () => {
    const m = MESSAGES["launch.illustration.alt"];
    expect(m.ko.trim() && m.en.trim() && m.es?.trim()).toBeTruthy();
  });
});

describe("사전등록 페이지 구성 순서", () => {
  const page = readFileSync(path.join(ROOT, "app/launch/page.tsx"), "utf8");
  const pos = (s: string) => {
    const i = page.indexOf(s);
    expect(i, `${s} 가 페이지에 없다`).toBeGreaterThan(-1);
    return i;
  };
  it("LaunchHero → 그림 → 추천 대회 → 이메일 칸 → SNS → 배너", () => {
    const order = [
      pos("<LaunchHero"),
      pos("<LaunchIllustration"),
      pos("<FeaturedTournament"),
      pos("<WaitlistForm"),
      pos("<SNSLinks"),
      pos("<LaunchBanner"),
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
  it("배너 부품은 launch-below 자리를 쓴다", () => {
    const banner = readFileSync(path.join(ROOT, "components/launch/LaunchBanner.tsx"), "utf8");
    expect(banner).toContain('slot="launch-below"');
  });
});
