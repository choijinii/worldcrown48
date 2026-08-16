import { describe, it, expect } from "vitest";
import {
  buildTournamentDoc,
  buildContestantDocs,
  type ContestantDraft,
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

function drafts(n: number): ContestantDraft[] {
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

  // ── LAB-EV-1 W6 — 영상은 기존 media 그레일에 실린다 (병렬 스키마 금지) ──
  describe("영상 필드 (LAB-EV-1)", () => {
    const withVideo = () => {
      const all = drafts(48);
      all[0] = {
        ...all[0],
        videoId: "9bZkp7q19f0",
        videoStartSec: 90,
        videoEndSec: 100,
        videoSourceUrl: "https://www.youtube.com/watch?v=9bZkp7q19f0&t=90s",
      };
      return all;
    };

    it("videoId가 있으면 media.embed로 싣는다 (ND-1 그레일 재사용)", () => {
      const docs = buildContestantDocs("t1", "host-1", withVideo());
      expect(docs[0].media).toEqual({
        type: "embed",
        embed: {
          videoId: "9bZkp7q19f0",
          start: 90,
          end: 100,
          sourceUrl: "https://www.youtube.com/watch?v=9bZkp7q19f0&t=90s",
        },
      });
    });

    it("영상이 없으면 media 키 자체가 없다 (Firestore는 undefined를 거부한다)", () => {
      const docs = buildContestantDocs("t1", "host-1", drafts(48));
      expect("media" in docs[0]).toBe(false);
    });

    it("imageUrl과 공존한다 — 영상은 추가 필드지 대체가 아니다", () => {
      const docs = buildContestantDocs("t1", "host-1", withVideo());
      expect(docs[0].imageUrl).toBe("https://img/0.jpg");
      expect(docs[0].media?.type).toBe("embed");
    });

    it("끝점이 비면 시작+10초로 채운다 (ADR-EV-1)", () => {
      const all = drafts(48);
      all[0] = { ...all[0], videoId: "9bZkp7q19f0", videoStartSec: 30 };
      const docs = buildContestantDocs("t1", "host-1", all);
      expect(docs[0].media?.embed?.end).toBe(40);
    });
  });
});
