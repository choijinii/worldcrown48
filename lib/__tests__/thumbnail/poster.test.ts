/**
 * THUMB-1 — 포스터 불러오기 다음 단계 (킥 §4 ㉣).
 *
 * 유튜브는 없는 해상도·지워진 영상에 404 대신 120×90 회색 그림을 줄 때가 있다
 * (StageSide 실측). 마지막 주소까지 실패하면 "그림 깨짐"이다.
 */
import { describe, expect, it } from "vitest";
import { YT_PLACEHOLDER_WIDTH, posterStep, posterZoom } from "@/lib/thumbnail/poster";

describe("posterStep", () => {
  it("제대로 된 그림이면 그대로", () => {
    expect(posterStep(0, 2, { loadedWidth: 1280 })).toBe("ok");
  });

  it("오류면 다음 주소로", () => {
    expect(posterStep(0, 2, "error")).toBe("next");
  });

  it("회색 자리 그림(폭 ≤120)이면 다음 주소로", () => {
    expect(posterStep(0, 2, { loadedWidth: YT_PLACEHOLDER_WIDTH })).toBe("next");
  });

  it("마지막 주소도 오류면 깨짐", () => {
    expect(posterStep(1, 2, "error")).toBe("broken");
  });

  it("마지막 주소도 회색 자리 그림이면 깨짐(지워진·비공개 영상)", () => {
    expect(posterStep(1, 2, { loadedWidth: 120 })).toBe("broken");
  });
});

// THUMB-1 PR 2 (코티오 승인 ⑥) — hqdefault(4:3 · 480×360) 폴백에는 검은 띠가 그림 안에 박혀 있다.
// 가로 영상 = 위아래 띠(내용 = 가운데 75% 높이) · 세로 영상 = 좌우 띠(내용 = 가운데 27/64 폭).
// 반쪽 칸(8:9)에 cover 로 채운 뒤 가운데 기준으로 이만큼 키우면 띠가 칸 밖으로 나간다.
describe("posterZoom — hqdefault 폴백의 검은 띠 없애기", () => {
  it("첫 주소(hq720 · oar2)는 그대로 1", () => {
    expect(posterZoom(0, 2, "landscape")).toBe(1);
    expect(posterZoom(0, 2, "portrait")).toBe(1);
  });
  it("가로 영상의 hqdefault = 4/3 (위아래 띠 12.5%씩이 칸 밖으로)", () => {
    expect(posterZoom(1, 2, "landscape")).toBeCloseTo(4 / 3, 6);
  });
  it("세로 영상의 hqdefault = 128/81 (좌우 띠가 8:9 칸 밖으로)", () => {
    expect(posterZoom(1, 2, "portrait")).toBeCloseTo(128 / 81, 6);
  });
});
