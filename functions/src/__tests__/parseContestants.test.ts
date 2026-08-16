import { describe, it, expect } from "vitest";
import {
  parseAiContestants,
  ContestantParseError,
  TOTAL_CONTESTANTS,
} from "../core/parseContestants";

function fakeArray(n: number): string {
  return JSON.stringify(
    Array.from({ length: n }, (_, i) => ({
      name: `Player ${i + 1}`,
      nationality: "KR",
      position: "FW",
      imageSearchKeyword: `player ${i + 1} portrait`,
    })),
  );
}

describe("parseAiContestants (functions)", () => {
  it("parses a clean JSON array of 48", () => {
    expect(parseAiContestants(fakeArray(TOTAL_CONTESTANTS))).toHaveLength(48);
  });

  it("extracts the array out of surrounding prose", () => {
    const text = `Here you go:\n${fakeArray(48)}\nDone.`;
    expect(parseAiContestants(text)).toHaveLength(48);
  });

  it("normalizes to exactly the four suggestion fields", () => {
    // 이름은 서로 달라야 한다 — AI-1부터 파서가 동명이인을 중복으로 접는다.
    const text = JSON.stringify(
      Array.from({ length: 48 }, (_, i) => ({
        name: `X${i + 1}`,
        nationality: "US",
        position: "Guard",
        imageSearchKeyword: "x",
        junk: 1,
      })),
    );
    expect(Object.keys(parseAiContestants(text)[0]).sort()).toEqual([
      "imageSearchKeyword",
      "name",
      "nationality",
      "position",
    ]);
  });

  it("accepts an explicit expectedCount (blank-only fill requests fewer)", () => {
    // 47칸 채우고 빈칸만 AI → 1명만 요청/파싱 (§8 edge).
    expect(parseAiContestants(fakeArray(1), 1)).toHaveLength(1);
    expect(parseAiContestants(fakeArray(5), 5)).toHaveLength(5);
  });

  it("throws unparseable / not_array with reasons", () => {
    expect(() => parseAiContestants("nope")).toThrowError(ContestantParseError);
    try {
      parseAiContestants("nope");
    } catch (e) {
      expect((e as ContestantParseError).reason).toBe("unparseable");
    }
    try {
      parseAiContestants('{"a":1}');
    } catch (e) {
      expect((e as ContestantParseError).reason).toBe("not_array");
    }
  });
});

/**
 * AI-1 — 과다 요청 + 관용 파싱 (대표 결정).
 * 프롬프트가 50~52명을 요청하고, 여기서 중복 제거 후 정확히 48명을 취한다.
 */
describe("parseAiContestants — 과다 공급 절단 · 중복 제거 · 부족분 허용 (AI-1)", () => {
  it("50~52명이 와도 앞에서부터 정확히 48명만 취한다", () => {
    for (const n of [49, 50, 52]) {
      const out = parseAiContestants(fakeArray(n));
      expect(out).toHaveLength(TOTAL_CONTESTANTS);
      expect(out[0].name).toBe("Player 1"); // 순서 보존
      expect(out[47].name).toBe("Player 48");
    }
  });

  it("blank-only 모드에서도 과다 공급분을 잘라낸다", () => {
    expect(parseAiContestants(fakeArray(48), 1)).toHaveLength(1);
    expect(parseAiContestants(fakeArray(48), 5)).toHaveLength(5);
  });

  it("중복은 먼저 나온 것만 남긴다 (대소문자·공백 차이 포함)", () => {
    const dupes = JSON.stringify([
      { name: "IU", nationality: "KR", position: "Vocal", imageSearchKeyword: "iu" },
      { name: "iu", nationality: "KR", position: "Vocal", imageSearchKeyword: "iu" },
      { name: "  I U  ", nationality: "KR", position: "Vocal", imageSearchKeyword: "iu" },
      { name: "Taeyeon", nationality: "KR", position: "Vocal", imageSearchKeyword: "ty" },
    ]);
    const out = parseAiContestants(dupes, 2);
    expect(out.map((c) => c.name)).toEqual(["IU", "I U"]);
  });

  it("이름이 빈 항목은 슬롯을 채우지 못한다", () => {
    const withBlanks = JSON.stringify([
      { name: "", nationality: "KR", position: "V", imageSearchKeyword: "x" },
      { name: "   ", nationality: "KR", position: "V", imageSearchKeyword: "x" },
      { name: "Rosé", nationality: "KR", position: "V", imageSearchKeyword: "rose" },
    ]);
    expect(parseAiContestants(withBlanks, 1).map((c) => c.name)).toEqual(["Rosé"]);
  });

  it("46·47명은 통과하고 45명은 실패한다 (floor = 48 - 2)", () => {
    expect(parseAiContestants(fakeArray(47))).toHaveLength(47);
    expect(parseAiContestants(fakeArray(46))).toHaveLength(46);
    try {
      parseAiContestants(fakeArray(45));
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as ContestantParseError).reason).toBe("wrong_count");
      expect((e as ContestantParseError).received).toBe(45);
    }
  });

  it("중복 제거 후 floor 미만이면 실패한다 (개수만 채운 응답을 거른다)", () => {
    // 48개지만 실제 인물은 3명 — 중복으로 개수만 맞춘 응답
    const padded = JSON.stringify(
      Array.from({ length: 48 }, (_, i) => ({
        name: `Player ${(i % 3) + 1}`,
        nationality: "KR",
        position: "FW",
        imageSearchKeyword: "x",
      })),
    );
    try {
      parseAiContestants(padded);
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as ContestantParseError).reason).toBe("wrong_count");
      expect((e as ContestantParseError).received).toBe(3);
    }
  });

  it("스키마는 불변이다 — 필드 4개 그대로 (RULE R1)", () => {
    expect(Object.keys(parseAiContestants(fakeArray(50))[0]).sort()).toEqual([
      "imageSearchKeyword",
      "name",
      "nationality",
      "position",
    ]);
  });
});
