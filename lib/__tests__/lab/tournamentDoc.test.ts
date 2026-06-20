import { describe, it, expect } from "vitest";
import {
  buildTournamentDoc,
  buildContestantDocs,
} from "@/lib/lab/tournamentDoc";

const validInput = {
  title: "  Best Strikers 2026  ",
  category: "FOOTBALL" as const,
  hostUid: "admin-uid-1",
};

function drafts(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    name: `P${i + 1}`,
    nationality: "KR",
    position: "FW",
    imageUrl: i % 2 === 0 ? `https://img/${i}.jpg` : "",
    imageSearchKeyword: `p${i + 1}`,
  }));
}

describe("buildTournamentDoc", () => {
  it("builds the canonical active Tournament document", () => {
    const doc = buildTournamentDoc(validInput);
    expect(doc).toMatchObject({
      title: "Best Strikers 2026", // trimmed
      category: "FOOTBALL",
      status: "active",
      hostUid: "admin-uid-1",
      currentRound: 1,
      totalContestants: 48,
      tournamentDeadline: null,
      featured: false,
      settings: { aiNews: false, multiLang: false, showRanking: true },
    });
  });

  it("does not stamp id or createdAt (caller owns serverTimestamp)", () => {
    const doc = buildTournamentDoc(validInput);
    expect(doc).not.toHaveProperty("id");
    expect(doc).not.toHaveProperty("createdAt");
  });

  it("rejects an invalid category", () => {
    expect(() =>
      buildTournamentDoc({ ...validInput, category: "WORLD CUP" as never }),
    ).toThrow();
  });

  it("rejects an empty title", () => {
    expect(() => buildTournamentDoc({ ...validInput, title: "   " })).toThrow();
  });

  it("rejects a missing hostUid", () => {
    expect(() => buildTournamentDoc({ ...validInput, hostUid: "" })).toThrow();
  });
});

describe("buildContestantDocs", () => {
  it("builds 48 docs with sequential 1-based order", () => {
    const docs = buildContestantDocs("t1", drafts(48));
    expect(docs).toHaveLength(48);
    expect(docs[0]).toEqual({
      tournamentId: "t1",
      order: 1,
      name: "P1",
      nationality: "KR",
      position: "FW",
      imageUrl: "https://img/0.jpg",
      imageSearchKeyword: "p1",
    });
    expect(docs[47].order).toBe(48);
  });

  it("rejects when not exactly 48 contestants", () => {
    expect(() => buildContestantDocs("t1", drafts(47))).toThrow();
    expect(() => buildContestantDocs("t1", drafts(49))).toThrow();
  });
});
