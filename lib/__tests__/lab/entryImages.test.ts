/**
 * IMAGE-1 PR 1 — ① 파일 48장: 자연 정렬 · 파일 이름 → 이름 후보 · 빈 칸부터 채우기 · 줄이기 크기 ·
 * 칸 미리보기 우선순위.
 */
import { describe, expect, it } from "vitest";
import {
  assignToEmptySlots,
  fitLongEdge,
  nameCandidate,
  naturalSortFiles,
  slotPreview,
} from "@/lib/lab/entryImages";

describe("naturalSortFiles", () => {
  it("숫자를 숫자로 비교한다", () => {
    const sorted = naturalSortFiles([{ name: "10.jpg" }, { name: "2.jpg" }, { name: "1.jpg" }, { name: "b.png" }, { name: "a.png" }]);
    expect(sorted.map((f) => f.name)).toEqual(["1.jpg", "2.jpg", "10.jpg", "a.png", "b.png"]);
  });
  it("원본 배열을 바꾸지 않는다", () => {
    const files = [{ name: "2" }, { name: "1" }];
    naturalSortFiles(files);
    expect(files[0].name).toBe("2");
  });
});

describe("nameCandidate", () => {
  it("숫자·확장자·구분자를 뗀다", () => {
    expect(nameCandidate("13_뉴진스.jpg")).toBe("뉴진스");
    expect(nameCandidate("07 - IVE.png")).toBe("IVE");
    expect(nameCandidate("aespa.webp")).toBe("aespa");
    expect(nameCandidate("Red Velvet 3.jpeg")).toBe("Red Velvet 3");
  });
  it("숫자뿐이면 없음", () => {
    expect(nameCandidate("001.png")).toBe("");
    expect(nameCandidate("12.jpg")).toBe("");
  });
});

describe("assignToEmptySlots", () => {
  it("빈 칸 번호를 앞에서부터 · 넘치는 파일은 버린다", () => {
    const filled = Array.from({ length: 48 }, (_, i) => i < 46);
    expect(assignToEmptySlots(filled, 5)).toEqual([46, 47]);
  });
  it("다 비면 0부터 · 48 상한", () => {
    expect(assignToEmptySlots(Array(48).fill(false), 60)).toHaveLength(48);
    expect(assignToEmptySlots(Array(48).fill(false), 3)).toEqual([0, 1, 2]);
  });
  it("모자란 칸 배열(옛 초안)도 48칸으로 본다", () => {
    expect(assignToEmptySlots([true], 2)).toEqual([1, 2]);
  });
});

describe("fitLongEdge (브라우저 줄이기)", () => {
  it("1600 · 600 · 비율 유지 · 키우지 않음", () => {
    expect(fitLongEdge(4000, 3000, 1600)).toEqual({ w: 1600, h: 1200 });
    expect(fitLongEdge(4000, 3000, 600)).toEqual({ w: 600, h: 450 });
    expect(fitLongEdge(500, 900, 1600)).toEqual({ w: 500, h: 900 });
  });
});

describe("slotPreview", () => {
  const base = { name: "", nationality: "", affiliation: "", imageSearchKeyword: "" };
  it("영상 > 그림(600) > 없음 · 그림 배지는 그림만 있을 때", () => {
    expect(slotPreview({ ...base, videoId: "dQw4w9WgXcQ", imageThumbUrl: "t" })).toEqual({
      url: expect.stringContaining("ytimg.com"),
      imageOnly: false,
    });
    expect(slotPreview({ ...base, imageUrl: "f", imageThumbUrl: "t" })).toEqual({ url: "t", imageOnly: true });
    expect(slotPreview({ ...base, imageUrl: "f" })).toEqual({ url: "f", imageOnly: true });
    expect(slotPreview(base)).toEqual({ url: "", imageOnly: false });
  });
});

