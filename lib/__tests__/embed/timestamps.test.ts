/**
 * LAB-EV-1 Phase A — 타임스탬프·길이 파서 (W2 재료).
 *
 * 댓글의 "1:23 여기가 킬링파트"와 설명란 챕터의 "0:00 Intro"는 같은 표기법을
 * 쓴다. 그리고 API가 주는 길이는 ISO-8601(PT3M52S)이다 — 셋 다 초로 환산해야
 * 루프 구간을 계산할 수 있다.
 */
import { describe, expect, it } from "vitest";
import {
  extractTimestamps,
  parseIso8601Duration,
  parseTimestamp,
} from "@/lib/embed/timestamps";

describe("parseTimestamp — m:ss · h:mm:ss", () => {
  it.each([
    ["0:00", 0],
    ["1:23", 83],
    ["12:34", 754],
    ["1:02:03", 3723],
    ["01:02:03", 3723],
    ["0:05", 5],
  ])("%s → %i초", (raw, sec) => {
    expect(parseTimestamp(raw)).toBe(sec);
  });

  it("초/분이 60을 넘으면 표기 오류로 본다", () => {
    expect(parseTimestamp("1:75")).toBeNull();
    expect(parseTimestamp("1:75:00")).toBeNull();
  });

  it("타임스탬프가 아니면 null", () => {
    expect(parseTimestamp("123")).toBeNull();
    expect(parseTimestamp("")).toBeNull();
    expect(parseTimestamp("1:2:3:4")).toBeNull();
  });
});

describe("extractTimestamps — 댓글 한 줄에서 채굴", () => {
  it("여러 개를 순서대로 뽑는다", () => {
    expect(extractTimestamps("1:23 최고 그리고 2:05도 좋음")).toEqual([83, 125]);
  });

  it("같은 댓글 안의 중복은 한 번만 센다", () => {
    expect(extractTimestamps("1:23 1:23 1:23")).toEqual([83]);
  });

  it("타임스탬프가 없으면 빈 배열", () => {
    expect(extractTimestamps("진짜 명곡이다")).toEqual([]);
  });

  it("숫자에 붙은 잡음(괄호·화살표)에 견딘다", () => {
    expect(extractTimestamps("(1:23) → 여기")).toEqual([83]);
  });

  it("전화번호처럼 보이는 긴 숫자열은 줍지 않는다", () => {
    expect(extractTimestamps("010-1234-5678")).toEqual([]);
  });

  it("h:mm:ss도 줍는다", () => {
    expect(extractTimestamps("1:02:03 대박")).toEqual([3723]);
  });
});

describe("parseIso8601Duration — contentDetails.duration", () => {
  it.each([
    ["PT3M52S", 232],
    ["PT10S", 10],
    ["PT1H2M3S", 3723],
    ["PT1H", 3600],
    ["P0D", 0],
  ])("%s → %i초", (raw, sec) => {
    expect(parseIso8601Duration(raw)).toBe(sec);
  });

  it("라이브 스트림 등 해석 불가 → null", () => {
    expect(parseIso8601Duration("")).toBeNull();
    expect(parseIso8601Duration("garbage")).toBeNull();
    expect(parseIso8601Duration(undefined)).toBeNull();
  });
});
