/**
 * IMAGE-1 PR 1 (원장 D-77) — 초안 칸의 그림이 엔트리 문서 `media.image` 로 실린다.
 * 우선순위: 영상이 있으면 type embed(그림도 같이 싣는다) · 그림만 있으면 type image.
 */
import { describe, expect, it } from "vitest";
import { buildContestantDocs, type ContestantDraft } from "@/lib/lab/tournamentDoc";

function base(i: number): ContestantDraft {
  return { name: `E${i + 1}`, nationality: "KR", affiliation: "", imageSearchKeyword: "" };
}

const IMG = {
  imageUrl: "https://firebasestorage.googleapis.com/v0/b/b/o/full?alt=media",
  imageThumbUrl: "https://firebasestorage.googleapis.com/v0/b/b/o/thumb?alt=media",
  imageStoragePath: "entry-images/tournaments/t1/0.jpg",
  imageWidth: 1600,
  imageHeight: 900,
  imageAddedAt: 1_762_000_000_000,
};

function docsWith(first: Partial<ContestantDraft>) {
  const drafts = Array.from({ length: 48 }, (_, i) => base(i));
  drafts[0] = { ...drafts[0], ...first };
  return buildContestantDocs("t1", "host", drafts);
}

describe("buildContestantDocs — 그림 (IMAGE-1)", () => {
  it("그림만 있는 칸 → media.type image + image 칸 전부", () => {
    const [d] = docsWith({ ...IMG, imageSource: { origin: "upload" } });
    expect(d.media).toEqual({
      type: "image",
      image: {
        url: IMG.imageUrl,
        thumbUrl: IMG.imageThumbUrl,
        storagePath: IMG.imageStoragePath,
        origin: "upload",
        width: 1600,
        height: 900,
        addedAt: IMG.imageAddedAt,
      },
    });
  });

  it("출처 주소가 있으면 sourceUrl · sourcePage 를 싣는다 · focusY 도", () => {
    const [d] = docsWith({
      ...IMG,
      imageFocusY: 20,
      imageSource: { origin: "url", sourceUrl: "https://a.com/x.jpg", sourcePage: "https://a.com/x.jpg" },
    });
    expect(d.media?.image).toMatchObject({
      origin: "url",
      sourceUrl: "https://a.com/x.jpg",
      sourcePage: "https://a.com/x.jpg",
      focusY: 20,
    });
  });

  it("출처가 없으면 sourceUrl · sourcePage 키 자체가 없다(Firestore undefined 거부)", () => {
    const [d] = docsWith({ ...IMG, imageSource: { origin: "upload" } });
    expect("sourceUrl" in d.media!.image!).toBe(false);
    expect("sourcePage" in d.media!.image!).toBe(false);
    expect("focusY" in d.media!.image!).toBe(false);
  });

  it("영상 + 그림 → type embed, embed 와 image 둘 다", () => {
    const [d] = docsWith({ ...IMG, imageSource: { origin: "upload" }, videoId: "dQw4w9WgXcQ" });
    expect(d.media?.type).toBe("embed");
    expect(d.media?.embed?.videoId).toBe("dQw4w9WgXcQ");
    expect(d.media?.image?.url).toBe(IMG.imageUrl);
  });

  it("둘 다 없으면 media 없음", () => {
    const [d] = docsWith({});
    expect("media" in d).toBe(false);
  });

  it("imageSource 가 빠진 칸은 upload 로 본다", () => {
    const [d] = docsWith({ ...IMG });
    expect(d.media?.image?.origin).toBe("upload");
  });
});
