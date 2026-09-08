import { describe, it, expect } from "vitest";
import {
  planRoundProgressTransfer,
  transferredTournaments,
  conflictTournamentIds,
  type RoundProgressFacts,
} from "../core/linkRoundProgress";

/**
 * linkRoundProgress — pure planner for the Guest Run roundProgress transfer
 * (HF-3 W4, Phase 3.3). When a guest signs in, their per-Voter roundProgress
 * must move to the Google uid so the run's progress + Champion survive:
 *
 *   - Google already has a roundProgress for this tid  → SKIP (Google wins,
 *     §8 Edge #1); the response `complete` reflects the GOOGLE doc.
 *   - Guest has no roundProgress (mid round-1, votes carry it) → SKIP.
 *   - Guest doc, incomplete  → COPY (single create under the new uid).
 *   - Guest doc, complete    → REFIRE (Option A 2-stage create→update so the
 *     onChampionConfirmed onDocumentUpdated trigger regenerates the Crown Card).
 *
 * The impure linkSessionVote fetches these booleans + the field snapshot and
 * executes the writes; this core is pure so the decision table is unit-tested.
 */
const fact = (over: Partial<RoundProgressFacts> = {}): RoundProgressFacts => ({
  tournamentId: "t1",
  runIndex: 1,
  guestExists: true,
  guestComplete: false,
  googleExists: false,
  googleComplete: false,
  ...over,
});

describe("planRoundProgressTransfer", () => {
  it("SKIPs when Google already has the roundProgress (Google wins, §8 Edge 1)", () => {
    expect(planRoundProgressTransfer([fact({ googleExists: true, googleComplete: false })])).toEqual([
      { tournamentId: "t1", runIndex: 1, action: "skip", responseComplete: false, source: "existing" },
    ]);
  });

  it("SKIP with responseComplete=true + source=existing when Google already completed it (HF-3.1 conflict landing)", () => {
    expect(planRoundProgressTransfer([fact({ googleExists: true, googleComplete: true })])).toEqual([
      { tournamentId: "t1", runIndex: 1, action: "skip", responseComplete: true, source: "existing" },
    ]);
  });

  it("SKIPs when the guest has no roundProgress (mid round-1 — votes carry it)", () => {
    expect(planRoundProgressTransfer([fact({ guestExists: false })])).toEqual([
      { tournamentId: "t1", runIndex: 1, action: "skip", responseComplete: false, source: "existing" },
    ]);
  });

  it("COPYs an incomplete guest run (single create) — source=guest", () => {
    expect(planRoundProgressTransfer([fact({ guestComplete: false })])).toEqual([
      { tournamentId: "t1", runIndex: 1, action: "copy", responseComplete: false, source: "guest" },
    ]);
  });

  it("REFIREs a completed guest run (2-stage → Crown Card regen) — source=guest", () => {
    expect(planRoundProgressTransfer([fact({ guestComplete: true })])).toEqual([
      { tournamentId: "t1", runIndex: 1, action: "refire", responseComplete: true, source: "guest" },
    ]);
  });

  it("plans each tournament independently (mixed guest + existing in one run)", () => {
    const plan = planRoundProgressTransfer([
      fact({ tournamentId: "a", guestComplete: true }),
      fact({ tournamentId: "b", googleExists: true, googleComplete: true }),
      fact({ tournamentId: "c", guestExists: false }),
    ]);
    expect(plan).toEqual([
      { tournamentId: "a", runIndex: 1, action: "refire", responseComplete: true, source: "guest" },
      { tournamentId: "b", runIndex: 1, action: "skip", responseComplete: true, source: "existing" },
      { tournamentId: "c", runIndex: 1, action: "skip", responseComplete: false, source: "existing" },
    ]);
  });
});

describe("conflictTournamentIds (HF-3.1 — votes on these are DELETED, not re-parented)", () => {
  it("returns the tids where Google already has a roundProgress (googleExists)", () => {
    const facts = [
      fact({ tournamentId: "a", guestComplete: true }), // case 1 — new tournament, non-conflict
      fact({ tournamentId: "b", googleExists: true, googleComplete: true }), // case 2 — conflict
      fact({ tournamentId: "c", googleExists: true, googleComplete: false }), // conflict (mid old run)
    ];
    expect(conflictTournamentIds(facts)).toEqual(["b", "c"]);
  });

  it("returns [] when no tournament conflicts (all new — case 1)", () => {
    expect(
      conflictTournamentIds([
        fact({ tournamentId: "a", guestComplete: true }),
        fact({ tournamentId: "b", guestComplete: false }),
      ]),
    ).toEqual([]);
  });
});

