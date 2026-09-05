/**
 * decideGuestRun — 비로그인은 하루 **통틀어** 1판 (§5 DO 3, 2026-09-03 대표 확정 (가)안).
 *
 * §9 함정 4: 게스트 uid는 브라우저마다 새로 생기고 게스트의 선택도 랭킹에 집계된다.
 * 이 한도를 느슨하게 만들면 랭킹 조작 비용이 0이 된다.
 *
 * 한도는 Tournament를 가로지르므로 `guest_runs/{uid}` 문서 하나로 센다.
 * (회차 번호 자체는 게스트도 `tournament_runs` 에서 받는다 — 설계서 §1.4.)
 */
import { describe, expect, it } from "vitest";
import { decideGuestRun, GUEST_DAILY_RUN_LIMIT } from "@/lib/run/guestRun";

const TODAY = "2026-09-05";
const YESTERDAY = "2026-09-04";
const A = "gen4_idol_48";
const B = "best_stage_48";

const base = {
  lastRunDate: null as string | null,
  runsToday: 0,
  runTournamentId: null as string | null,
  todayKST: TODAY,
  tournamentId: A,
  currentRunComplete: false,
};

describe("decideGuestRun", () => {
  it("① 오늘 아직 안 돌았으면 허용한다", () => {
    expect(decideGuestRun(base)).toEqual({ status: "allow" });
  });

  it("② 오늘 시작한 그 판이 미완주면 이어하기를 허용한다 — 판을 새로 세지 않는다", () => {
    const r = decideGuestRun({
      ...base, lastRunDate: TODAY, runsToday: 1, runTournamentId: A, currentRunComplete: false,
    });
    expect(r).toEqual({ status: "allow" });
  });

  it("③ 완주한 판의 재도전은 로그인을 요구한다 (AC 6)", () => {
    const r = decideGuestRun({
      ...base, lastRunDate: TODAY, runsToday: 1, runTournamentId: A, currentRunComplete: true,
    });
    expect(r).toEqual({ status: "login_required" });
  });

  it("④ 다른 Tournament 진입은 로그인을 요구한다 — 하루 통틀어 1판이다 (AC 6)", () => {
    const r = decideGuestRun({
      ...base, lastRunDate: TODAY, runsToday: 1, runTournamentId: A,
      tournamentId: B, currentRunComplete: false,
    });
    expect(r).toEqual({ status: "login_required" });
  });

  it("⑤ 자정이 지나면 게스트도 1판이 다시 채워진다 (AC 7)", () => {
    // 날짜가 없으면 게스트가 영원히 1판만 하고 막힌다.
    const r = decideGuestRun({
      ...base, lastRunDate: YESTERDAY, runsToday: 1, runTournamentId: A, currentRunComplete: true,
    });
    expect(r).toEqual({ status: "allow" });
  });

  it("⑥ 어제 돌던 Tournament와 다른 곳이어도 오늘의 1판은 열린다", () => {
    const r = decideGuestRun({
      ...base, lastRunDate: YESTERDAY, runsToday: 1, runTournamentId: A, tournamentId: B,
    });
    expect(r).toEqual({ status: "allow" });
  });

  it("⑦ 한도 기본값은 1이다", () => {
    expect(GUEST_DAILY_RUN_LIMIT).toBe(1);
  });

  it("⑧ 게스트가 막히는 두 경우는 같은 판정을 낸다 — 문구도 하나(guest_limit)로 묶인다", () => {
    const 재도전 = decideGuestRun({
      ...base, lastRunDate: TODAY, runsToday: 1, runTournamentId: A, currentRunComplete: true,
    });
    const 다른대회 = decideGuestRun({
      ...base, lastRunDate: TODAY, runsToday: 1, runTournamentId: A, tournamentId: B,
    });
    expect(재도전).toEqual(다른대회);
  });
});
