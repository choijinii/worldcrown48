import { describe, it, expect } from "vitest";
import { resolveChampionId, toCrownData } from "@/lib/crown/championLoader";
import type { Contestant, Tournament } from "@/lib/types/tournament";

/**
 * championLoader — the C-1 → C-2 seam (handoff §3, §5 DON'T, §9 trap #1).
 *
 * C-1 writes `roundProgress.championId` (per-Voter). C-2 reads it, maps it to
 * the crown_cards `championContestantId` shape, and resolves the render data.
 * championId null/absent → throw (AC-1: only a confirmed Champion opens a card).
 */
const TOURNAMENT: Tournament = {
  id: "t1",
  title: "Strikers of the Century",
  titleI18n: {
    ko: "Strikers of the Century",
    en: "Strikers of the Century",
    es: "Strikers of the Century",
  },
  description: { ko: "", en: "", es: "" },
  keywords: ["strikers"],
  category: "FOOTBALL",
  status: "active",
  hostUid: "host1",
  createdAt: null,
  tournamentDeadline: null,
  currentRound: 5,
  totalContestants: 48,
  settings: { aiNews: false, multiLang: false, showRanking: true },
  featured: false,
};

const CHAMPION: Contestant = {
  id: "c7",
  tournamentId: "t1",
  hostUid: "host1",
  order: 7,
  name: "Moussa Adeyemi",
  nationality: "Nigeria",
  position: "Forward",
  imageSearchKeyword: "moussa adeyemi forward",
};

describe("resolveChampionId", () => {
  it("returns the championId when the round is complete", () => {
    expect(resolveChampionId({ complete: true, championId: "c7" })).toBe("c7");
  });

  it("throws when championId is null (handoff §3 — null → throw)", () => {
    expect(() => resolveChampionId({ complete: true, championId: null })).toThrow(/champion/i);
  });

  it("throws when championId is absent", () => {
    expect(() => resolveChampionId({ complete: true })).toThrow(/champion/i);
  });

  it("throws when the round is not complete (no Champion yet)", () => {
    expect(() => resolveChampionId({ complete: false, championId: "c7" })).toThrow(/complete/i);
  });
});

describe("toCrownData", () => {
  it("maps champion + tournament to the render contract", () => {
    expect(toCrownData(CHAMPION, TOURNAMENT)).toEqual({
      initial: "M",
      name: "Moussa Adeyemi",
      title: "Strikers of the Century",
      url: "worldcrown48.com",
      path: "48 → 24 → 12 → 6 → THE FINAL",
    });
  });

  it("uppercases the first letter for the initial fallback", () => {
    expect(toCrownData({ ...CHAMPION, name: "édgar" }, TOURNAMENT).initial).toBe("É");
  });

  it("falls back to a Champion initial when the name is empty", () => {
    expect(toCrownData({ ...CHAMPION, name: "" }, TOURNAMENT).initial).toBe("?");
  });

  it("uses the fixed victory-route path string, never a Round HUD (handoff §5 DON'T)", () => {
    // Must be the flow string only — no "N강 · X/Y" progress HUD.
    expect(toCrownData(CHAMPION, TOURNAMENT).path).toBe("48 → 24 → 12 → 6 → THE FINAL");
  });
});
