import { describe, it, expect } from "vitest";
import {
  VOTE_ERROR_CODES,
  voteErrorDetailCode,
  voteErrorMessageKey,
} from "@/lib/voteErrorCodes";

describe("voteErrorDetailCode", () => {
  it("reads details.code off a Firebase HttpsError-shaped object", () => {
    expect(
      voteErrorDetailCode({ code: "functions/resource-exhausted", details: { code: "daily_limit" } }),
    ).toBe("daily_limit");
  });

  it("returns undefined when there are no details", () => {
    expect(voteErrorDetailCode({ code: "functions/resource-exhausted" })).toBeUndefined();
    expect(voteErrorDetailCode(null)).toBeUndefined();
    expect(voteErrorDetailCode("boom")).toBeUndefined();
  });
});

describe("voteErrorMessageKey (#12 — 3-language mapping)", () => {
  it("maps the daily_limit code to the daily-limit copy", () => {
    const key = voteErrorMessageKey({
      code: "functions/resource-exhausted",
      details: { code: VOTE_ERROR_CODES.DAILY_LIMIT },
    });
    expect(key).toBe("arena.vote.dailyLimit");
  });

  it("maps the rate_limited code to the cooldown copy", () => {
    const key = voteErrorMessageKey({
      code: "functions/resource-exhausted",
      details: { code: VOTE_ERROR_CODES.RATE_LIMITED },
    });
    expect(key).toBe("arena.vote.rateLimited");
  });

  it("falls back to cooldown copy for a legacy resource-exhausted (no details)", () => {
    const key = voteErrorMessageKey({ code: "functions/resource-exhausted" });
    expect(key).toBe("arena.vote.rateLimited");
  });

  it("maps anything else to the generic failure copy", () => {
    expect(voteErrorMessageKey({ code: "functions/internal" })).toBe("arena.vote.failed");
    expect(voteErrorMessageKey(new Error("x"))).toBe("arena.vote.failed");
  });
});
