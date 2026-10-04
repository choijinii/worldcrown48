/**
 * alertTitle — 운영자 페이지 알림 제목은 알림 종류(type)별로 다르다 (CARD-FIX).
 *
 * 그동안 AlertList 는 모든 알림을 "차트 이상 징후" 하나로 그렸다. 크라운 카드 생성 실패
 * 알림(crown_card_render_failed)이 같은 제목으로 뜨면 운영자가 차트 문제로 오해한다.
 */
import { describe, expect, it } from "vitest";
import { alertTitle } from "@/lib/admin/dashboard/alertTitle";

describe("alertTitle", () => {
  it("크라운 카드 생성 실패 알림은 제 제목을 쓴다", () => {
    expect(alertTitle("crown_card_render_failed", "ko")).toBe("크라운 카드 이미지 생성 실패");
    expect(alertTitle("crown_card_render_failed", "en")).toBe("Crown Card image failed");
  });

  it("차트 이상 징후(T-1~T-4)는 지금 제목 그대로", () => {
    for (const t of ["T-1", "T-2", "T-3", "T-4"]) {
      expect(alertTitle(t, "ko")).toBe("차트 이상 징후");
      expect(alertTitle(t, "en")).toBe("Chart anomaly");
    }
  });

  it("모르는 종류는 지금처럼 차트 이상 징후로 (기존 동작 유지)", () => {
    expect(alertTitle("something-else", "ko")).toBe("차트 이상 징후");
  });

  it("es 는 지금처럼 영어 (AlertList 의 기존 언어 규칙: ko 가 아니면 en)", () => {
    expect(alertTitle("crown_card_render_failed", "es")).toBe("Crown Card image failed");
    expect(alertTitle("T-1", "es")).toBe("Chart anomaly");
  });
});
