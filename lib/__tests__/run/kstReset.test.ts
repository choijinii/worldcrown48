/**
 * kstReset — 자정 리셋 판정이 리포 전체에서 하나뿐임을 고정한다.
 *
 * 1안(회차 누적 + 오늘 판 수)에서 자정 리셋은 문서 id가 아니라 코드 판정이 됐다.
 * 핸드오프 §3.0 조건 2가 지목한 "1안이 새로 만든 유일한 위험"이 여기다.
 */
import { describe, expect, it } from "vitest";
import { isSameKstDay } from "@/lib/run/kstReset";

describe("isSameKstDay", () => {
  it("① 같은 날이면 true", () => {
    expect(isSameKstDay("2026-09-05", "2026-09-05")).toBe(true);
  });

  it("② 어제면 false — 어제 값은 없는 것으로 본다", () => {
    expect(isSameKstDay("2026-09-04", "2026-09-05")).toBe(false);
  });

  it("③ 문서가 없어 날짜가 null이면 false", () => {
    expect(isSameKstDay(null, "2026-09-05")).toBe(false);
  });

  it("④ 빈 문자열도 false — 손상된 필드를 오늘로 읽지 않는다", () => {
    expect(isSameKstDay("", "2026-09-05")).toBe(false);
  });
});