import { clearImageFields, fieldsFromImport } from "@/lib/lab/entryImages";
describe("fieldsFromImport · clearImageFields", () => {
  it("④ URL 결과 → 초안 칸(origin url · 출처 기록)", () => {
    expect(
      fieldsFromImport({ url: "u", thumbUrl: "t", storagePath: "p", width: 1, height: 2, addedAt: 3, sourceUrl: "s", sourcePage: "s" }),
    ).toEqual({
      imageUrl: "u",
      imageThumbUrl: "t",
      imageStoragePath: "p",
      imageSource: { origin: "url", sourceUrl: "s", sourcePage: "s" },
      imageWidth: 1,
      imageHeight: 2,
      imageAddedAt: 3,
    });
  });
  it("그림 칸 8개만 떼고 나머지(이름 · 영상)는 남긴다", () => {
    const d = clearImageFields({
      name: "A", nationality: "", affiliation: "", imageSearchKeyword: "", videoId: "dQw4w9WgXcQ",
      imageUrl: "u", imageThumbUrl: "t", imageStoragePath: "p", imageSource: { origin: "upload" },
      imageWidth: 1, imageHeight: 1, imageAddedAt: 1, imageFocusY: 2,
    });
    expect(d).toEqual({ name: "A", nationality: "", affiliation: "", imageSearchKeyword: "", videoId: "dQw4w9WgXcQ" });
  });
});

import { carryUnnamedImage } from "@/lib/lab/entryImages";
describe("carryUnnamedImage (리뷰 I-3 — AI 채우기가 그림을 지우지 않는다)", () => {
  const img = { imageUrl: "u", imageThumbUrl: "t", imageStoragePath: "p", imageSource: { origin: "upload" as const }, imageWidth: 1, imageHeight: 1, imageAddedAt: 1 };
  const blank = { name: "", nationality: "", affiliation: "", imageSearchKeyword: "" };
  const incoming = { name: "새 엔트리", nationality: "KR", affiliation: "G", imageSearchKeyword: "h" };
  it("이름 없는 칸의 그림은 새로 채운 이름에 남는다", () => {
    expect(carryUnnamedImage({ ...blank, ...img }, incoming)).toEqual({ ...incoming, ...img });
  });
  it("이름 있던 칸의 그림은 넘기지 않는다(다른 인물의 그림이 된다)", () => {
    expect(carryUnnamedImage({ ...blank, name: "옛 엔트리", ...img }, incoming)).toEqual(incoming);
  });
  it("그림 없는 칸 · 칸 없음 → 그대로", () => {
    expect(carryUnnamedImage(blank, incoming)).toEqual(incoming);
    expect(carryUnnamedImage(undefined, incoming)).toEqual(incoming);
  });
});

import { filledForAssignment, uploadStillCurrent } from "@/lib/lab/entryImages";
describe("filledForAssignment (리뷰 I-1 — 묶음을 연달아 넣어도 같은 칸에 두 번 배정하지 않는다)", () => {
  const blank = { name: "", nationality: "", affiliation: "", imageSearchKeyword: "" };
  it("그림이 있는 칸 + 올리는 중인 칸 = 찬 칸 · 48칸", () => {
    const f = filledForAssignment([{ ...blank, imageUrl: "u" }, blank, blank], new Set([2]));
    expect(f).toHaveLength(48);
    expect(f.slice(0, 4)).toEqual([true, false, true, false]);
  });
  it("두 번째 묶음은 첫 묶음이 잡은 칸을 건너뛴다", () => {
    const reserved = new Set(assignToEmptySlots(filledForAssignment([], new Set()), 20));
    expect(assignToEmptySlots(filledForAssignment([], reserved), 20)).toEqual(Array.from({ length: 20 }, (_, i) => 20 + i));
  });
});

describe("uploadStillCurrent (리뷰 I-2 — 끝난 업로드가 다른 초안에 섞이지 않는다)", () => {
  it("시작한 초안과 지금 초안이 같을 때만", () => {
    expect(uploadStillCurrent("d1", "d1")).toBe(true);
    expect(uploadStillCurrent("d1", null)).toBe(false);
    expect(uploadStillCurrent("d1", "d2")).toBe(false);
  });
});
