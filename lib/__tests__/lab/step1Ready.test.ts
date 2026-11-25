import { describe, it, expect } from "vitest";
import { isStep1NextReady, isStep1Ready, type Step1State } from "@/lib/lab/step1Ready";

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

// LAB-FIX-6 3-2 — 설명은 필수. [다음 →]만 막는다 — 발행 문(isStep1Ready)은 그대로라, 설명이 빈 옛 초안은
// STEP 1을 다시 열 때만 막힌다(지시서 3-2 · 발행된 대회는 손대지 않는다).
describe("isStep1NextReady — [다음 →]은 설명도 있어야", () => {
  it("설명이 있으면 켜진다", () => {
    expect(isStep1NextReady({ ...ready, description: "현역 아이돌" })).toBe(true);
  });
  it("설명이 비거나 공백뿐이면 꺼진다", () => {
    expect(isStep1NextReady({ ...ready, description: "" })).toBe(false);
    expect(isStep1NextReady({ ...ready, description: "   \n " })).toBe(false);
  });
  it("다른 필수 칸이 비면 설명이 있어도 꺼진다", () => {
    expect(isStep1NextReady({ ...ready, title: "", description: "x" })).toBe(false);
  });
  it("발행 문은 설명을 보지 않는다(옛 초안 보호)", () => {
    expect(isStep1Ready(ready)).toBe(true);
  });
});
