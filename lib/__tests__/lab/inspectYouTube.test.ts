/**
 * inspectErrorCode — 콜러블 오류를 화면 문구로 잇는 분류 (LAB-UX-1 마무리).
 *
 * 2026-08-25 실측: 서버는 **서로 다른 세 사유**를 같은 `resource-exhausted`로
 * 던진다 — 요청 과다 · AI 일일 캡 · YouTube 쿼터. 그걸 하나로 뭉쳐 "유튜브 검색
 * 횟수가 부족합니다"로 보여줬더니, YouTube 쿼터가 **50콜 남은** 화면에서 그 문구가
 * 떴다. 운영자는 남아 있는 숫자를 보며 원인을 못 찾는다.
 *
 * 서버는 이미 `details.code`로 사유를 실어 보내고 있었다 — 읽지 않았을 뿐이다.
 */
import { describe, expect, it } from "vitest";
import { inspectErrorCode } from "@/lib/lab/inspectYouTube";
import { sourcingErrorMessage } from "@/lib/lab/sourcingMessages";

describe("inspectErrorCode — 기존 분류", () => {
  it("권한 오류 두 가지를 한 갈래로 모은다", () => {
    expect(inspectErrorCode({ code: "functions/permission-denied" })).toBe(
      "permission-denied",
    );
    expect(inspectErrorCode({ code: "unauthenticated" })).toBe("permission-denied");
  });

  it("모르는 코드는 unknown", () => {
    expect(inspectErrorCode({ code: "internal" })).toBe("unknown");
    expect(inspectErrorCode(new Error("boom"))).toBe("unknown");
  });
});

describe("inspectErrorCode — resource-exhausted 세 사유를 가른다", () => {
  it("AI 일일 캡은 quota-daily", () => {
    expect(
      inspectErrorCode({
        code: "functions/resource-exhausted",
        details: { code: "ai_daily_limit", kind: "refreshSlotVideo", limit: 30 },
      }),
    ).toBe("quota-daily");
  });

  it("YouTube 쿼터는 quota-youtube", () => {
    expect(
      inspectErrorCode({
        code: "resource-exhausted",
        details: { code: "youtube_daily_quota", bucket: "search" },
      }),
    ).toBe("quota-youtube");
  });

  it("★details가 없으면 좁히지 않는다 — 검수기 경로는 쿼터 초과도 details 없이 던진다", () => {
    // 여기서 "요청이 너무 잦습니다"로 단정하면 쿼터가 진짜 바닥난 운영자를
    // 엉뚱한 곳으로 보낸다. 모르면 기존 문구를 유지한다.
    expect(inspectErrorCode({ code: "resource-exhausted" })).toBe("resource-exhausted");
  });

  it("★회귀: AI 캡을 유튜브 쿼터로 읽지 않는다", () => {
    const code = inspectErrorCode({
      code: "resource-exhausted",
      details: { code: "ai_daily_limit" },
    });
    expect(code).not.toBe("quota-youtube");
    expect(sourcingErrorMessage(code).key).toBe("lab.source.error.dailyCap");
  });
});
