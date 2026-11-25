/**
 * rankingArchive — 차트 사진 영구 보관(T5 PR 2 · 대표 2026-11-25).
 * 보관 행은 공개 차트 행에서 **정해 둔 키만** 옮긴다 — 영상 · 그림 주소와 선택 수 · 비율은 싣지 않는다.
 */
import { describe, expect, it } from "vitest";
import { ARCHIVE, toArchiveDoc } from "../core/rankingArchive";

const ROW = {
  rank: 1,
  contestantId: "c1",
  name: "Alpha",
  crownScore: 812,
  placementRate: 0.5,
  winRate: 0.25,
  shareRate: 0.125,
};
const KEYS = ["contestantId", "crownScore", "name", "placementRate", "rank", "shareRate", "winRate"];

describe("toArchiveDoc", () => {
  it("컬렉션 이름과 문서 머리 칸", () => {
    expect(ARCHIVE).toBe("ranking_archive");
    const doc = toArchiveDoc({ tournamentId: "t1", generationSequence: 3, runsTotal: 27, rankings: [] }, 1234);
    expect(doc).toEqual({ tournamentId: "t1", seq: 3, generatedAtMs: 1234, runsTotal: 27, rows: [] });
  });

  it("행 키는 정해 둔 것뿐 — nameI18n 은 있을 때만", () => {
    const i18n = { ko: "알파", en: "Alpha", es: "Alfa" };
    const doc = toArchiveDoc(
      {
        tournamentId: "t1",
        generationSequence: 0,
        runsTotal: 1,
        rankings: [ROW, { ...ROW, rank: 2, contestantId: "c2", nameI18n: i18n }] as never,
      },
      1,
    );
    expect(Object.keys(doc.rows[0]).sort()).toEqual(KEYS);
    expect(Object.keys(doc.rows[1]).sort()).toEqual([...KEYS, "nameI18n"].sort());
    expect(doc.rows[1].nameI18n).toEqual(i18n);
  });

  it("videoId · imageUrl · voteCount · rate 가 실린 행도 보관 행에는 없다", () => {
    const dirty = { ...ROW, videoId: "abc", imageUrl: "https://x/y.png", voteCount: 99, rate: 0.3, extra: 1 };
    const doc = toArchiveDoc({ tournamentId: "t1", generationSequence: 0, runsTotal: 1, rankings: [dirty] as never }, 1);
    expect(Object.keys(doc.rows[0]).sort()).toEqual(KEYS);
    expect(JSON.stringify(doc)).not.toMatch(/videoId|imageUrl|voteCount|"rate"|extra/);
  });
});
