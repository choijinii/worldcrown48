/**
 * ARENA-1 PR 2b — 선택 확정 연출 타임라인 (디자인 정본 아트보드 10~14 · 27 · 원장 D-11 · D-28).
 *
 * 520ms 안의 순서:
 *   0ms      금색 테두리·그림자 즉시
 *   0→180ms  고른 칸 1.20 → 1.235 → 1.20 스냅 (크기만)
 *   0→300ms  금색 고리 두 겹이 0.55 → 1.5배로 퍼지며 투명해짐
 *   0ms      옆칸 밝기 40%
 *   520ms    다음 매치 (기존 onVote 흐름)
 *
 * reduced-motion(아트보드 27): 스냅·고리 없음, 나머지는 즉시, **520ms 자동 넘김 대신 버튼**.
 * 크라운 글리프는 넣지 않는다 — 디자인 데이터에 남아 있어도 무시(D-28).
 */
import { describe, expect, it } from "vitest";
import { CONFIRM_HOLD_MS, confirmTimeline } from "@/lib/arena/confirmTimeline";

describe("confirmTimeline — 움직이는 경우 (매치 무대 1.2배)", () => {
  const t = confirmTimeline({ baseScale: 1.2, reducedMotion: false });

  it("확정 유지 520ms 뒤 자동으로 다음 매치", () => {
    expect(t.holdMs).toBe(520);
    expect(CONFIRM_HOLD_MS).toBe(520);
    expect(t.autoAdvance).toBe(true);
    expect(t.needsButton).toBe(false);
  });

  it("크기 스냅 1.20 → 1.235 → 1.20, 180ms 안에 끝난다", () => {
    expect(t.snap).toEqual([
      { atMs: 0, scale: 1.2 },
      { atMs: 90, scale: 1.235 },
      { atMs: 180, scale: 1.2 },
    ]);
  });

  it("금색 고리 두 겹 · 0.55 → 1.5배 · 300ms · 투명해짐", () => {
    expect(t.rings).toEqual({ count: 2, fromScale: 0.55, toScale: 1.5, durationMs: 300 });
  });

  it("옆칸 밝기 40% · 테두리와 그림자는 0ms", () => {
    expect(t.sideBrightness).toBe(0.4);
    expect(t.borderAtMs).toBe(0);
  });
});

describe("confirmTimeline — 결승 (1.3배 · D-29)", () => {
  it("스냅은 같은 문법으로 기준 배율 위에 얹힌다", () => {
    const t = confirmTimeline({ baseScale: 1.3, reducedMotion: false });
    expect(t.snap.map((s) => s.scale)).toEqual([1.3, 1.335, 1.3]);
    expect(t.rings.count).toBe(2);
    expect(t.holdMs).toBe(520);
  });
});

describe("confirmTimeline — prefers-reduced-motion (아트보드 27)", () => {
  const t = confirmTimeline({ baseScale: 1.2, reducedMotion: true });

  it("스냅 없음 — 고른 칸은 1.0", () => {
    expect(t.snap).toEqual([{ atMs: 0, scale: 1 }]);
  });

  it("고리 확장 없음", () => {
    expect(t.rings.count).toBe(0);
  });

  it("기다리는 시간 없음 — 자동 넘김 대신 버튼", () => {
    expect(t.holdMs).toBe(0);
    expect(t.autoAdvance).toBe(false);
    expect(t.needsButton).toBe(true);
  });

  it("테두리·그림자·옆칸 40% 는 전환 없이 즉시", () => {
    expect(t.borderAtMs).toBe(0);
    expect(t.sideBrightness).toBe(0.4);
    expect(t.transitionMs).toBe(0);
  });
});
