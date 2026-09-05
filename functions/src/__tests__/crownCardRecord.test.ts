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
  // RUN-1: 판마다 카드가 1장씩 남는다. 1회차는 접미사가 없어 id가 현행과 같다(§3.0 B안).
  runIndex: 1,
};

describe("crownCardId (idempotency key)", () => {
  it("is `${voterUid}_${tournamentId}`", () => {
    expect(crownCardId("voter1", "t1", 1)).toBe("voter1_t1");
  });
});

describe("buildCrownCardRecord", () => {
  it("builds the 부록 A schema, mapping championId → championContestantId", () => {
    expect(buildCrownCardRecord(INPUT)).toEqual({
      id: "voter1_t1",
      voterUid: "voter1",
      tournamentId: "t1",
      runIndex: 1,
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

  it.each(["voterUid", "tournamentId", "imageUrl", "tournamentTitle", "tournamentCategory"] as const)(
    "throws when required field %s is empty",
    (field) => {
      expect(() => buildCrownCardRecord({ ...INPUT, [field]: "" })).toThrow();
    },
  );

  // TX-0: categories are DATA now, not a 6-value enum. The category rides in
  // from an already-validated Tournament doc, so the builder only enforces the
  // shape (non-empty string) — the authoritative id-membership check lives at
  // Tournament creation (buildTournamentDoc, data-driven). Any real category id
  // passes through unchanged.
  it("carries any category id through unchanged (data-driven, no enum)", () => {
    for (const cat of ["KPOP", "CREATOR", "ANIME_WEBTOON", "HOLLYWOOD", "ESPORTS"]) {
      expect(buildCrownCardRecord({ ...INPUT, tournamentCategory: cat }).tournamentCategory).toBe(cat);
    }
  });
});

describe("crown_cards — 회차 (RUN-1)", () => {
  const input = {
    voterUid: "u1",
    tournamentId: "gen4_idol_48",
    championId: "c1",
    tournamentTitle: "4세대 아이돌 48",
    tournamentCategory: "kpop",
    imageUrl: "https://example.com/a.png",
  };

  it("① 1회차 카드 id는 현행과 같다 — 옛 카드가 곧 1회차 카드다 (AC 11)", () => {
    expect(crownCardId("u1", "gen4_idol_48", 1)).toBe("u1_gen4_idol_48");
  });

  it("② 2회차는 다른 카드 id — 판마다 카드가 1장씩 남는다 (AC 4)", () => {
    expect(crownCardId("u1", "gen4_idol_48", 2)).toBe("u1_gen4_idol_48_r2");
  });

  it("③ 레코드가 회차를 필드로 싣는다 (§5 DO 1)", () => {
    const r = buildCrownCardRecord({ ...input, runIndex: 3 });
    expect(r.runIndex).toBe(3);
    expect(r.id).toBe("u1_gen4_idol_48_r3");
  });

  it("④ 회차가 다르면 카드 id가 겹치지 않는다 — 지난 판 카드가 보존된다 (AC 5)", () => {
    const ids = [1, 2, 3, 4, 5].map((n) => crownCardId("u1", "gen4_idol_48", n));
    expect(new Set(ids).size).toBe(5);
  });
});
