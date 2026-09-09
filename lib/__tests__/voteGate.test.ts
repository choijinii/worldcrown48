/**
 * decideVoteGate — 클라이언트 게이트 (v2.1).
 *
 * HF-1의 "하루 새 대회 5개"(`daily_participation`)와 HF-3의 sessionStorage 마커는 v2.0/v2.1로
 * **폐기**됐다. 이제 게이트는 스스로 읽지 않는다 — `voteStore` 가 한 번 읽어 만든
 * `decideRun`·`decideGuestRun` 판정을 받아 화면 언어로 번역만 한다. 읽기가 두 곳이면 답도
 * 두 개가 되고, 그게 §9 함정 5다(2026-07-05 사고가 정확히 이 유형이었다).
 *
 * 우선순위는 서버(`onVote`)와 같다: 게스트 한도 → 이어하기/새 판 → 마감 → 일일 한도.
 */
import { describe, expect, it } from "vitest";
import { decideVoteGate } from "../voteGate";

const allowGuest = { status: "allow" } as const;
const blockGuest = { status: "login_required" } as const;

describe("로그인 팬", () => {
  it("새 판이면 통과", () => {
    expect(
      decideVoteGate({
        isAnonymous: false,
        runDecision: { status: "new_run", runIndex: 2 },
        guestDecision: allowGuest,
      }),
    ).toEqual({ status: "allowed" });
  });

  it("이어하기도 통과 — 한도를 쓰지 않는다 (AC 8)", () => {
    expect(
      decideVoteGate({
        isAnonymous: false,
        runDecision: { status: "continue", runIndex: 3 },
        guestDecision: allowGuest,
      }),
    ).toEqual({ status: "allowed" });
  });

  it("5판 소진이면 daily_limit_reached (AC 1)", () => {
    expect(
      decideVoteGate({
        isAnonymous: false,
        runDecision: { status: "limit_reached" },
        guestDecision: allowGuest,
      }),
    ).toEqual({ status: "daily_limit_reached" });
  });

  it("마감이면 deadline_passed (AC 9)", () => {
    expect(
      decideVoteGate({
        isAnonymous: false,
        runDecision: { status: "deadline_passed" },
        guestDecision: allowGuest,
      }),
    ).toEqual({ status: "deadline_passed" });
  });

  it("게스트 원장이 막혀 있어도 로그인 팬에게는 영향이 없다", () => {
    expect(
      decideVoteGate({
        isAnonymous: false,
        runDecision: { status: "new_run", runIndex: 1 },
        guestDecision: blockGuest,
      }),
    ).toEqual({ status: "allowed" });
  });
});

describe("게스트 (AC 6·17)", () => {
  it("3판을 다 쓰면 guest_limit 이유로 로그인을 요구한다", () => {
    // reason 이 "vote" 가 아니라 "guest_limit" 인 것이 핵심이다 — 왜 막혔는지를 말해야
    // Google 버튼이 있는 전환 화면으로 간다(2026-09-05 대표 확정).
    expect(
      decideVoteGate({
        isAnonymous: true,
        runDecision: { status: "new_run", runIndex: 1 },
        guestDecision: blockGuest,
      }),
    ).toEqual({ status: "login_required", reason: "guest_limit" });
  });

  it("게스트 한도가 마감보다 먼저다 — 서버와 같은 순서", () => {
    expect(
      decideVoteGate({
        isAnonymous: true,
        runDecision: { status: "deadline_passed" },
        guestDecision: blockGuest,
      }),
    ).toEqual({ status: "login_required", reason: "guest_limit" });
  });

  it("한도가 남았으면 통과", () => {
    expect(
      decideVoteGate({
        isAnonymous: true,
        runDecision: { status: "new_run", runIndex: 1 },
        guestDecision: allowGuest,
      }),
    ).toEqual({ status: "allowed" });
  });

  it("3판을 다 썼어도 이어하기는 통과 (AC 6)", () => {
    expect(
      decideVoteGate({
        isAnonymous: true,
        runDecision: { status: "continue", runIndex: 1 },
        guestDecision: allowGuest,
      }),
    ).toEqual({ status: "allowed" });
  });
});

describe("폐기된 HF-1/HF-3 표면", () => {
  it("옛 상수·헬퍼가 남아 있지 않다", async () => {
    // 남겨 두면 다음 사람이 "하루 새 대회 5개"로 되돌린다 (Stale-Doc Guard는 코드에도 적용).
    const mod = await import("../voteGate");
    for (const gone of [
      "DAILY_PARTICIPATION_LIMIT",
      "GUEST_RUN_TID_KEY",
      "markGuestRunTournament",
      "getGuestRunState",
      "getDailyParticipation",
    ]) {
      expect(mod, gone).not.toHaveProperty(gone);
    }
  });
});
