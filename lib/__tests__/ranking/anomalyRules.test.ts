/**
 * anomalyRules — T-1/T-2/T-3/T-4 positive / negative / boundary (handoff §7).
 */
import { describe, expect, it } from "vitest";
import {
  buildAlertDetail,
  checkT1,
  checkT2,
  checkT3,
  checkT4,
  evaluateAnomalies,
} from "../../ranking/anomalyRules";
import type { RankingEntry, RankingSnapshot } from "../../ranking/rankingTypes";

const entry = (
  contestantId: string,
  rank: number,
  rate: number,
  voteCount: number,
  name = contestantId,
): RankingEntry => ({ contestantId, rank, rate, voteCount, name, videoId: null });

const snap = (rankings: RankingEntry[], generationSequence = 0): RankingSnapshot => ({
  tournamentId: "t1",
  rankings,
  totalVotes: rankings.reduce((s, r) => s + r.voteCount, 0),
  generationSequence,
});

describe("T-1 — #1 rate ≥ 60%", () => {
  it("positive at boundary 60", () => {
    expect(checkT1(snap([entry("a", 1, 60, 60)]))).toBe(true);
  });
  it("positive at 99.9", () => {
    expect(checkT1(snap([entry("a", 1, 99.9, 999)]))).toBe(true);
  });
  it("negative at 59.9", () => {
    expect(checkT1(snap([entry("a", 1, 59.9, 59)]))).toBe(false);
  });
  it("negative on empty rankings", () => {
    expect(checkT1(snap([]))).toBe(false);
  });
});

describe("T-2 — #1−#2 gap ≥ 30%p", () => {
  it("positive 55−22.5 = 32.5", () => {
    expect(checkT2(snap([entry("a", 1, 55, 55), entry("b", 2, 22.5, 22)]))).toBe(true);
  });
  it("positive at boundary 30 (40−10)", () => {
    expect(checkT2(snap([entry("a", 1, 40, 40), entry("b", 2, 10, 10)]))).toBe(true);
  });
  it("negative 40−11 = 29", () => {
    expect(checkT2(snap([entry("a", 1, 40, 40), entry("b", 2, 11, 11)]))).toBe(false);
  });
  it("negative with only 1 contestant", () => {
    expect(checkT2(snap([entry("a", 1, 100, 5)]))).toBe(false);
  });
});

describe("T-3 — 24h voteCount growth ≥ 200% (×3)", () => {
  const current = snap([entry("a", 1, 50, 30)]);
  it("positive at boundary growth 2.0 (10 → 30)", () => {
    const h24 = snap([entry("a", 1, 50, 10)]);
    expect(checkT3(current, h24)).toBe(true);
  });
  it("positive growth 3.0 (5 → 20)", () => {
    const cur = snap([entry("a", 1, 50, 20)]);
    const h24 = snap([entry("a", 1, 50, 5)]);
    expect(checkT3(cur, h24)).toBe(true);
  });
  it("negative growth 1.5 (10 → 25)", () => {
    const cur = snap([entry("a", 1, 50, 25)]);
    const h24 = snap([entry("a", 1, 50, 10)]);
    expect(checkT3(cur, h24)).toBe(false);
  });
  it("negative when history24 is null (Tournament < 24h)", () => {
    expect(checkT3(current, null)).toBe(false);
  });
  it("negative when 24h-ago voteCount is 0 (no divide-by-zero)", () => {
    const h24 = snap([entry("a", 1, 50, 0)]);
    expect(checkT3(current, h24)).toBe(false);
  });
  it("negative when top contestant absent from history24", () => {
    const h24 = snap([entry("z", 1, 50, 10)]);
    expect(checkT3(current, h24)).toBe(false);
  });
});

describe("T-4 — top-2 contestant was rank ≥ 3 one hour ago", () => {
  it("positive: C jumps 3 → 1", () => {
    const cur = snap([entry("c", 1, 40, 40), entry("a", 2, 35, 35), entry("b", 3, 25, 25)]);
    const h1 = snap([entry("a", 1, 40, 40), entry("b", 2, 35, 35), entry("c", 3, 25, 25)]);
    expect(checkT4(cur, h1)).toBe(true);
  });
  it("negative: no change", () => {
    const same = [entry("a", 1, 40, 40), entry("b", 2, 35, 35), entry("c", 3, 25, 25)];
    expect(checkT4(snap(same), snap(same))).toBe(false);
  });
  it("negative: 1↔2 swap is not a T-4", () => {
    const cur = snap([entry("b", 1, 51, 51), entry("a", 2, 49, 49)]);
    const h1 = snap([entry("a", 1, 51, 51), entry("b", 2, 49, 49)]);
    expect(checkT4(cur, h1)).toBe(false);
  });
  it("negative when history1 is null (first cron run)", () => {
    const cur = snap([entry("a", 1, 40, 40), entry("b", 2, 35, 35)]);
    expect(checkT4(cur, null)).toBe(false);
  });
});

describe("evaluateAnomalies", () => {
  it("returns [] for a calm ranking", () => {
    const cur = snap([entry("a", 1, 40, 40), entry("b", 2, 35, 35)]);
    expect(evaluateAnomalies(cur, cur, cur)).toEqual([]);
  });
  it("stacks multiple tags (T-1 + T-2) in order", () => {
    const cur = snap([entry("a", 1, 70, 70), entry("b", 2, 15, 15)]);
    expect(evaluateAnomalies(cur, null, null)).toEqual(["T-1", "T-2"]);
  });
});

describe("buildAlertDetail", () => {
  it("T-1 detail names the leader + rate", () => {
    const cur = snap([entry("a", 1, 70, 70, "Messi")]);
    expect(buildAlertDetail("T-1", cur, null, null)).toBe("#1 Messi at 70% (≥60% threshold)");
  });
  it("T-2 detail matches wireframe '%p over #2'", () => {
    const cur = snap([entry("a", 1, 55.5, 55), entry("b", 2, 22.2, 22)]);
    expect(buildAlertDetail("T-2", cur, null, null)).toBe("#1 lead margin 33.3%p over #2");
  });
  it("T-3 detail shows growth percent", () => {
    const cur = snap([entry("a", 1, 50, 30, "Ronaldo")]);
    const h24 = snap([entry("a", 1, 50, 10, "Ronaldo")]);
    expect(buildAlertDetail("T-3", cur, null, h24)).toBe("#1 Ronaldo +200% in 24h");
  });
  it("T-4 detail shows the rank jump", () => {
    const cur = snap([entry("c", 1, 40, 40, "Neymar"), entry("a", 2, 35, 35)]);
    const h1 = snap([entry("a", 1, 40, 40), entry("c", 3, 25, 25, "Neymar")]);
    expect(buildAlertDetail("T-4", cur, h1, null)).toBe("Neymar jumped rank 3→1");
  });
});
