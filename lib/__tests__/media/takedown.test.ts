/**
 * IMAGE-1 PR 3 (원장 D-77 · D-93) — 내린 엔트리는 어디서나 이니셜.
 *
 * 서버는 내릴 때 media 에서 영상·그림 정보를 지우고 `takedown` 표시만 남긴다. 그래도 읽는 쪽은 표시를
 * 먼저 본다 — 옛 사본 · 반쯤 쓰인 문서가 와도 그림·영상·썸네일이 나오지 않게(이중 잠금).
 */
import { describe, expect, it } from "vitest";
import {
  contestantThumbnail,
  decideMediaRender,
  isTakenDown,
  type ContestantMedia,
  type EntryImage,
} from "@/lib/media/mediaSlot";
import { resolveStageImage, resolveStageMedia } from "@/lib/media/stageCrop";
import { coverEntry } from "@/lib/thumbnail/cover";
import { crownPhotoSources, toCrownData } from "@/lib/crown/championLoader";
import type { Contestant, Tournament } from "@/lib/types/tournament";

const VID = "dQw4w9WgXcQ";
const IMAGE: EntryImage = {
  url: "https://firebasestorage.googleapis.com/v0/b/b/o/full?alt=media",
  thumbUrl: "https://firebasestorage.googleapis.com/v0/b/b/o/thumb?alt=media",
  storagePath: "entry-images/tournaments/t/0.jpg",
  origin: "search",
  sourcePage: "https://people.com/a",
  width: 1600,
  height: 900,
  addedAt: 1,
};
const DOWN = { at: 1_763_000_000_000 };
// 일부러 영상·그림이 남은 채 표시만 붙은 문서 — 표시가 이겨야 한다.
const downVideo: ContestantMedia = { type: "embed", embed: { videoId: VID }, takedown: DOWN };
const downImage: ContestantMedia = { type: "image", image: IMAGE, takedown: DOWN };

describe("isTakenDown", () => {
  it("표시가 있으면 true · 없으면 false", () => {
    expect(isTakenDown(downVideo)).toBe(true);
    expect(isTakenDown({ type: "embed", embed: { videoId: VID } } as ContestantMedia)).toBe(false);
    expect(isTakenDown(undefined)).toBe(false);
  });
});

describe("내린 엔트리 — 썸네일 · 무대 · 표지", () => {
  it("contestantThumbnail 은 빈 글자", () => {
    expect(contestantThumbnail(downVideo)).toBe("");
    expect(contestantThumbnail(downImage)).toBe("");
  });
  it("decideMediaRender 는 none (옛 imageUrl 인자도 무시)", () => {
    expect(decideMediaRender(downVideo, "")).toEqual({ render: "none" });
    expect(decideMediaRender(downImage, "https://x/y.jpg")).toEqual({ render: "none" });
  });
  it("무대: 영상 null · 그림 null → 이니셜", () => {
    expect(resolveStageMedia(downVideo)).toBeNull();
    expect(resolveStageImage(downImage)).toBeNull();
  });
  it("표지 후보: 쓸 수 없음(다음 번호로 대체) · 그림 주소 없음", () => {
    const v = coverEntry({ id: "a", order: 1, media: downVideo }, new Set());
    expect(v.entry.usable).toBe(false);
    const i = coverEntry({ id: "b", order: 2, media: downImage }, new Set());
    expect(i.entry.usable).toBe(false);
    expect(i.imageUrl).toBeUndefined();
  });
});

const T = { id: "t1", title: "T" } as Tournament;
const champ = (media?: ContestantMedia): Contestant =>
  ({ id: "c1", tournamentId: "t1", hostUid: "h", order: 1, name: "카리나", nationality: "KR", imageSearchKeyword: "", media }) as Contestant;

describe("크라운 카드 사진 자리 고르기", () => {
  it("그림 엔트리 → 그 그림(1600)", () => {
    expect(crownPhotoSources(champ({ type: "image", image: { ...IMAGE, focusY: 20 } }))).toEqual({ url: IMAGE.url, focusY: 20 });
  });
  it("영상(가로) → hq720, 실패 때 hqdefault", () => {
    expect(crownPhotoSources(champ({ type: "embed", embed: { videoId: VID } }))).toEqual({
      url: `https://i.ytimg.com/vi/${VID}/hq720.jpg`,
      fallback: `https://i.ytimg.com/vi/${VID}/hqdefault.jpg`,
    });
  });
  it("영상(세로) → oar2, 실패 때 hqdefault", () => {
    expect(crownPhotoSources(champ({ type: "embed", embed: { videoId: VID, orientation: "portrait" } }))?.url).toBe(
      `https://i.ytimg.com/vi/${VID}/oar2.jpg`,
    );
  });
  it("내려간 영상(gone) · 내림 · 없음 → null(이니셜)", () => {
    expect(crownPhotoSources(champ({ type: "embed", embed: { videoId: VID, gone: true } }))).toBeNull();
    expect(crownPhotoSources(champ(downVideo))).toBeNull();
    expect(crownPhotoSources(champ(downImage))).toBeNull();
    expect(crownPhotoSources(champ())).toBeNull();
  });
  it("toCrownData 는 고른 사진을 싣는다 · 내림이면 안 싣는다", () => {
    const v = toCrownData(champ({ type: "embed", embed: { videoId: VID } }), T, "ko");
    expect(v.photoUrl).toBe(`https://i.ytimg.com/vi/${VID}/hq720.jpg`);
    expect(v.photoFallbackUrl).toBe(`https://i.ytimg.com/vi/${VID}/hqdefault.jpg`);
    const d = toCrownData(champ(downImage), T, "ko");
    expect(d.photoUrl).toBeUndefined();
    expect(d.photoFallbackUrl).toBeUndefined();
  });
});
