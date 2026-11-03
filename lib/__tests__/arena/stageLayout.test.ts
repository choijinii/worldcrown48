/**
 * YT-FIX-1 — 무대 상자 크기 (원장 D-76 · 시안 Arena Match Stage v5).
 *
 * 숫자는 시안 값이다. 상자는 16:9 고, 재생 200×200 · 포스터 120×70 하한은 정책(III.C.1)이다.
 */
import { describe, expect, it } from "vitest";
import {
  computeFinalLayout,
  computeStageLayout,
  pickViewportHeight,
  stageMode,
  stageBoxSize, bannerPush
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
const DESK = { width: 1440, height: 900, top: 211 };
const PORT = { width: 390, height: 844, top: 216 };
const LAND = { width: 844, height: 390, top: 62 };

const wh = (b: { w: number; h: number }) => `${b.w}×${b.h}`;

describe("computeStageLayout — 시안 v5 값 (D-76)", () => {
  it("데스크톱 1440 — 640×360 두 칸 · 포커스 768×432 + 512×288 · 프레임 1320", () => {
    const l = computeStageLayout(DESK);
    expect([wh(l.base), wh(l.big), wh(l.small)]).toEqual(["640×360", "768×432", "512×288"]);
    expect(l.frameW).toBe(1320);
    expect(l.rowH).toBe(432);
  });

  it("휴대폰 세로 390 — 320×180 위아래 · 재생 364×205 · 옆 칸 그대로", () => {
    const l = computeStageLayout(PORT);
    expect(l.direction).toBe("column");
    expect([wh(l.base), wh(l.big), wh(l.small)]).toEqual(["320×180", "364×205", "320×180"]);
  });

  it("휴대폰 가로 844 — 330×186 · 재생 366×206", () => {
    const l = computeStageLayout(LAND);
    expect([wh(l.base), wh(l.big)]).toEqual(["330×186", "366×206"]);
  });

  it("데스크톱이 낮으면 첫 화면에 들어가게 줄어든다", () => {
    const l = computeStageLayout({ width: 1440, height: 760, top: 211 });
    expect(l.big.h).toBeLessThan(432);
    expect(l.big.w / l.big.h).toBeCloseTo(16 / 9, 1);
  });
});

describe("computeFinalLayout — 시안 v5 값 (D-76)", () => {
  it("데스크톱 1440 — 426×240 세 칸 · 호버 1.12배", () => {
    const l = computeFinalLayout(DESK);
    expect(wh(l.base)).toBe("426×240");
    expect(l.big.w).toBe(478);
    expect(l.big.w + 2 * l.small.w).toBeLessThanOrEqual(1281);
  });

  it("휴대폰 세로 — 320×180 세 칸 · 재생 364×205", () => {
    const l = computeFinalLayout(PORT);
    expect([wh(l.base), wh(l.big)]).toEqual(["320×180", "364×205"]);
  });

  it("휴대폰 가로 — 240×135 · 재생 366×206 · 옆 183×103", () => {
    const l = computeFinalLayout(LAND);
    expect([wh(l.base), wh(l.big), wh(l.small)]).toEqual(["240×135", "366×206", "183×103"]);
  });
});

describe("정책 하한 — 재생 200×200 · 포스터 120×70 (III.C.1)", () => {
  const screens = [
    [1024, 600], [1024, 768], [1280, 720], [1440, 900], [1920, 1080], [2560, 1440],
    [320, 568], [360, 640], [375, 667], [390, 844], [412, 915], [768, 1024],
    [568, 320], [640, 360], [667, 375], [844, 390], [915, 412], [1000, 500],
  ] as const;

  it.each(screens)("%i×%i", (width, height) => {
    for (const compute of [computeStageLayout, computeFinalLayout]) {
      const l = compute({ width, height, top: 200 });
      expect(l.big.w).toBeGreaterThanOrEqual(200);
      expect(l.big.h).toBeGreaterThanOrEqual(200);
      for (const b of [l.base, l.small]) {
        expect(b.w).toBeGreaterThanOrEqual(120);
        expect(b.h).toBeGreaterThanOrEqual(70);
      }
    }
  });

  it("상자는 언제나 16:9", () => {
    for (const [width, height] of screens) {
      const l = computeStageLayout({ width, height, top: 200 });
      for (const b of [l.base, l.big, l.small]) expect(Math.abs(b.h - (b.w * 9) / 16)).toBeLessThanOrEqual(0.5);
    }
  });
});

describe("stageBoxSize", () => {
  const l = computeStageLayout(DESK);
  it("아무도 없으면 base · 포커스 칸 big · 옆 칸 small", () => {
    expect(stageBoxSize(l, false, false)).toEqual(l.base);
    expect(stageBoxSize(l, true, true)).toEqual(l.big);
    expect(stageBoxSize(l, false, true)).toEqual(l.small);
  });
});

describe("bannerPush — 버튼 아래 한 줄이 배너를 덮지 않게 배너를 민다 (D-76)", () => {
  it("겹치지 않으면 밀지 않는다 (데스크톱 실패 줄 790 · 배너 794)", () => {
    expect(bannerPush({ noteBottom: 790.3, bannerTop: 794.5, currentPush: 0 })).toBe(0);
  });
  it("휴대폰 세로 — 겹친 만큼 + 6 띄움 (실패 줄 720 · 배너 706 → 20)", () => {
    expect(bannerPush({ noteBottom: 720, bannerTop: 706, currentPush: 0 })).toBe(20);
  });
  it("이미 민 상태에서 다시 재도 같은 값 — 원래 자리 기준", () => {
    expect(bannerPush({ noteBottom: 720, bannerTop: 726, currentPush: 20 })).toBe(20);
  });
  it("두 줄이면 더 민다 · 줄이 사라지면 0", () => {
    expect(bannerPush({ noteBottom: 736.7, bannerTop: 706, currentPush: 0 })).toBe(37);
    expect(bannerPush({ noteBottom: null, bannerTop: 726, currentPush: 20 })).toBe(0);
  });
});
