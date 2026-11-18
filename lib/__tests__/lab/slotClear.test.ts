/** LAB-FIX-4 결정 B · C — ✕ = 그 칸을 통째로 비우기 · [모두 비우기]. 순수 함수. */
import { describe, expect, it } from "vitest";
import { clearAllSlots, clearSlot, slotHasAnything } from "@/lib/lab/slotClear";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

const empty = (): ContestantDraft => ({ name: "", nationality: "", affiliation: "", imageSearchKeyword: "" });
const video: ContestantDraft = {
  name: "W-Unit", nationality: "VN", affiliation: "", imageSearchKeyword: "w-unit dance",
  videoId: "esz-HscCZaE", videoStartSec: 3, videoSourceUrl: "https://youtu.be/esz-HscCZaE", videoTitle: "t", videoChannel: "c",
  manualVideo: true, manualVideoUrl: "https://youtu.be/esz-HscCZaE",
};
const image: ContestantDraft = {
  name: "신라면", nationality: "KR", affiliation: "농심", imageSearchKeyword: "",
  imageUrl: "https://s/x.jpg", imageThumbUrl: "https://s/t.jpg", imageStoragePath: "entry-images/drafts/d/3", imageWidth: 600, imageHeight: 800,
  manualImageUrl: "https://example.com/r.jpg",
};

describe("clearSlot — 칸 하나를 통째로", () => {
  it("이름 · 덧붙임 · 국가 · 영상(기억한 주소까지)을 모두 비운다", () => {
    const r = clearSlot([video, image], 0, 48, empty);
    expect(r.drafts[0]).toEqual(empty());
    expect(r.drafts[1]).toBe(image);
    expect(r.storagePaths).toEqual([]);
  });
  it("그림 칸이면 올려 둔 파일 경로를 돌려준다(IMAGE-1 삭제 규칙대로 지우게)", () => {
    const r = clearSlot([video, image], 1, 48, empty);
    expect(r.drafts[1]).toEqual(empty());
    expect(r.storagePaths).toEqual(["entry-images/drafts/d/3"]);
  });
  it("모자란 칸은 빈 칸으로 채워 48칸 모양을 지킨다", () => {
    expect(clearSlot([video], 5, 48, empty).drafts).toHaveLength(48);
  });
});

describe("clearAllSlots — 모두 비우기", () => {
  it("칸을 모두 비우고 그림 파일 경로를 모은다", () => {
    const r = clearAllSlots([video, image, empty()]);
    expect(r.drafts).toEqual([]);
    expect(r.storagePaths).toEqual(["entry-images/drafts/d/3"]);
  });
});

describe("slotHasAnything — ✕ 를 보일 때", () => {
  it("영상만 · 그림만 · 기억한 주소만 있어도 비울 것이 있다", () => {
    expect(slotHasAnything(empty())).toBe(false);
    expect(slotHasAnything({ ...empty(), videoId: "esz-HscCZaE" })).toBe(true);
    expect(slotHasAnything({ ...empty(), imageUrl: "https://s/x.jpg" })).toBe(true);
    expect(slotHasAnything({ ...empty(), manualVideoUrl: "https://youtu.be/x" })).toBe(true);
    expect(slotHasAnything({ ...empty(), affiliation: " 가수 " })).toBe(true);
  });
});
