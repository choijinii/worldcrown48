/**
 * ND-1 §3 #2 — newsDigestCore: ranking_cache → 기사 근거 수치. AC 3·4.
 *
 * The digest REUSES the existing ranking_cache (no new aggregation is invented).
 * CLAUDE.md 원칙 #8: absolutely NO Vote Count leaks into a digest — only rate %,
 * rank, Voter/Contestant counts, and dates. Every test that could surface a raw
 * tally asserts the internal voteCount never appears in any stat value.
 */
import { describe, expect, it } from "vitest";
import {
  buildOpenDigest,
  buildResultDigest,
  buildWeeklyDigest,
  formatKstMonthDay,
  type RankingRowLike,
} from "../core/newsDigestCore";

const rows: RankingRowLike[] = [
  { rank: 1, contestantId: "c1", name: "Blue Flame", rate: 33.3, voteCount: 999 },
  { rank: 2, contestantId: "c2", name: "Neon Tide", rate: 21.1, voteCount: 640 },
  { rank: 3, contestantId: "c3", name: "Last Splash", rate: 12.5, voteCount: 375 },
];

const meta = {
  id: "t_summer48",
  title: "2026 서머 컴백 타이틀곡 48",
  category: "KPOP",
  totalContestants: 48,
  deadlineMs: Date.UTC(2026, 7, 31, 3, 0, 0), // 2026-08-31 12:00 KST
};

describe("formatKstMonthDay", () => {
  it("renders an epoch ms as MM-DD in KST", () => {
    expect(formatKstMonthDay(Date.UTC(2026, 7, 31, 3, 0, 0))).toBe("08-31");
  });
  it("respects the KST day boundary (UTC 15:00 → next day)", () => {
    expect(formatKstMonthDay(Date.UTC(2026, 6, 21, 15, 0, 0))).toBe("07-22");
  });
});

describe("buildOpenDigest — 오픈 기사 근거 (아직 투표 없음)", () => {
  it("surfaces contestant count, deadline, languages — no votes needed", () => {
    const d = buildOpenDigest(meta, "2026-07-22 08:00 KST");
    const labels = d.stats.map((s) => s.label);
    expect(labels).toContain("CONTESTANTS");
    expect(labels).toContain("DEADLINE · KST");
    expect(labels).toContain("LANGUAGES");
    expect(d.stats.find((s) => s.label === "CONTESTANTS")?.value).toBe("48");
    expect(d.stats.find((s) => s.label === "DEADLINE · KST")?.value).toBe("08-31");
    expect(d.leaders).toEqual([]);
    expect(d.tournamentId).toBe("t_summer48");
    expect(d.asOf).toBe("2026-07-22 08:00 KST");
  });

  it("tolerates a missing deadline (shows TBD, no crash)", () => {
    const d = buildOpenDigest({ ...meta, deadlineMs: null }, "now");
    expect(d.stats.find((s) => s.label === "DEADLINE · KST")?.value).toBe("TBD");
  });
});

describe("buildResultDigest — 결과 기사 근거 (rate 기반, Vote Count 금지)", () => {
  it("surfaces the Champion + top rates as % — never a raw tally", () => {
    const d = buildResultDigest({
      meta,
      rankings: rows,
      championId: "c1",
      asOf: "2026-08-31 12:00 KST",
    });
    expect(d.leaders[0]).toMatchObject({ rank: 1, name: "Blue Flame", rate: 33.3 });
    const values = d.stats.map((s) => s.value).join(" | ");
    // The internal voteCount (999/640/375) must NEVER appear.
    expect(values).not.toMatch(/999|640|375/);
    // Rate is rendered as a percent.
    expect(values).toMatch(/33\.3%/);
  });

  it("marks the Champion among the leaders", () => {
    const d = buildResultDigest({
      meta,
      rankings: rows,
      championId: "c1",
      asOf: "x",
    });
    expect(d.leaders.find((l) => l.contestantId === "c1")?.isChampion).toBe(true);
    expect(d.leaders.find((l) => l.contestantId === "c2")?.isChampion).toBe(false);
  });

  it("caps leaders at the top 3", () => {
    const many: RankingRowLike[] = Array.from({ length: 10 }, (_, i) => ({
      rank: i + 1,
      contestantId: `c${i}`,
      name: `N${i}`,
      rate: 50 - i,
      voteCount: 100 - i,
    }));
    const d = buildResultDigest({ meta, rankings: many, championId: "c0", asOf: "x" });
    expect(d.leaders).toHaveLength(3);
  });
});

describe("buildWeeklyDigest — 주간 랭킹 동향 (현행 ranking_cache 누적 기반)", () => {
  const caches = [
    { tournamentId: "t1", title: "A48", rankings: rows },
    {
      tournamentId: "t2",
      title: "B48",
      rankings: [{ rank: 1, contestantId: "x", name: "X", rate: 55.0, voteCount: 5 }],
    },
  ];

  it("ranks tournaments by their leader's rate and counts the active field", () => {
    const d = buildWeeklyDigest({ caches, asOf: "2026-07-24 12:00 KST" });
    expect(d.stats.find((s) => s.label === "ACTIVE TOURNAMENTS")?.value).toBe("2");
    // B48 (55.0%) leads A48 (33.3%).
    expect(d.leaders[0]).toMatchObject({ name: "X", rate: 55.0 });
    expect(d.leaders[0].tournamentTitle).toBe("B48");
  });

  it("handles an empty field (참가 직후 크론, evidence 0건) without crashing", () => {
    const d = buildWeeklyDigest({ caches: [], asOf: "now" });
    expect(d.stats.find((s) => s.label === "ACTIVE TOURNAMENTS")?.value).toBe("0");
    expect(d.leaders).toEqual([]);
  });

  it("never leaks a raw vote tally into any stat", () => {
    const d = buildWeeklyDigest({ caches, asOf: "now" });
    const blob = JSON.stringify(d.stats);
    expect(blob).not.toMatch(/"5"|999|640|375/);
  });
});
