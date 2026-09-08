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

describe("RUN-1 — 마감·게스트 코드 (v2.1)", () => {
  it("deadline_passed 는 마감 안내로 간다 — 일반 실패 배너가 아니다", () => {
    // 2026-09-06 P0: 마감 거부가 "투표에 실패했어요"로 보였다. 그게 사고의 전부였다.
    expect(
      voteErrorMessageKey({
        code: "functions/failed-precondition",
        details: { code: "deadline_passed" },
      }),
    ).toBe("arena.run.deadlinePassed");
  });

  it("guest_limit 은 토스트 키로 매핑되지 않는다 — 모달로 간다 (AC 17)", () => {
    // 토스트로 흘리면 Google 버튼이 없는 안내가 되어 전환 경로가 사라진다.
    expect(
      voteErrorMessageKey({
        code: "functions/permission-denied",
        details: { code: "guest_limit" },
      }),
    ).toBe("arena.vote.failed");
  });
});
