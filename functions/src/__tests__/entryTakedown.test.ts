/**
 * IMAGE-1 PR 3 (원장 D-77 · D-83 · D-93) — 내리기 판정(순수).
 *
 * 잡으려는 사고: 권리자에게 "내렸습니다"라고 답했는데 화면 어딘가에 그림·영상·썸네일이 남는 것,
 * 그리고 "그림은 지워졌는데 기록이 없다" 같은 반쪽 상태.
 */
import { describe, expect, it } from "vitest";
import {
  ENTRY_TAKEDOWN_ERROR_CODES as CODES,
  MAX_REASON_LENGTH,
  planTakedown,
  takedownStoragePaths,
} from "../core/entryTakedown";

const NOW = 1_763_300_000_000;
const IMG = {
  url: "https://firebasestorage.googleapis.com/v0/b/b/o/x?alt=media",
  thumbUrl: "https://firebasestorage.googleapis.com/v0/b/b/o/y?alt=media",
  storagePath: "entry-images/tournaments/t1/3.jpg",
  origin: "search",
  sourceUrl: "https://cdn.people.com/a.jpg",
  sourcePage: "https://people.com/article",
  width: 1600,
  height: 900,
  addedAt: 1,
};
const base = {
  tournamentId: "t1",
  contestantId: "c1",
  reason: "  소속사 요청 · policy@ 11/27 접수 ",
  byUid: "admin1",
  nowMs: NOW,
  existingRecord: null,
};
const imageT = { mediaKind: "image", title: "T" };
const videoT = { title: "V" }; // mediaKind 없음 = 영상 대회

describe("planTakedown", () => {
  it("이미지 대회 엔트리 → media 는 종류 + 내린 시각만 · 기록에 출처 옮김 · 두 장 지울 경로", () => {
    const p = planTakedown({
      ...base,
      tournament: imageT,
      contestant: { tournamentId: "t1", name: "카리나", media: { type: "image", image: IMG } },
    });
    expect(p.ok && !p.already).toBe(true);
    if (!p.ok || p.already) return;
    expect(p.media).toEqual({ type: "image", takedown: { at: NOW } });
    expect(p.record).toEqual({
      tournamentId: "t1",
      contestantId: "c1",
      name: "카리나",
      mediaKind: "image",
      atMs: NOW,
      reason: "소속사 요청 · policy@ 11/27 접수",
      byUid: "admin1",
      sourceUrl: IMG.sourceUrl,
      sourcePage: IMG.sourcePage,
      storagePath: IMG.storagePath,
    });
    expect(p.storagePaths).toEqual(["entry-images/tournaments/t1/3.jpg", "entry-images/tournaments/t1/3_600.jpg"]);
  });

  it("영상 대회 엔트리(mediaKind 없음) → 영상 정보 제거 · 기록에 videoId · 지울 파일 없음", () => {
    const p = planTakedown({
      ...base,
      tournament: videoT,
      contestant: {
        tournamentId: "t1",
        name: "윈터",
        media: { type: "embed", embed: { videoId: "dQw4w9WgXcQ", sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } },
      },
    });
    if (!p.ok || p.already) throw new Error("expected plan");
    expect(p.media).toEqual({ type: "embed", takedown: { at: NOW } });
    expect(p.record.mediaKind).toBe("video");
    expect(p.record.videoId).toBe("dQw4w9WgXcQ");
    expect(p.record.videoSourceUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(p.storagePaths).toEqual([]);
  });

  it("media 가 없는 엔트리도 내릴 수 있다(표시만 남는다)", () => {
    const p = planTakedown({ ...base, tournament: videoT, contestant: { tournamentId: "t1", name: "A" } });
    if (!p.ok || p.already) throw new Error("expected plan");
    expect(p.media).toEqual({ type: "embed", takedown: { at: NOW } });
  });

  it("이미 내린 엔트리 → already · 기록의 경로로 다시 지운다(멱등 · 중간 실패 마저 하기)", () => {
    const p = planTakedown({
      ...base,
      tournament: imageT,
      contestant: { tournamentId: "t1", name: "A", media: { type: "image", takedown: { at: 1 } } },
      existingRecord: { storagePath: "entry-images/tournaments/t1/3.jpg" },
    });
    expect(p).toEqual({
      ok: true,
      already: true,
      storagePaths: ["entry-images/tournaments/t1/3.jpg", "entry-images/tournaments/t1/3_600.jpg"],
    });
  });

  it("사유가 비면 거절 · 너무 길면 거절", () => {
    const c = { tournamentId: "t1", name: "A" };
    expect(planTakedown({ ...base, reason: "   ", tournament: videoT, contestant: c })).toEqual({ ok: false, code: CODES.REASON_REQUIRED });
    expect(planTakedown({ ...base, reason: "x".repeat(MAX_REASON_LENGTH + 1), tournament: videoT, contestant: c })).toEqual({
      ok: false,
      code: CODES.REASON_REQUIRED,
    });
  });

  it("대회 · 엔트리 없음 → not_found · 다른 대회의 엔트리 → wrong_tournament", () => {
    expect(planTakedown({ ...base, tournament: null, contestant: { tournamentId: "t1" } })).toEqual({ ok: false, code: CODES.NOT_FOUND });
    expect(planTakedown({ ...base, tournament: videoT, contestant: null })).toEqual({ ok: false, code: CODES.NOT_FOUND });
    expect(planTakedown({ ...base, tournament: videoT, contestant: { tournamentId: "t2", name: "A" } })).toEqual({
      ok: false,
      code: CODES.WRONG_TOURNAMENT,
    });
  });
});

describe("takedownStoragePaths — 그 대회 폴더 안의 .jpg 만", () => {
  it("다른 대회 · 초안 · 카드 · 상위 경로는 지우지 않는다", () => {
    expect(takedownStoragePaths("t1", "entry-images/tournaments/t2/3.jpg")).toEqual([]);
    expect(takedownStoragePaths("t1", "entry-images/drafts/u/d/3.jpg")).toEqual([]);
    expect(takedownStoragePaths("t1", "crown-cards/t1/u.png")).toEqual([]);
    expect(takedownStoragePaths("t1", "entry-images/tournaments/t1/../t2/3.jpg")).toEqual([]);
    expect(takedownStoragePaths("t1", undefined)).toEqual([]);
  });
});
