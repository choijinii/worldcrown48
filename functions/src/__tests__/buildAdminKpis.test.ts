/**
 * buildAdminKpis — pure KPI aggregation (G-1 handoff §3 Phase C, §6.5, §11.2).
 *
 * Node-env TDD: the callable wrapper (getAdminKpis.ts) owns Firestore I/O and
 * Timestamp→ms conversion; this core takes plain `{ ...Ms }` arrays so every
 * window math is deterministic with an injected `now` (no Date.now()).
 *
 * Windows (handoff §6.5):
 *   total_votes    — all-time count; delta = last 24h vs the 24h before it
 *   active_voters  — distinct userId in the last 1h; delta vs the hour before
 *   vote_speed     — votes in the last 60s (votes/min); delta vs the 60s before
 *   abuse_warnings — unresolved alert count; delta = new unresolved in last 1h
 *   round_status   — active Tournaments, per-currentRound distribution, next Deadline
 *   chart          — 24 hourly buckets of votes/hr (24h total · peak hr · now)
 */
import { describe, expect, it } from "vitest";
import {
  buildAdminKpis,
  type AlertLike,
  type TournamentLike,
  type VoteLike,
} from "../core/buildAdminKpis";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const NOW = 1_700_000_000_000; // fixed epoch (no Date.now())

const vote = (userId: string, ageMs: number): VoteLike => ({
  userId,
  createdAtMs: NOW - ageMs,
});

describe("buildAdminKpis — empty input", () => {
  const snap = buildAdminKpis({ votes: [], tournaments: [], alerts: [], now: NOW });

  it("zeroes every KPI value", () => {
    expect(snap.totalVotes.value).toBe(0);
    expect(snap.activeVoters.value).toBe(0);
    expect(snap.voteSpeed.value).toBe(0);
    expect(snap.abuseWarnings.value).toBe(0);
    expect(snap.roundStatus.activeCount).toBe(0);
  });

  it("flat deltas with null pct when no baseline", () => {
    expect(snap.totalVotes.dir).toBe("flat");
    expect(snap.totalVotes.deltaPct).toBeNull();
    expect(snap.abuseWarnings.dir).toBe("flat");
  });

  it("empty chart", () => {
    expect(snap.chart.total24h).toBe(0);
    expect(snap.chart.peakHourMs).toBeNull();
    expect(snap.chart.series).toHaveLength(24);
    expect(snap.chart.series.every((p) => p.votes === 0)).toBe(true);
  });

  it("stamps generatedAtMs = now", () => {
    expect(snap.generatedAtMs).toBe(NOW);
  });
});

describe("buildAdminKpis — total_votes", () => {
  it("counts all votes and computes 24h-vs-prior-24h delta direction", () => {
    const votes: VoteLike[] = [
      // last 24h: 3 votes
      vote("a", 1 * HOUR),
      vote("b", 5 * HOUR),
      vote("c", 20 * HOUR),
      // prior 24h (24–48h ago): 1 vote → up (3 > 1)
      vote("d", 30 * HOUR),
    ];
    const snap = buildAdminKpis({ votes, tournaments: [], alerts: [], now: NOW });
    expect(snap.totalVotes.value).toBe(4);
    expect(snap.totalVotes.dir).toBe("up");
    expect(snap.totalVotes.deltaPct).toBeCloseTo(200, 1); // (3-1)/1 = 200%
  });

  it("uses totalVotesAllTime override for the card value (count() aggregation)", () => {
    const votes: VoteLike[] = [vote("a", 1 * HOUR), vote("b", 5 * HOUR)];
    const snap = buildAdminKpis({
      votes,
      tournaments: [],
      alerts: [],
      now: NOW,
      totalVotesAllTime: 2_841_920,
    });
    expect(snap.totalVotes.value).toBe(2_841_920); // all-time, not the 2 windowed
  });

  it("down when last 24h < prior 24h", () => {
    const votes: VoteLike[] = [
      vote("a", 2 * HOUR), // last 24h: 1
      vote("b", 30 * HOUR), // prior: 2
      vote("c", 40 * HOUR),
    ];
    const snap = buildAdminKpis({ votes, tournaments: [], alerts: [], now: NOW });
    expect(snap.totalVotes.dir).toBe("down");
  });
});

describe("buildAdminKpis — active_voters (distinct userId, last 1h)", () => {
  it("counts unique voters within the last hour only", () => {
    const votes: VoteLike[] = [
      vote("u1", 10 * MIN),
      vote("u1", 20 * MIN), // same voter, still 1 distinct
      vote("u2", 50 * MIN),
      vote("u3", 90 * MIN), // older than 1h — excluded
    ];
    const snap = buildAdminKpis({ votes, tournaments: [], alerts: [], now: NOW });
    expect(snap.activeVoters.value).toBe(2);
  });
});

