import { describe, it, expect } from "vitest";
import {
  ROUND_CONFIG,
  FINAL_ROUND,
  matchCountForRound,
  contestantsForRound,
  isFinalRound,
  roundName,
} from "@/lib/arena/roundConfig";

describe("roundConfig", () => {
  it("halves matches each round: 24, 12, 6, 3, 1", () => {
    expect([1, 2, 3, 4, 5].map((r) => matchCountForRound(r as 1))).toEqual([
      24, 12, 6, 3, 1,
    ]);
  });

  it("halves contestants each round: 48, 24, 12, 6, 3", () => {
    expect([1, 2, 3, 4, 5].map((r) => contestantsForRound(r as 1))).toEqual([
      48, 24, 12, 6, 3,
    ]);
  });

  it("marks only round 5 as THE FINAL", () => {
    expect(isFinalRound(5)).toBe(true);
    expect([1, 2, 3, 4].some((r) => isFinalRound(r as 1))).toBe(false);
    expect(FINAL_ROUND).toBe(5);
  });

  it("uses WC48 round names — never FIFA R16/QF/SF", () => {
    expect(roundName(1, "en")).toBe("ROUND OF 48");
    expect(roundName(2, "en")).toBe("ROUND OF 24");
    expect(roundName(4, "en")).toBe("ROUND OF 6");
    expect(roundName(5, "en")).toBe("THE FINAL");
    expect(roundName(5, "ko")).toBe("결승");
    const allNames = [1, 2, 3, 4, 5].flatMap((r) => [
      roundName(r as 1, "en"),
      roundName(r as 1, "ko"),
    ]);
    expect(allNames.join(" ")).not.toMatch(/ROUND OF 16|QUARTER|SEMI/i);
  });

  it("exposes a config entry per round 1..5", () => {
    expect(Object.keys(ROUND_CONFIG)).toEqual(["1", "2", "3", "4", "5"]);
  });
});
