/**
 * ARENA-1 PR 1 — 무대 문구 (승인본을 글자 단위로 고정).
 *
 * 무대 위에 새로 올라가는 팬 노출 문구는 이 한 줄뿐이다. 무대 금지 4종(라운드 라벨 ·
 * 득표율 · 마감 타이머 · 개발자 고지문)은 E2E(arena1-split-stage)가 판정한다.
 */
import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/lib/i18n/messages";

describe("arena.stage.rotateHint (D-17 ② · §5 게이트 2)", () => {
  it("ko = 디자인 파일 문구 그대로, en·es = 2026-09-19 승인본", () => {
    expect(MESSAGES["arena.stage.rotateHint"]).toEqual({
      ko: "가로로 돌리면 무대가 더 크게 열립니다",
      en: "Turn sideways for a bigger stage",
      es: "Gira el móvil para un escenario más grande",
    });
  });

  it("낱말 규칙 D-03 — 투표·표·예측·배당·vote 없음", () => {
    for (const s of Object.values(MESSAGES["arena.stage.rotateHint"])) {
      expect(s).not.toMatch(/투표|표|예측|배당|vote/i);
    }
  });
});
