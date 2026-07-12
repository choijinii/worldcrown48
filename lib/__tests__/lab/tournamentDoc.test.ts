import { describe, it, expect } from "vitest";
import {
  buildTournamentDoc,
  buildContestantDocs,
} from "@/lib/lab/tournamentDoc";

const NOW = 1_752_000_000_000;
const DAY = 86_400_000;

const validInput = {
  title: "  Best Strikers 2026  ",
  titleI18n: {
    ko: "Best Strikers 2026",
    en: "Best Strikers 2026",
    es: "Best Strikers 2026",
  },
  description: {
    ko: "최고의 공격수",
    en: "The best strikers",
    es: "Los mejores delanteros",
  },
  keywords: ["  striker ", "goal", "striker"], // trims + dedupes → 2
  category: "FOOTBALL",
  hostUid: "admin-uid-1",
  deadlineMs: NOW + 7 * DAY,
};

// TX-0: category validity is checked against the loaded id list, not a tuple.
const VALID_IDS = ["FOOTBALL", "KPOP", "ANIME_WEBTOON", "HOLLYWOOD"];

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
    const doc = buildTournamentDoc(validInput, VALID_IDS, NOW);
    expect(doc).toMatchObject({
      title: "Best Strikers 2026", // trimmed
      category: "FOOTBALL",
      status: "active",
      hostUid: "admin-uid-1",
      currentRound: 1,
      totalContestants: 48,
      featured: false,
      settings: { aiNews: false, multiLang: false, showRanking: true },
    });
  });

  it("stores the additive 3-language title + description + keywords", () => {
    const doc = buildTournamentDoc(validInput, VALID_IDS, NOW);
    expect(doc.title).toBe("Best Strikers 2026"); // flat original preserved
    expect(doc.titleI18n).toEqual({
      ko: "Best Strikers 2026",
      en: "Best Strikers 2026",
      es: "Best Strikers 2026",
    });
    expect(doc.description).toEqual({
      ko: "최고의 공격수",
      en: "The best strikers",
      es: "Los mejores delanteros",
    });
    expect(doc.keywords).toEqual(["striker", "goal"]); // trimmed + deduped
  });

  it("passes through the validated deadline (caller stamps the Timestamp)", () => {
    const doc = buildTournamentDoc(validInput, VALID_IDS, NOW);
    expect(doc.tournamentDeadline).toBe(NOW + 7 * DAY);
  });

  it("does not stamp id or createdAt (caller owns serverTimestamp)", () => {
    const doc = buildTournamentDoc(validInput, VALID_IDS, NOW);
    expect(doc).not.toHaveProperty("id");
    expect(doc).not.toHaveProperty("createdAt");
  });

  it("rejects an invalid category", () => {
    expect(() =>
      buildTournamentDoc({ ...validInput, category: "NOT_A_CATEGORY" }, VALID_IDS, NOW),
    ).toThrow();
  });

  it("rejects an empty title", () => {
    expect(() =>
      buildTournamentDoc({ ...validInput, title: "   " }, VALID_IDS, NOW),
    ).toThrow();
  });

  it("rejects a missing hostUid", () => {
    expect(() =>
      buildTournamentDoc({ ...validInput, hostUid: "" }, VALID_IDS, NOW),
    ).toThrow();
  });

  it("rejects zero keywords (at least one required)", () => {
    expect(() =>
      buildTournamentDoc({ ...validInput, keywords: [] }, VALID_IDS, NOW),
    ).toThrow();
  });

  it("rejects a past deadline", () => {
    expect(() =>
      buildTournamentDoc({ ...validInput, deadlineMs: NOW - 1 }, VALID_IDS, NOW),
    ).toThrow();
  });
});

describe("buildContestantDocs", () => {
  it("builds 48 docs with sequential 1-based order and stamps hostUid", () => {
    const docs = buildContestantDocs("t1", "host-1", drafts(48));
    expect(docs).toHaveLength(48);
    expect(docs[0]).toEqual({
      tournamentId: "t1",
      hostUid: "host-1",
      order: 1,
      name: "P1",
      nationality: "KR",
      position: "FW",
      imageUrl: "https://img/0.jpg",
      imageSearchKeyword: "p1",
    });
    expect(docs[47].order).toBe(48);
    expect(docs[47].hostUid).toBe("host-1");
  });

  it("rejects when not exactly 48 contestants", () => {
    expect(() => buildContestantDocs("t1", "host-1", drafts(47))).toThrow();
    expect(() => buildContestantDocs("t1", "host-1", drafts(49))).toThrow();
  });
});
