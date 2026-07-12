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
    const text = JSON.stringify(
      Array.from({ length: 48 }, () => ({
        name: "X",
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

  it("wrong_count is measured against expectedCount, not always 48", () => {
    try {
      parseAiContestants(fakeArray(48), 1);
    } catch (e) {
      expect((e as ContestantParseError).reason).toBe("wrong_count");
      expect((e as ContestantParseError).received).toBe(48);
    }
  });

  it("throws unparseable / not_array / wrong_count with reasons", () => {
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
    try {
      parseAiContestants(fakeArray(47));
    } catch (e) {
      expect((e as ContestantParseError).reason).toBe("wrong_count");
      expect((e as ContestantParseError).received).toBe(47);
    }
  });
});
