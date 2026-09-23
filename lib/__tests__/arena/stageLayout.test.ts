/**
 * ARENA-1 PR 1 — 칸 크기 일반 규칙 (원장 D-17 · D-11 바뀜 09-17).
 *
 * "칸은 언제나 정사각이다. 한 변은 그 칸에 주어진 자리의 가로·세로 중 짧은 쪽."
 * 기기별 숫자를 하드코딩하지 않는다 — 아래 숫자는 디자인 파일(아트보드 1·6·9) 검산값.
 */
import { describe, expect, it } from "vitest";
import {
  computeFinalLayout,
  computeStageLayout,
  pickViewportHeight,
  stageMode,
} from "@/lib/arena/stageLayout";

describe("stageMode — 태블릿 기준 폭 1024 (D-17 ④)", () => {
  it("1024 이상 = 데스크톱", () => {
    expect(stageMode(1024, 700)).toBe("desktop");
    expect(stageMode(1440, 900)).toBe("desktop");
  });
  it("1024 미만 세로 = portrait (상하 2분할)", () => {
    expect(stageMode(390, 844)).toBe("portrait");
  });
  it("1024 미만 가로 = landscape (좌우 50:50, 메뉴 없음)", () => {
    expect(stageMode(844, 390)).toBe("landscape");
  });
});

describe("computeStageLayout — 디자인 검산값", () => {
  it("데스크톱 1440×900, 무대 위쪽 220 → 칸 640, 프레임 1320×680", () => {
    const l = computeStageLayout({ width: 1440, height: 900, top: 220 });
    expect(l.mode).toBe("desktop");
    expect(l.direction).toBe("row");
    expect(l.cell).toBe(640);
    expect(l.frameW).toBe(1320);
    expect(l.frameH).toBe(680);
  });

  it("데스크톱은 칸이 640을 넘지 않는다 — 썸네일 원본 1280×720이 흐려진다 (D-08)", () => {
    expect(computeStageLayout({ width: 2560, height: 1440, top: 220 }).cell).toBe(640);
  });

  it("데스크톱 1280×720 (Playwright 기본) → 높이가 정한다", () => {
    // 가로 자리 (1280-120-40)/2 = 560, 세로 자리 720-220-40 = 460
    const l = computeStageLayout({ width: 1280, height: 720, top: 220 });
    expect(l.cell).toBe(460);
  });

  it("모바일 세로 390×844, 무대 위쪽 68 → 칸 364 정사각, 상하", () => {
    const l = computeStageLayout({ width: 390, height: 844, top: 68 });
    expect(l.mode).toBe("portrait");
    expect(l.direction).toBe("column");
    expect(l.cell).toBe(364);
    expect(l.frameW).toBe(366);
  });

  it("모바일 가로 844×390, 메뉴 없음(위쪽 12) → 칸 366, 프레임 732×366 (여백 56)", () => {
    const l = computeStageLayout({ width: 844, height: 390, top: 12 });
    expect(l.mode).toBe("landscape");
    expect(l.direction).toBe("row");
    expect(l.cell).toBe(366);
    expect(l.frameW).toBe(732);
    expect(l.frameH).toBe(366);
    // 가로에서는 칸 크기를 높이가 정한다 — 남는 폭은 가운데 정렬 여백이 된다.
    expect((844 - l.frameW) / 2).toBe(56);
  });

  it("칸은 항상 정사각 한 변 하나 (정수 px)", () => {
    for (const [w, h, top] of [
      [1024, 768, 220],
      [768, 1024, 68],
      [1023, 600, 12],
      [360, 640, 68],
      [320, 800, 68],
    ] as const) {
      const l = computeStageLayout({ width: w, height: h, top });
      expect(Number.isInteger(l.cell)).toBe(true);
      expect(l.cell).toBeGreaterThan(0);
    }
  });

  it("너무 좁은 화면에서도 칸이 바닥(120) 밑으로 줄지 않는다", () => {
    expect(computeStageLayout({ width: 130, height: 600, top: 68 }).cell).toBe(120);
  });
});

