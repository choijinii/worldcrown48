/**
 * LAB-EV-1 Phase A — 루프 구간·플레이어 파라미터 (W3 · ADR-EV-1 · ADR-EV-3).
 *
 * 루프는 10초 무음 고정(ADR-EV-1). 영상이 그보다 짧거나 시작점이 끝에 붙어
 * 있으면 구간을 접어 넣어야 재생이 성립한다(§8). 카드 노출 조합(크롭·클릭
 * 차단·controls=0·출처 칩)은 ADR-EV-3 — 파라미터 쪽 절반을 여기서 잠근다.
 */
import { describe, expect, it } from "vitest";
import { LOOP_SECONDS, MAX_CONCURRENT_PLAYERS, BRACKET_SIZES } from "@/lib/embed/constants";
import { resolveLoopRange, buildPlayerVars, buildWatchUrl } from "@/lib/embed/loopRange";

describe("resolveLoopRange — 10초 구간 (§8)", () => {
  it("보통 영상 → start ~ start+10", () => {
    expect(resolveLoopRange({ startSec: 60, durationSec: 232 })).toEqual({
      startSec: 60,
      endSec: 70,
    });
  });

  it("끝에 붙은 시작점 → end는 영상 길이까지만", () => {
    expect(resolveLoopRange({ startSec: 228, durationSec: 232 })).toEqual({
      startSec: 228,
      endSec: 232,
    });
  });

  it("시작점이 영상 밖 → 마지막 10초로 당긴다", () => {
    expect(resolveLoopRange({ startSec: 300, durationSec: 232 })).toEqual({
      startSec: 222,
      endSec: 232,
    });
  });

  it("10초보다 짧은 영상 → 전체가 루프", () => {
    expect(resolveLoopRange({ startSec: 5, durationSec: 8 })).toEqual({
      startSec: 0,
      endSec: 8,
    });
  });

  it("음수 시작점은 0으로", () => {
    expect(resolveLoopRange({ startSec: -5, durationSec: 232 })).toEqual({
      startSec: 0,
      endSec: 10,
    });
  });

  it("길이를 모르면 start+10을 그대로 믿는다 (플레이어가 알아서 끝난다)", () => {
    expect(resolveLoopRange({ startSec: 60, durationSec: null })).toEqual({
      startSec: 60,
      endSec: 70,
    });
  });

  it("루프 길이는 상수로 주입 가능 (후속 킥이 3초를 다시 꺼내지 않도록 기본은 10)", () => {
    expect(LOOP_SECONDS).toBe(10);
    expect(resolveLoopRange({ startSec: 0, durationSec: 100, loopSec: 4 })).toEqual({
      startSec: 0,
      endSec: 4,
    });
  });
});

describe("buildPlayerVars — ADR-EV-3 카드 노출 조합", () => {
  const vars = buildPlayerVars({ startSec: 60, endSec: 70 });

  it("무음·컨트롤 없음·인라인 재생 고정", () => {
    expect(vars.mute).toBe(1);
    expect(vars.controls).toBe(0);
    expect(vars.playsinline).toBe(1);
  });

  it("구간을 플레이어에 넘긴다", () => {
    expect(vars.start).toBe(60);
    expect(vars.end).toBe(70);
  });

  it("추천 영상·키보드·정보 오버레이를 끈다 (카드에 유튜브 UI가 새지 않게)", () => {
    expect(vars.rel).toBe(0);
    expect(vars.modestbranding).toBe(1);
    expect(vars.disablekb).toBe(1);
    expect(vars.iv_load_policy).toBe(3);
  });
});

describe("buildWatchUrl — [원본 열기] · 출처 칩 (ADR-EV-2 · ADR-EV-3)", () => {
  it("시작 초를 달아 원본 watch 페이지로 보낸다", () => {
    expect(buildWatchUrl("9bZkp7q19f0", 90)).toBe(
      "https://www.youtube.com/watch?v=9bZkp7q19f0&t=90s",
    );
  });

  it("시작 초가 없으면 t 없이", () => {
    expect(buildWatchUrl("9bZkp7q19f0")).toBe(
      "https://www.youtube.com/watch?v=9bZkp7q19f0",
    );
  });
});

describe("공용 상수 (ADR-EV-4 · ADR-EV-6)", () => {
  it("동시 플레이어 상한은 lib/embed 단일 소스", () => {
    expect(MAX_CONCURRENT_PLAYERS).toBe(6);
  });

  it("브래킷 규모는 48 하드코딩이 아니라 목록 (32·16 추가 대비)", () => {
    expect(BRACKET_SIZES).toEqual([48, 24, 12]);
  });
});