describe("transferredTournaments (linkSessionVote response payload)", () => {
  it("maps the plan to { tournamentId, complete, source } for the landing decision", () => {
    const plan = planRoundProgressTransfer([
      fact({ tournamentId: "a", guestComplete: true }),
      fact({ tournamentId: "b", googleExists: true, googleComplete: true }),
    ]);
    expect(transferredTournaments(plan)).toEqual([
      { tournamentId: "a", complete: true, source: "guest" },
      { tournamentId: "b", complete: true, source: "existing" },
    ]);
  });
});

describe("회차 단위 이관 (v2.1 — 게스트 3판)", () => {
  it("한 대회의 여러 회차를 각각 계획한다", () => {
    // 게스트가 같은 대회를 3판 돌고 로그인한 경우. v2.0(하루 1판)에서는 있을 수 없었다.
    const plan = planRoundProgressTransfer([
      fact({ tournamentId: "A", runIndex: 1, guestComplete: true }),
      fact({ tournamentId: "A", runIndex: 2, guestComplete: true }),
      fact({ tournamentId: "A", runIndex: 3, guestComplete: false }),
    ]);
    expect(plan.map((d) => [d.runIndex, d.action])).toEqual([
      [1, "refire"],
      [2, "refire"],
      [3, "copy"],
    ]);
  });

  it("완주한 회차마다 카드가 다시 발화된다 (AC 4·5)", () => {
    // refire 는 2단계 쓰기로 onChampionConfirmed 를 깨워 그 회차의 Crown Card를 만든다.
    // 회차를 안 나누면 2·3판째 카드가 영영 안 생긴다.
    const plan = planRoundProgressTransfer([
      fact({ tournamentId: "A", runIndex: 1, guestComplete: true }),
      fact({ tournamentId: "A", runIndex: 2, guestComplete: true }),
    ]);
    expect(plan.filter((d) => d.action === "refire")).toHaveLength(2);
  });

  it("충돌은 대회 단위다 — Google이 그 대회에 판이 있으면 게스트 회차 전부를 버린다", () => {
    // 회차는 단조 증가라 1회차 없이 2회차가 생기지 않는다. 그래서 Google의 1회차 문서
    // 존재만으로 그 대회 전체의 충돌이 판정된다(HF-3.1 케이스 2 무변경).
    const facts = [
      fact({ tournamentId: "A", runIndex: 1, guestComplete: true, googleExists: true, googleComplete: true }),
      fact({ tournamentId: "A", runIndex: 2, guestComplete: true, googleExists: true, googleComplete: true }),
    ];
    expect(planRoundProgressTransfer(facts).every((d) => d.action === "skip")).toBe(true);
    // 대회 id는 중복 없이 한 번만 나온다 — 호출자가 votes 삭제 판정에 쓰는 집합이다.
    expect(conflictTournamentIds(facts)).toEqual(["A"]);
  });

  it("서로 다른 대회의 회차가 섞여도 각각 판정된다", () => {
    const plan = planRoundProgressTransfer([
      fact({ tournamentId: "A", runIndex: 1, guestComplete: true }),
      fact({ tournamentId: "B", runIndex: 1, guestComplete: false }),
      fact({ tournamentId: "A", runIndex: 2, guestComplete: false }),
    ]);
    expect(plan.map((d) => [d.tournamentId, d.runIndex, d.action])).toEqual([
      ["A", 1, "refire"],
      ["B", 1, "copy"],
      ["A", 2, "copy"],
    ]);
  });

  it("응답에는 대회당 한 줄만 나간다 — 착지는 대회 단위다", () => {
    // 클라이언트는 "어느 대회의 카드로 갈까"를 고르지 회차를 고르지 않는다.
    const plan = planRoundProgressTransfer([
      fact({ tournamentId: "A", runIndex: 1, guestComplete: true }),
      fact({ tournamentId: "A", runIndex: 2, guestComplete: false }),
    ]);
    expect(transferredTournaments(plan)).toEqual([
      { tournamentId: "A", complete: true, source: "guest" },
    ]);
  });

  it("한 회차라도 완주했으면 그 대회는 완주다 — 순서와 무관하게", () => {
    const plan = planRoundProgressTransfer([
      fact({ tournamentId: "A", runIndex: 1, guestComplete: false }),
      fact({ tournamentId: "A", runIndex: 2, guestComplete: true }),
    ]);
    expect(transferredTournaments(plan)).toEqual([
      { tournamentId: "A", complete: true, source: "guest" },
    ]);
  });
});
