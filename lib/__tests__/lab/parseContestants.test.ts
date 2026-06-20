import { describe, it, expect } from "vitest";
import {
  parseAiContestants,
  ContestantParseError,
} from "@/lib/lab/parseContestants";
import { TOTAL_CONTESTANTS } from "@/lib/types/tournament";

function fakeArray(n: number): string {
  const items = Array.from({ length: n }, (_, i) => ({
    name: `Player ${i + 1}`,
    nationality: "KR",
    position: "FW",
    imageSearchKeyword: `player ${i + 1} portrait`,
  }));
  return JSON.stringify(items);
}

describe("parseAiContestants", () => {
  it("parses a clean JSON array of 48 suggestions", () => {
    const result = parseAiContestants(fakeArray(TOTAL_CONTESTANTS));
    expect(result).toHaveLength(48);
    expect(result[0]).toEqual({
      name: "Player 1",
      nationality: "KR",
      position: "FW",
      imageSearchKeyword: "player 1 portrait",
    });
  });

  it("extracts the JSON array out of surrounding prose", () => {
    const text = `Sure! Here are 48 contestants:\n${fakeArray(48)}\nHope this helps.`;
    expect(parseAiContestants(text)).toHaveLength(48);
  });

  it("normalizes each entry to exactly the four suggestion fields", () => {
    const text = JSON.stringify(
      Array.from({ length: 48 }, () => ({
        name: "X",
        nationality: "US",
        position: "Guard",
        imageSearchKeyword: "x",
        extraField: "should be dropped",
      })),
    );
    const result = parseAiContestants(text);
    expect(result[0]).not.toHaveProperty("extraField");
    expect(Object.keys(result[0]).sort()).toEqual([
      "imageSearchKeyword",
      "name",
      "nationality",
      "position",
    ]);
  });

  it("throws unparseable when there is no JSON", () => {
    try {
      parseAiContestants("I cannot help with that request.");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ContestantParseError);
      expect((e as ContestantParseError).reason).toBe("unparseable");
    }
  });

  it("throws not_array when JSON is an object, not an array", () => {
    try {
      parseAiContestants('{"name":"solo"}');
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as ContestantParseError).reason).toBe("not_array");
    }
  });

  it("throws wrong_count with the received length when not 48", () => {
    try {
      parseAiContestants(fakeArray(47));
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ContestantParseError);
      expect((e as ContestantParseError).reason).toBe("wrong_count");
      expect((e as ContestantParseError).received).toBe(47);
    }
  });
});
