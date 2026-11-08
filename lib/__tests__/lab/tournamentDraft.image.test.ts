/**
 * IMAGE-1 PR 1 — 초안 칸의 새 칸(그림 8칸 · 영상 제목·채널 2칸)이 저장·복원된다.
 * 전부 선택 칸: 옛 초안(칸 없음)은 그대로 읽힌다.
 */
import { describe, expect, it } from "vitest";
import { fromDraftDoc, isDraftBlank, toDraftFields } from "@/lib/lab/tournamentDraft";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

function docWith(c: Record<string, unknown>) {
  return { hostUid: "u1", contestants: [c] };
}

const FULL: ContestantDraft = {
  name: "A",
  nationality: "",
  affiliation: "",
  imageSearchKeyword: "",
  imageUrl: "https://firebasestorage.googleapis.com/v0/b/b/o/a?alt=media",
  imageThumbUrl: "https://firebasestorage.googleapis.com/v0/b/b/o/a600?alt=media",
  imageStoragePath: "entry-images/drafts/u1/d1/0.jpg",
  imageSource: { origin: "url", sourceUrl: "https://x.com/a.jpg", sourcePage: "https://x.com/a.jpg" },
  imageWidth: 1600,
  imageHeight: 900,
  imageAddedAt: 1_762_000_000_000,
  imageFocusY: 30,
  videoTitle: "NewJeans 'Ditto' Official MV",
  videoChannel: "HYBE LABELS",
};

describe("초안 새 칸 (IMAGE-1)", () => {
  it("새 칸 10개가 저장 → 복원으로 그대로 돌아온다", () => {
    const state = fromDraftDoc(docWith(FULL as unknown as Record<string, unknown>))!;
    expect(state.contestants[0]).toEqual(FULL);
    const saved = toDraftFields(state) as { contestants: unknown[] };
    expect(fromDraftDoc({ hostUid: "u1", ...saved })!.contestants[0]).toEqual(FULL);
  });

  it("옛 초안(칸 없음)은 새 칸이 undefined", () => {
    const c = fromDraftDoc(docWith({ name: "A" }))!.contestants[0];
    expect(c.imageUrl).toBeUndefined();
    expect(c.imageSource).toBeUndefined();
    expect(c.videoTitle).toBeUndefined();
    expect("imageUrl" in c).toBe(false);
  });

  it("타입이 틀린 값은 버린다", () => {
    const c = fromDraftDoc(
      docWith({
        name: "A",
        imageUrl: 3,
        imageWidth: "1600",
        imageSource: { origin: "nope" },
        videoTitle: 9,
        imageFocusY: "x",
      }),
    )!.contestants[0];
    expect(c.imageUrl).toBeUndefined();
    expect(c.imageWidth).toBeUndefined();
    expect(c.imageSource).toBeUndefined();
    expect(c.videoTitle).toBeUndefined();
    expect(c.imageFocusY).toBeUndefined();
  });

  it("imageSource 안의 출처 주소는 문자열일 때만 남긴다", () => {
    const c = fromDraftDoc(docWith({ name: "A", imageSource: { origin: "upload", sourceUrl: 1 } }))!
      .contestants[0];
    expect(c.imageSource).toEqual({ origin: "upload" });
  });

  it("그림만 넣은 칸도 입력한 칸이다(빈 초안 아님)", () => {
    const state = fromDraftDoc(
      docWith({ name: "", imageUrl: "https://firebasestorage.googleapis.com/v0/b/b/o/a?alt=media" }),
    )!;
    expect(isDraftBlank(state)).toBe(false);
  });
});
