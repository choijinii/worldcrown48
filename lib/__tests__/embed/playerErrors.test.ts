/**
 * LAB-EV-1 Phase C — 플레이어 런타임 에러 해석 (W3 · §8 마지막 항목).
 *
 * 검증은 통과했는데 재생이 실패하는 경우가 있다(권리자가 방금 임베드를 껐다).
 * 101·150은 "링크를 갈아야 한다"는 뜻이므로 videoStatus에 마킹할 근거가 된다.
 */
import { describe, expect, it } from "vitest";
import { describePlayerError, PLAYER_ERROR_CODES } from "@/lib/embed/playerErrors";
import { shouldLoopBack } from "@/lib/embed/loopRange";

describe("describePlayerError", () => {
  it("101·150 = 임베드 차단 → 마킹 대상", () => {
    for (const code of [PLAYER_ERROR_CODES.EMBED_BLOCKED, PLAYER_ERROR_CODES.EMBED_BLOCKED_ALT]) {
      expect(describePlayerError(code)).toMatchObject({
        kind: "embed-blocked",
        embedBlocked: true,
        retryable: false,
      });
    }
  });

  it("100 = 영상 없음/비공개 → 마킹 대상", () => {
    expect(describePlayerError(100)).toMatchObject({ kind: "not-found", embedBlocked: true });
  });

  it("5 = HTML5 내부 오류 → 재시도 가치 있음, 링크 문제 아님", () => {
    expect(describePlayerError(5)).toMatchObject({
      kind: "html5",
      embedBlocked: false,
      retryable: true,
    });
  });

  it("2 = 파라미터 오류 → 재시도해도 소용없다", () => {
    expect(describePlayerError(2)).toMatchObject({ kind: "invalid-param", retryable: false });
  });

  it("모르는 코드는 unknown (차단으로 단정하지 않는다)", () => {
    expect(describePlayerError(999)).toMatchObject({ kind: "unknown", embedBlocked: false });
  });
});

describe("shouldLoopBack — 이음매 없는 10초 루프", () => {
  const range = { startSec: 60, endSec: 70 };

  it("끝에 닿기 직전에 미리 되감는다 (검은 화면 방지)", () => {
    expect(shouldLoopBack(69.8, range)).toBe(true);
    expect(shouldLoopBack(70.5, range)).toBe(true);
  });

  it("구간 한가운데면 그대로 둔다", () => {
    expect(shouldLoopBack(65, range)).toBe(false);
  });

  it("구간보다 앞으로 튀면 되감는다", () => {
    expect(shouldLoopBack(3, range)).toBe(true);
  });

  it("시작 직후의 미세한 오차(±1초)는 되감지 않는다 — 무한 seek 방지", () => {
    expect(shouldLoopBack(59.5, range)).toBe(false);
  });
});
