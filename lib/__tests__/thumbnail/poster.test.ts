/**
 * THUMB-1 — 포스터 불러오기 다음 단계 (킥 §4 ㉣).
 *
 * 유튜브는 없는 해상도·지워진 영상에 404 대신 120×90 회색 그림을 줄 때가 있다
 * (StageSide 실측). 마지막 주소까지 실패하면 "그림 깨짐"이다.
 */
import { describe, expect, it } from "vitest";
import { YT_PLACEHOLDER_WIDTH, posterStep } from "@/lib/thumbnail/poster";

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
