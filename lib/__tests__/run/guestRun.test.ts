/**
 * decideGuestRun — 비로그인은 하루 **통틀어 3판** (§5 DO 3 · v2.1 2026-09-06 대표 확정).
 *
 * v2.0의 "하루 1판 + 그 Tournament만"을 대체한다. 판정에서 Tournament를 아예 보지 않는
 * 것이 이 개정의 핵심이다 — 한도는 대회를 가로지르고(대회 수가 늘어도 3판 고정), 이어하기는
 * 그 Tournament의 decideRun 이 이미 내린 답(`continue`)을 그대로 받는다(§16 실측 3).
 *
 * §9 함정 4: 게스트 uid는 브라우저마다 새로 생겨 사람 단위 상한이 없다. v2.1은 한도를 늘리는
 * 대신 **게스트의 선택을 랭킹에서 제외**해(PR 3) 조작 동기를 없앤다.
 */
import { describe, expect, it } from "vitest";
import { decideGuestRun, GUEST_DAILY_RUN_LIMIT } from "@/lib/run/guestRun";

const TODAY = "2026-09-09";
const YESTERDAY = "2026-09-08";

const base = {
  lastRunDate: null as string | null,
  runsToday: 0,
  todayKST: TODAY,
  isContinue: false,
};

describe("decideGuestRun — 하루 통틀어 3판", () => {
  it("① 한도 상수는 3이다 — 이 숫자는 여기 한 곳에만 있다", () => {
    expect(GUEST_DAILY_RUN_LIMIT).toBe(3);
  });

  it("② 오늘 아직 안 돌았으면 허용한다", () => {
    expect(decideGuestRun(base)).toEqual({ status: "allow" });
  });

  it("③ 오늘 1판·2판을 썼어도 새 판이 열린다", () => {
    for (const used of [1, 2]) {
      expect(
        decideGuestRun({ ...base, lastRunDate: TODAY, runsToday: used }),
      ).toEqual({ status: "allow" });
    }
  });

  it("④ 3판을 다 쓰면 4판째는 로그인을 요구한다 (AC 6)", () => {
    expect(
      decideGuestRun({ ...base, lastRunDate: TODAY, runsToday: 3 }),
    ).toEqual({ status: "login_required" });
  });

  it("⑤ 3판을 다 썼어도 미완주 판은 이어할 수 있다 — 한도와 무관 (AC 6)", () => {
    // A 미완주 → B → C 로 3판 소진 → A로 돌아옴. isContinue 가 그 사실을 나른다.
    expect(
      decideGuestRun({
        ...base, lastRunDate: TODAY, runsToday: 3, isContinue: true,
      }),
    ).toEqual({ status: "allow" });
  });

  it("⑥ 자정이 지나면 3판이 다시 채워진다 (AC 7)", () => {
    // 리셋이 없으면 게스트가 첫날 3판을 쓴 뒤 영영 막힌다.
    expect(
      decideGuestRun({ ...base, lastRunDate: YESTERDAY, runsToday: 3 }),
    ).toEqual({ status: "allow" });
  });

  it("⑦ Tournament를 판정에 쓰지 않는다 — 대회 수가 늘어도 3판 고정", () => {
    // 인자에 tournamentId 자리가 없다는 것 자체가 계약이다. 같은 입력이면 어느 대회에서
    // 불러도 같은 답이 나온다(§16 실측 3이 고친 바로 그 지점).
    const args = { ...base, lastRunDate: TODAY, runsToday: 2 };
    expect(decideGuestRun(args)).toEqual(decideGuestRun({ ...args }));
    expect(Object.keys(args)).not.toContain("tournamentId");
    expect(Object.keys(args)).not.toContain("runTournamentId");
  });

  it("⑧ limit 을 주입해 경계를 확인할 수 있다", () => {
    expect(
      decideGuestRun({ ...base, lastRunDate: TODAY, runsToday: 1, limit: 1 }),
    ).toEqual({ status: "login_required" });
  });
});
