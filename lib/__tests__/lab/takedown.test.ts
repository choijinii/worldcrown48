/**
 * IMAGE-1 PR 3 (원장 D-93) — Lab 내리기 창의 순수 판정: 대회 종류에 따른 문구 · 엔트리 줄 · 사유 필수.
 */
import { describe, expect, it } from "vitest";
import { isReasonValid, takedownCopy, takedownKind, takedownRows } from "@/lib/lab/takedown";

describe("takedownKind — mediaKind 없음 = 영상 대회", () => {
  it("image 만 이미지 대회", () => {
    expect(takedownKind({ mediaKind: "image" })).toBe("image");
    expect(takedownKind({ mediaKind: "video" })).toBe("video");
    expect(takedownKind({})).toBe("video");
    expect(takedownKind({ mediaKind: "weird" as never })).toBe("video");
  });
});

describe("takedownCopy — 버튼 · 창 문구를 종류에 따라", () => {
  it("이미지 대회 = 문구 6 · 7 · 8 · 12 · 13 · 14 · 16 · 17", () => {
    expect(takedownCopy("image")).toEqual({
      button: "lab.takedown.image.button",
      title: "lab.takedown.image.title",
      note: "lab.takedown.image.note",
      confirm: "lab.takedown.image.confirm",
      run: "lab.takedown.image.run",
      done: "lab.takedown.image.done",
      fail: "lab.takedown.image.fail",
      empty: "lab.takedown.image.empty",
    });
  });
  it("영상 대회 = 6영 …", () => {
    expect(takedownCopy("video").button).toBe("lab.takedown.video.button");
    expect(takedownCopy("video").empty).toBe("lab.takedown.video.empty");
  });
});

const img = (host: string) => ({ type: "image", image: { url: "u", sourcePage: `https://www.${host}/a`, origin: "search" } });
describe("takedownRows — 칸 순서 · 내릴 수 있는가 · 내린 줄", () => {
  const contestants = [
    { id: "c2", order: 2, name: "B", media: img("people.com") },
    { id: "c1", order: 1, name: "A", media: { type: "image", takedown: { at: 1 } } },
    { id: "c3", order: 3, name: "C", media: { type: "image", image: { url: "u", origin: "upload" } } },
    { id: "c4", order: 4, name: "D" },
  ];
  const records = { c1: { atMs: Date.UTC(2026, 10, 27, 3), reason: "소속사 요청" } };

  it("이미지 대회: 그림이 있는 칸만 [내리기] · 도메인 글자(파일은 없음) · 내린 줄은 날짜(KST) · 사유", () => {
    const rows = takedownRows("image", contestants, records);
    expect(rows.map((r) => r.id)).toEqual(["c1", "c2", "c3", "c4"]);
    expect(rows[0]).toMatchObject({ state: "down", date: "2026-11-27", reason: "소속사 요청" });
    expect(rows[1]).toMatchObject({ state: "can", host: "people.com" });
    expect(rows[2]).toMatchObject({ state: "can", host: "" });
    expect(rows[3]).toMatchObject({ state: "none" });
  });

  it("영상 대회: 영상(내려가지 않은)이 있는 칸만 [내리기] · 도메인 없음", () => {
    const rows = takedownRows(
      "video",
      [
        { id: "v1", order: 1, name: "A", media: { type: "embed", embed: { videoId: "dQw4w9WgXcQ" } } },
        { id: "v2", order: 2, name: "B", media: { type: "embed", embed: { videoId: "dQw4w9WgXcQ", gone: true } } },
        { id: "v3", order: 3, name: "C" },
      ],
      {},
    );
    expect(rows.map((r) => r.state)).toEqual(["can", "can", "none"]);
    expect(rows[0].host).toBe("");
  });

  it("내린 줄의 기록을 아직 못 읽었으면 날짜는 엔트리의 내린 시각 · 사유 빈 글자", () => {
    const rows = takedownRows("image", [{ id: "c1", order: 1, name: "A", media: { type: "image", takedown: { at: Date.UTC(2026, 10, 27, 16) } } }], {});
    expect(rows[0]).toMatchObject({ state: "down", date: "2026-11-28", reason: "" });
  });
});

describe("isReasonValid — 사유 필수", () => {
  it("빈 글자 · 띄어쓰기만 = 거절 · 300자 넘음 = 거절", () => {
    expect(isReasonValid("")).toBe(false);
    expect(isReasonValid("   ")).toBe(false);
    expect(isReasonValid("x".repeat(301))).toBe(false);
    expect(isReasonValid(" 소속사 요청 ")).toBe(true);
  });
});
