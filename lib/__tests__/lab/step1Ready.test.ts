import { describe, it, expect } from "vitest";
import { isStep1Ready, type Step1State } from "@/lib/lab/step1Ready";

const NOW = 1_752_000_000_000;
const DAY = 86_400_000;
const VALID_IDS = ["KPOP", "FOOTBALL", "HOLLYWOOD"];

const ready: Step1State = {
  title: "Best K-POP Idols",
  category: "KPOP",
  keywords: ["idol", "dance"],
  deadlineMs: NOW + 7 * DAY,
  validCategoryIds: VALID_IDS,
  nowMs: NOW,
};

describe("isStep1Ready (STEP 1 → 다음 gate — ①②④⑤, AI 무관)", () => {
  it("is ready when title + category + ≥1 keyword + future deadline are all set", () => {
    expect(isStep1Ready(ready)).toBe(true);
  });

  it("does NOT require a description (③ optional)", () => {
    // description is not part of the state at all — presence is irrelevant.
    expect(isStep1Ready(ready)).toBe(true);
  });

  it("blocks on an empty title", () => {
    expect(isStep1Ready({ ...ready, title: "   " })).toBe(false);
  });

  it("blocks on an over-length title", () => {
    expect(isStep1Ready({ ...ready, title: "a".repeat(51) })).toBe(false);
  });

  it("blocks on a category not in the loaded id list", () => {
    expect(isStep1Ready({ ...ready, category: "NOPE" })).toBe(false);
    expect(isStep1Ready({ ...ready, validCategoryIds: [] })).toBe(false);
  });

  it("blocks on zero keywords (④ required — but a hand-typed one satisfies it)", () => {
    expect(isStep1Ready({ ...ready, keywords: [] })).toBe(false);
    expect(isStep1Ready({ ...ready, keywords: ["  "] })).toBe(false);
    expect(isStep1Ready({ ...ready, keywords: ["typed-by-hand"] })).toBe(true);
  });

  it("blocks on a past / missing deadline", () => {
    expect(isStep1Ready({ ...ready, deadlineMs: NOW - 1 })).toBe(false);
    expect(isStep1Ready({ ...ready, deadlineMs: NaN })).toBe(false);
  });
});