describe("buildAdminKpis — vote_speed (60s rolling)", () => {
  it("counts votes in the last 60 seconds", () => {
    const votes: VoteLike[] = [
      vote("a", 10_000), // 10s ago — in
      vote("b", 30_000), // 30s ago — in
      vote("c", 59_000), // 59s ago — in
      vote("d", 61_000), // 61s ago — out
    ];
    const snap = buildAdminKpis({ votes, tournaments: [], alerts: [], now: NOW });
    expect(snap.voteSpeed.value).toBe(3);
  });
});

describe("buildAdminKpis — abuse_warnings", () => {
  it("counts unresolved alerts; resolved excluded; delta = new in last 1h (bad=down)", () => {
    const alerts: AlertLike[] = [
      { resolved: false, createdAtMs: NOW - 10 * MIN }, // new + unresolved
      { resolved: false, createdAtMs: NOW - 30 * MIN }, // new + unresolved
      { resolved: false, createdAtMs: NOW - 5 * HOUR }, // old unresolved
      { resolved: true, createdAtMs: NOW - 2 * MIN }, // resolved — excluded
    ];
    const snap = buildAdminKpis({ votes: [], tournaments: [], alerts, now: NOW });
    expect(snap.abuseWarnings.value).toBe(3); // unresolved
    expect(snap.abuseWarnings.deltaAbs).toBe(2); // new in last hour
    expect(snap.abuseWarnings.dir).toBe("down"); // more abuse = bad
  });

  it("standing unresolved warnings stay crimson (down) even with none new this hour", () => {
    const alerts: AlertLike[] = [
      { resolved: false, createdAtMs: NOW - 5 * HOUR },
    ];
    const snap = buildAdminKpis({ votes: [], tournaments: [], alerts, now: NOW });
    expect(snap.abuseWarnings.value).toBe(1);
    expect(snap.abuseWarnings.deltaAbs).toBe(0); // none created in the last hour
    expect(snap.abuseWarnings.dir).toBe("down"); // a standing backlog is not "calm"
  });

  it("flat only when there are zero unresolved warnings", () => {
    const alerts: AlertLike[] = [{ resolved: true, createdAtMs: NOW - 2 * MIN }];
    const snap = buildAdminKpis({ votes: [], tournaments: [], alerts, now: NOW });
    expect(snap.abuseWarnings.value).toBe(0);
    expect(snap.abuseWarnings.dir).toBe("flat");
  });
});

describe("buildAdminKpis — round_status", () => {
  const t = (
    status: string,
    currentRound: number,
    deadlineAgeMs: number | null,
  ): TournamentLike => ({
    status,
    currentRound,
    tournamentDeadlineMs: deadlineAgeMs === null ? null : NOW - deadlineAgeMs,
  });

  it("counts active tournaments, distribution by round, next future deadline", () => {
    const tournaments: TournamentLike[] = [
      t("active", 2, -2 * DAY), // deadline 2 days in the FUTURE
      t("active", 3, -5 * DAY),
      t("active", 5, -1 * DAY),
      t("draft", 1, null), // not active — excluded
      t("ended", 2, 1 * DAY), // not active — excluded
    ];
    const snap = buildAdminKpis({ votes: [], tournaments, alerts: [], now: NOW });
    expect(snap.roundStatus.activeCount).toBe(3);
    const dist = Object.fromEntries(
      snap.roundStatus.distribution.map((d) => [d.round, d.count]),
    );
    expect(dist).toEqual({ 2: 1, 3: 1, 5: 1 });
    // nearest future deadline = the 1-day-out one
    expect(snap.roundStatus.nextDeadlineMs).toBe(NOW + 1 * DAY);
  });

  it("null next deadline when no active tournament has a future deadline", () => {
    const tournaments: TournamentLike[] = [t("active", 1, 1 * DAY)]; // past
    const snap = buildAdminKpis({ votes: [], tournaments, alerts: [], now: NOW });
    expect(snap.roundStatus.nextDeadlineMs).toBeNull();
  });
});

describe("buildAdminKpis — vote chart (24 hourly buckets)", () => {
  it("buckets votes per hour, sums 24h total, finds the peak hour", () => {
    const votes: VoteLike[] = [
      vote("a", 30 * MIN), // most recent hour bucket
      vote("b", 40 * MIN),
      vote("c", 50 * MIN), // 3 in last hour → peak + nowRate
      vote("d", 90 * MIN), // previous hour: 1
      vote("e", 25 * HOUR), // older than 24h — excluded from total24h
    ];
    const snap = buildAdminKpis({ votes, tournaments: [], alerts: [], now: NOW });
    expect(snap.chart.total24h).toBe(4);
    expect(snap.chart.peakVotes).toBe(3);
    expect(snap.chart.nowRate).toBe(3); // last bucket
    expect(snap.chart.series).toHaveLength(24);
  });
});
