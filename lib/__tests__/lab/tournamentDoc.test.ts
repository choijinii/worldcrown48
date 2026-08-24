import { describe, it, expect } from "vitest";
import {
  buildTournamentDoc,
  buildContestantDocs,
  type ContestantDraft,
} from "@/lib/lab/tournamentDoc";
import { contestantAffiliation } from "@/lib/types/tournament";

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
    affiliation: "BLACKPINK",
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
      affiliation: "BLACKPINK",
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

    it("imageUrl은 더 이상 저장되지 않는다 (LAB-UX-1 PR-2)", () => {
      const docs = buildContestantDocs("t1", "host-1", withVideo());
      expect("imageUrl" in docs[0]).toBe(false);
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

describe("소속 — PR-2 추가형 (기존 발행분 표시가 깨지지 않는다)", () => {
  it("새 문서는 affiliation을 쓰고 position을 쓰지 않는다", () => {
    const docs = buildContestantDocs("t1", "host-1", drafts(48));
    expect(docs[0].affiliation).toBe("BLACKPINK");
    expect("position" in docs[0]).toBe(false);
  });

  it("contestantAffiliation은 새 문서를 읽는다", () => {
    expect(contestantAffiliation({ affiliation: "NMIXX", position: undefined })).toBe(
      "NMIXX",
    );
  });

  it("★회귀: PR-2 이전 발행분(position만 있음)도 그대로 보인다", () => {
    // 528건이 이 모양이다. 필드를 갈아치웠다면 여기가 빈칸이 됐을 것이다.
    expect(contestantAffiliation({ affiliation: undefined, position: "메인보컬" })).toBe(
      "메인보컬",
    );
  });

  it("둘 다 있으면 새 필드가 이긴다", () => {
    expect(contestantAffiliation({ affiliation: "IVE", position: "리더" })).toBe("IVE");
  });

  it("빈 문자열은 없는 것으로 친다 — 옛 값으로 떨어진다", () => {
    expect(contestantAffiliation({ affiliation: "  ", position: "래퍼" })).toBe("래퍼");
  });
});

describe("★배포 순서 창 — 옛 계약 응답에도 발행이 깨지지 않는다", () => {
  it("affiliation이 없는 draft도 빈 문자열로 저장한다 (Firestore는 undefined를 거부)", () => {
    // 프론트는 머지 즉시 나가고 functions는 나중에 배포된다. 그 창 동안 옛 함수는
    // position으로 답하고, affiliation이 undefined가 되면 writeBatch가 통째로
    // 실패해 Tournament가 아예 안 만들어진다 — CI E2E가 실제로 잡은 결함이다.
    const legacy = drafts(48).map((d) => {
      const { affiliation, ...rest } = d;
      void affiliation;
      return rest as unknown as ContestantDraft;
    });
    const docs = buildContestantDocs("t1", "host-1", legacy);
    expect(docs[0].affiliation).toBe("");
    expect(Object.values(docs[0]).every((v) => v !== undefined)).toBe(true);
  });
});
