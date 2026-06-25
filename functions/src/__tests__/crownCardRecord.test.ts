import { describe, it, expect } from "vitest";
import { buildCrownCardRecord, crownCardId } from "../core/crownCardRecord";

/**
 * crownCardRecord — pure crown_cards doc builder + validation (handoff §3, 부록 A).
 * Maps C-1 `championId` → crown_cards `championContestantId` (§5 DON'T). The
 * trigger stamps `createdAt` (serverTimestamp) — same split as advanceRound.
 */
const INPUT = {
  voterUid: "voter1",
  tournamentId: "t1",
  championId: "c7",
  tournamentTitle: "Strikers of the Century",
  tournamentCategory: "FOOTBALL",
  imageUrl: "https://storage.example/crown-cards/t1/voter1.png",
};

describe("crownCardId (idempotency key)", () => {
  it("is `${voterUid}_${tournamentId}`", () => {
    expect(crownCardId("voter1", "t1")).toBe("voter1_t1");
  });
});

describe("buildCrownCardRecord", () => {
  it("builds the 부록 A schema, mapping championId → championContestantId", () => {
    expect(buildCrownCardRecord(INPUT)).toEqual({
      id: "voter1_t1",
      voterUid: "voter1",
      tournamentId: "t1",
      championContestantId: "c7",
      tournamentTitle: "Strikers of the Century",
      tournamentCategory: "FOOTBALL",
      imageUrl: "https://storage.example/crown-cards/t1/voter1.png",
      format: "link",
    });
  });

  it("always sets format to 'link' (server renders only the 1.91:1 OG card)", () => {
    expect(buildCrownCardRecord(INPUT).format).toBe("link");
  });

  it("does NOT include createdAt (the trigger stamps serverTimestamp)", () => {
    expect("createdAt" in buildCrownCardRecord(INPUT)).toBe(false);
  });

  it("throws when championId is missing (no Champion → no card)", () => {
    expect(() => buildCrownCardRecord({ ...INPUT, championId: "" })).toThrow(/champion/i);
  });

  it.each(["voterUid", "tournamentId", "imageUrl", "tournamentTitle"] as const)(
    "throws when required field %s is empty",
    (field) => {
      expect(() => buildCrownCardRecord({ ...INPUT, [field]: "" })).toThrow();
    },
  );

  it("rejects a category outside the six WC48 categories", () => {
    expect(() => buildCrownCardRecord({ ...INPUT, tournamentCategory: "ESPORTS" })).toThrow(/category/i);
  });

  it("accepts every valid WC48 category", () => {
    for (const cat of ["FOOTBALL", "KPOP", "ANIME", "GAMING", "MOVIE", "OTHER"]) {
      expect(buildCrownCardRecord({ ...INPUT, tournamentCategory: cat }).tournamentCategory).toBe(cat);
    }
  });
});
