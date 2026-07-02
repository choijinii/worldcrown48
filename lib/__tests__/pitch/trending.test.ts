import { describe, it, expect } from "vitest";
import {
  TRENDING_LIMIT,
  isFeedEmpty,
  formatCloses,
  statusPillVariant,
} from "@/lib/pitch/trending";

/**
 * A-1 TrendingFeed pure helpers (handoff §11.2 → AC-1).
 *
 * The store's onSnapshot subscription is Firestore glue (E2E-covered, per the
 * voteStore precedent); these are the pure pieces worth unit-testing: the feed
 * query limit, empty detection, the "Closes …" formatter, and the status-pill
 * variant. The card meta line itself is composed in TournamentCard via useT.
 */

describe("TRENDING_LIMIT", () => {
  it("matches the handoff §5 query limit of 12", () => {
    expect(TRENDING_LIMIT).toBe(12);
  });
});

describe("isFeedEmpty", () => {
  it("is true only for an empty tournament list", () => {
    expect(isFeedEmpty([])).toBe(true);
    expect(isFeedEmpty([{ id: "t1" }])).toBe(false);
  });
});

describe("formatCloses", () => {
  it("formats a deadline as short 'MMM D' (matches wireframe 'Closes Jun 20')", () => {
    expect(formatCloses(new Date("2026-06-20T12:00:00Z"))).toBe("Jun 20");
  });

  it("accepts a Firestore Timestamp-like value (toDate())", () => {
    const ts = { toDate: () => new Date("2026-07-02T00:00:00Z") };
    expect(formatCloses(ts)).toBe("Jul 2");
  });

  it("returns an empty string when no deadline is set", () => {
    expect(formatCloses(null)).toBe("");
    expect(formatCloses(undefined)).toBe("");
  });
});

describe("statusPillVariant", () => {
  it("maps active tournaments to the gold 'active' pill", () => {
    expect(statusPillVariant("active")).toBe("active");
  });

  it("maps every other status to the muted pill", () => {
    expect(statusPillVariant("draft")).toBe("muted");
    expect(statusPillVariant("ended")).toBe("muted");
  });
});
