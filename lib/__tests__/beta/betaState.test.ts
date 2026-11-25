/**
 * BETA-PASS-1 — /beta 화면 상태 판정(지시서 §3 ①~⑤).
 */
import { describe, expect, it } from "vitest";
import { BETA_COPY, betaCheckResultFromError, betaView } from "@/lib/beta/betaState";

describe("betaView", () => {
  it("로그인 상태를 아직 모르면 확인 중", () => {
    expect(betaView({ authLoading: true, user: null, check: "idle" })).toBe("checking");
  });
  it("로그인 전 · 익명 계정 → ① 로그인 전", () => {
    expect(betaView({ authLoading: false, user: null, check: "idle" })).toBe("signed-out");
    expect(betaView({ authLoading: false, user: { isAnonymous: true }, check: "idle" })).toBe("signed-out");
    // 익명 계정에 남은 결과가 있어도 로그인 전으로 본다
    expect(betaView({ authLoading: false, user: { isAnonymous: true }, check: "allowed" })).toBe("signed-out");
  });
  it("로그인 + 확인 결과", () => {
    const u = { isAnonymous: false };
    expect(betaView({ authLoading: false, user: u, check: "idle" })).toBe("checking");
    expect(betaView({ authLoading: false, user: u, check: "checking" })).toBe("checking");
    expect(betaView({ authLoading: false, user: u, check: "allowed" })).toBe("allowed");
    expect(betaView({ authLoading: false, user: u, check: "denied" })).toBe("denied");
    expect(betaView({ authLoading: false, user: u, check: "error" })).toBe("error");
  });
});

describe("betaCheckResultFromError", () => {
  it("명단 밖 = denied · 그 밖 = error", () => {
    expect(betaCheckResultFromError({ code: "functions/permission-denied" })).toBe("denied");
    expect(betaCheckResultFromError({ code: "permission-denied" })).toBe("denied");
    expect(betaCheckResultFromError({ code: "functions/unavailable" })).toBe("error");
    expect(betaCheckResultFromError({ code: "functions/internal" })).toBe("error");
    expect(betaCheckResultFromError(new Error("network"))).toBe("error");
    expect(betaCheckResultFromError(undefined)).toBe("error");
  });
});

describe("BETA_COPY — 대표 승인 문구(2026-11-25) 글자 그대로", () => {
  it("②~⑤", () => {
    expect(BETA_COPY.allowed).toBe("확인됐습니다! 이제 들어가실 수 있어요.");
    expect(BETA_COPY.kakao).toBe(
      "카카오톡 안에서는 구글 로그인이 막힐 수 있어요. 오른쪽 메뉴에서 [다른 브라우저로 열기]를 눌러 크롬이나 사파리로 열어 주세요.",
    );
    expect(BETA_COPY.denied).toBe("초대 명단에 없는 계정이에요. 저희에게 알려 주신 구글 계정으로 다시 로그인해 주세요.");
    expect(BETA_COPY.error).toBe("잠시 문제가 생겼어요. 다시 눌러 주세요.");
  });
});
