/**
 * RUN-1 PR 3 · AC 15 — 랭킹 화면의 "다음 발표" 한 줄이 어느 문구를 쓸지 정하는 순수 함수.
 *
 * 시계를 **주입**해서 테스트한다(§3.0 대표 조건 2와 같은 이유) — 함수가 스스로 `new Date()`
 * 를 읽으면 날짜 경계가 결정적으로 검증되지 않고, 그게 자정 근처에 틀린 글자를 띄운다.
 *
 * 판정은 시각이 아니라 **날짜**로 한다(§8 발표 시각 표기 규칙): 다음 발표 시각의 KST 날짜가
 * 오늘과 같으면 "today", 다음 날이면 "tomorrow".
 *
 * ⚠️ 새벽 구간(KST 00:00~08:59)은 다음 발표가 **오늘 09:00** 인데, 승인 문구는 "오늘 21:00"
 * 과 "내일 09:00" 두 개뿐이라 이 사실을 말할 문구가 없다. 문구를 새로 지어내지 않고
 * **줄을 감춘다**(null). "오늘 21:00"을 쓰면 12시간 틀린 시각을 말하고, "내일 09:00"을 쓰면
 * 날짜가 틀린다 — 둘 다 팬에게 거짓말이다.
 */
import { describe, expect, it } from "vitest";
import { kstHour, nextRankingUpdate } from "@/lib/ranking/nextRankingUpdate";

describe("nextRankingUpdate — 발표 문구 판정 (AC 15)", () => {
  it("09:00 정각 → 다음은 오늘 21:00", () => {
    expect(nextRankingUpdate(9)).toBe("today");
  });

  it("오후(12시) → 다음은 오늘 21:00", () => {
    expect(nextRankingUpdate(12)).toBe("today");
  });

  it("20:59 구간(20시) → 아직 오늘 21:00", () => {
    expect(nextRankingUpdate(20)).toBe("today");
  });

  it("21:00 정각 → 다음은 내일 09:00 (날짜가 넘어간다)", () => {
    expect(nextRankingUpdate(21)).toBe("tomorrow");
  });

  it("23시 → 내일 09:00", () => {
    expect(nextRankingUpdate(23)).toBe("tomorrow");
  });

  it("자정(0시) → 승인 문구가 없는 구간이라 줄을 감춘다", () => {
    expect(nextRankingUpdate(0)).toBeNull();
  });

  it("08시 → 여전히 감춘다 (다음 발표가 '오늘 09:00'이라 표현할 문구가 없다)", () => {
    expect(nextRankingUpdate(8)).toBeNull();
  });

  it("20→21 경계에서 today→tomorrow 로 정확히 한 번 바뀐다", () => {
    expect(nextRankingUpdate(20)).toBe("today");
    expect(nextRankingUpdate(21)).toBe("tomorrow");
  });
});

describe("kstHour — 주입된 순간의 KST 시(hour)", () => {
  it("UTC 00:00 → KST 09시", () => {
    expect(kstHour(new Date("2026-09-10T00:00:00Z"))).toBe(9);
  });

  it("UTC 12:00 → KST 21시", () => {
    expect(kstHour(new Date("2026-09-10T12:00:00Z"))).toBe(21);
  });

  it("UTC 15:00 = KST 자정 → 0 (24가 아니다)", () => {
    // 로케일에 따라 자정을 24로 내놓는 구현이 있다 — 그러면 판정이 통째로 무너진다.
    expect(kstHour(new Date("2026-09-10T15:00:00Z"))).toBe(0);
  });

  it("UTC 14:59:59 → KST 23시 (자정 직전)", () => {
    expect(kstHour(new Date("2026-09-10T14:59:59Z"))).toBe(23);
  });

  it("UTC 23:00 → KST 8시 (날짜가 이미 넘어간 새벽 구간)", () => {
    expect(kstHour(new Date("2026-09-10T23:00:00Z"))).toBe(8);
  });
});
