/**
 * deriveRankState — 차트 화면이 무엇을 그릴지 정하는 순수 판정 (D-30 · 정본 §5).
 *
 * 없어진 상태가 하나 있다: **locked**. 마감 전 잠금은 W-7이었고 D-30으로 폐기됐다.
 * 대신 생긴 상태가 **waiting** — 판이 10에 닿기 전의 기다림이다. 캐시 문서가 아예 없는
 * 경우도 팬에게는 같은 상황이라 같은 상태로 합친다(대표 승인 A8).
 */
import { describe, expect, it } from "vitest";
import {
  MIN_RUNS_FOR_CHART,
  deriveRankState,
  resolveHelpText,
  showNextUpdateLine,
} from "../../ranking/rankState";
import { MARKETING_PENDING } from "../../i18n/messages";

const cacheWith = (runsTotal: number, rows = 3) => ({
  runsTotal,
  rankings: Array.from({ length: rows }, (_, i) => ({ contestantId: `c${i}` })),
});

describe("deriveRankState", () => {
  it("첫 스냅샷이 오기 전에는 loading", () => {
    expect(deriveRankState(undefined)).toBe("loading");
  });

  it("캐시 문서가 없으면 waiting — 기다림 안내로 합친다", () => {
    expect(deriveRankState(null)).toBe("waiting");
  });

  it("완주 판수가 10 미만이면 waiting — 점수를 보여 주지 않는다 (정본 §5)", () => {
    expect(deriveRankState(cacheWith(MIN_RUNS_FOR_CHART - 1))).toBe("waiting");
  });

  it("완주 판수가 10에 닿는 순간 차트가 열린다 (정본 §5 '10판에 닿는 순간부터')", () => {
    expect(deriveRankState(cacheWith(MIN_RUNS_FOR_CHART))).toBe("loaded");
  });

  it("판수는 넘었는데 줄이 하나도 없으면 waiting", () => {
    expect(deriveRankState(cacheWith(50, 0))).toBe("waiting");
  });

  it("runsTotal 필드가 없는 옛 캐시는 waiting — 다음 발표가 채운다", () => {
    expect(deriveRankState({ rankings: [{ contestantId: "c0" }] })).toBe("waiting");
  });

  it("마감 전이라고 잠그지 않는다 — locked 상태는 없다 (D-30)", () => {
    // 마감이 한참 남은 대회라도 판수만 차면 열린다.
    expect(deriveRankState(cacheWith(999))).toBe("loaded");
  });
});

describe("showNextUpdateLine", () => {
  const NOW = 1_000_000;

  it("마감 전이면 다음 발표 줄을 보여 준다 (D-30으로 사실이 됐다)", () => {
    expect(showNextUpdateLine(NOW + 1, NOW)).toBe(true);
  });

  it("마감이 지나면 감춘다 — 더 발표되지 않으므로 거짓말이 된다", () => {
    expect(showNextUpdateLine(NOW - 1, NOW)).toBe(false);
  });

  it("마감 시각이 없는 대회는 보여 준다", () => {
    expect(showNextUpdateLine(null, NOW)).toBe(true);
  });

  it("대회 문서를 아직 못 읽었으면 감춘다", () => {
    expect(showNextUpdateLine(undefined, NOW)).toBe(false);
  });
});

describe("resolveHelpText — Crown Score 설명창(?)", () => {
  it("줄바꿈으로 나뉜 문구를 줄 배열로 돌려준다 (첫 줄 요약 + 항목 3줄)", () => {
    expect(
      resolveHelpText("요약입니다.\n· 하나 40%\n· 둘 30%\n· 셋 30%"),
    ).toEqual(["요약입니다.", "· 하나 40%", "· 둘 30%", "· 셋 30%"]);
  });

  it("빈 줄은 버린다 — 문안 사이 여백이 빈 항목으로 새지 않게", () => {
    expect(resolveHelpText("요약\n\n· 하나")).toEqual(["요약", "· 하나"]);
  });

  it("마케팅 대기 표식이면 null — 자리만 두고 그리지 않는다", () => {
    expect(resolveHelpText(MARKETING_PENDING)).toBeNull();
  });

  it("빈 문자열도 null", () => {
    expect(resolveHelpText("")).toBeNull();
    expect(resolveHelpText("   ")).toBeNull();
  });
});