// ── ARENA-1 PR 2a — 실제로 남는 높이 (주소창이 접히고 펴지는 기기) ──
describe("pickViewportHeight — 주소창이 가린 높이 (D-17 칸 규칙의 입력)", () => {
  it("visualViewport 가 있으면 그 높이를 쓴다 — 크롬 안드로이드의 innerHeight 는 주소창을 반영하지 않는다", () => {
    expect(pickViewportHeight(844, 731)).toBe(731);
  });

  it("visualViewport 가 없으면(아이폰 옛 사파리 등) innerHeight", () => {
    expect(pickViewportHeight(844, undefined)).toBe(844);
    expect(pickViewportHeight(844, null)).toBe(844);
  });

  it("말이 안 되는 값(0·음수·NaN)은 무시하고 innerHeight", () => {
    for (const bad of [0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(pickViewportHeight(844, bad)).toBe(844);
    }
  });

  it("전체화면으로 주소창이 사라지면 두 값이 같아진다", () => {
    expect(pickViewportHeight(844, 844)).toBe(844);
  });
});

// ── ARENA-1 PR 2b — 결승 3분할 (디자인 정본 19·22·23 · 원장 D-06 · D-29) ──
describe("computeFinalLayout — 결승은 매치 무대 프레임을 셋으로 나눈다", () => {
  it("데스크톱 1440×900 → 프레임 1320×680 그대로, 칸 426 정사각 3개", () => {
    const f = computeFinalLayout({ width: 1440, height: 900, top: 220 });
    expect(f.mode).toBe("desktop");
    expect(f.direction).toBe("row");
    expect([f.frameW, f.frameH]).toEqual([1320, 680]); // 매치와 같은 프레임
    expect(f.cell).toBe(426); // 1280 / 3 = 426.67 → 정수
    expect(f.cells).toBe(3);
  });

  it("모바일 가로 844×390 → 프레임 732×366 그대로, 칸 244", () => {
    const f = computeFinalLayout({ width: 844, height: 390, top: 12 });
    expect(f.direction).toBe("row");
    expect(f.frameW).toBe(732);
    expect(f.cell).toBe(244); // 732 / 3
  });

  it("모바일 세로 390×844 → 위·가운데·아래 3단, 칸은 정사각 (디자인 검산 232 ± 규칙 계산 236)", () => {
    const match = computeStageLayout({ width: 390, height: 844, top: 90 });
    const f = computeFinalLayout({ width: 390, height: 844, top: 90 });
    expect(f.direction).toBe("column");
    expect(f.cell).toBe(Math.floor((match.cell * 2) / 3)); // 프레임을 셋으로
    expect(f.cell).toBeLessThanOrEqual(364);
  });

  it("칸은 언제나 정사각이고 매치 칸보다 작다 (같은 프레임을 셋으로 나누므로)", () => {
    for (const [w, h, top] of [
      [1440, 900, 220],
      [844, 390, 12],
      [390, 844, 90],
      [1280, 720, 220],
    ] as const) {
      const match = computeStageLayout({ width: w, height: h, top });
      const final = computeFinalLayout({ width: w, height: h, top });
      expect(final.cell).toBeLessThan(match.cell);
      expect(final.frameH).toBe(match.frameH);
      expect(Number.isInteger(final.cell)).toBe(true);
      if (final.direction === "row") {
        expect(final.frameW).toBe(match.frameW); // 좌우 3칸: 매치 프레임 그대로
      } else {
        // 상하 3단: 프레임이 화면 폭을 쓰고 좁아진 칸을 가운데 둔다 (아트보드 22)
        expect(final.frameW).toBeGreaterThanOrEqual(match.frameW);
        expect(final.frameW).toBe(w - 24);
      }
    }
  });
});
