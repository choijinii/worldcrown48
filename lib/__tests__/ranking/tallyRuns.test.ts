/**
 * tallyRuns — votes를 **판 단위**로 묶어 Crown Score의 재료를 만든다 (정본 §2·§3·§5).
 *
 * 이 모듈이 지키는 사실 하나: 라운드 N+1의 출전자는 라운드 N에서 뽑힌 사람이다
 * (`lib/arena/matches.ts`). 그래서 `votes` 만으로 6명의 등수와 "대결에 나온 횟수"가
 * 나오고, 대진 씨앗을 다시 돌릴 필요가 없다.
 */
import { describe, expect, it } from "vitest";
import { appearancesOf, tallyRuns, type RunVote } from "../../ranking/tallyRuns";

const TID = "t1";

/** 라운드별 매치 수 (lib/arena/roundConfig ROUND_CONFIG). */
const MATCH_COUNT: Record<number, number> = { 1: 24, 2: 12, 3: 6, 4: 3, 5: 1 };

/**
 * 완주한 판 한 개를 만든다.
 *
 * 승자는 `c0`부터 순서대로다 — r1 승자 24명 = c0..c23, r2 승자 12명 = c0..c11,
 * r3 승자 6명 = c0..c5, r4 승자 3명 = c0..c2, 결승 승자 = c0.
 * 따라서 1등 = c0 · 2등 = c1·c2 · 3등 = c3·c4·c5 가 된다.
 */
function completeRun(
  userId: string,
  runIndex: number,
  opts: { isGuest?: boolean; upToRound?: number } = {},
): RunVote[] {
  const votes: RunVote[] = [];
  const lastRound = opts.upToRound ?? 5;
  for (let round = 1; round <= lastRound; round++) {
    for (let m = 0; m < MATCH_COUNT[round]; m++) {
      votes.push({
        userId,
        runIndex,
        round,
        matchId: `${TID}:r${round}:m${m}`,
        contestantId: `c${m}`,
        ...(opts.isGuest === undefined ? {} : { isGuest: opts.isGuest }),
      });
    }
  }
  return votes;
}

describe("tallyRuns — 판 1회의 순위 점수", () => {
  it("완주한 판 1회가 나눠 주는 순위 점수의 합계는 언제나 26점 (정본 §2)", () => {
    const tally = tallyRuns(completeRun("u1", 1));

    const total = Array.from(tally.byContestant.values()).reduce(
      (sum, a) => sum + a.placementPoints,
      0,
    );
    expect(total).toBe(26);
  });

  it("1등 10점 · 2등 5점씩 2명 · 3등 2점씩 3명 (정본 §2)", () => {
    const { byContestant } = tallyRuns(completeRun("u1", 1));

    expect(byContestant.get("c0")?.placementPoints).toBe(10);
    expect(byContestant.get("c1")?.placementPoints).toBe(5);
    expect(byContestant.get("c2")?.placementPoints).toBe(5);
    expect(byContestant.get("c3")?.placementPoints).toBe(2);
    expect(byContestant.get("c4")?.placementPoints).toBe(2);
    expect(byContestant.get("c5")?.placementPoints).toBe(2);
    // 6강에도 못 간 Contestant은 0점.
    expect(byContestant.get("c6")?.placementPoints).toBe(0);
  });

  it("1등은 wins 1 · 나머지는 0", () => {
    const { byContestant } = tallyRuns(completeRun("u1", 1));
    expect(byContestant.get("c0")?.wins).toBe(1);
    expect(byContestant.get("c1")?.wins).toBe(0);
  });
});

describe("tallyRuns — 어떤 판을 세는가", () => {
  it("게스트 판은 통째로 제외한다 (D-02 · 대표 2026-09-24)", () => {
    const votes = [
      ...completeRun("fan", 1),
      ...completeRun("guest", 1, { isGuest: true }),
    ];
    const tally = tallyRuns(votes);

    expect(tally.runsTotal).toBe(1);
    expect(tally.byContestant.get("c0")?.wins).toBe(1);
  });

  it("한 판에 게스트 선택이 하나라도 섞이면 그 판 전체를 뺀다 (대표 2026-09-24)", () => {
    // linkSessionVote 가 재부모화에 부분 실패하면 한 판 안에 isGuest 가 섞일 수 있다.
    const mixed = completeRun("u1", 1);
    mixed[0] = { ...mixed[0], isGuest: true };

    expect(tallyRuns(mixed).runsTotal).toBe(0);
  });

  it("isGuest 필드가 없는 옛 기록은 집계에 포함한다 — 소급 제외 없음 (D-02)", () => {
    // completeRun 은 opts.isGuest 를 주지 않으면 필드 자체를 넣지 않는다.
    const legacy = completeRun("u1", 1);
    expect(legacy[0].isGuest).toBeUndefined();

    expect(tallyRuns(legacy).runsTotal).toBe(1);
  });

  it("완주하지 않은 판은 세지 않는다 (정본 §3 '완주한 판만')", () => {
    // 6강까지 가고 결승을 고르지 않은 판.
    const abandoned = completeRun("u1", 1, { upToRound: 4 });
    const tally = tallyRuns(abandoned);

    expect(tally.runsTotal).toBe(0);
    expect(tally.byContestant.size).toBe(0);
  });

  it("같은 Voter라도 회차가 다르면 다른 판이다", () => {
    const votes = [...completeRun("u1", 1), ...completeRun("u1", 2)];
    expect(tallyRuns(votes).runsTotal).toBe(2);
  });

  it("runIndex 필드가 없는 옛 기록은 1회차 판으로 읽는다", () => {
    const legacy = completeRun("u1", 1).map(({ runIndex: _drop, ...v }) => v);
    const tally = tallyRuns(legacy);

    expect(tally.runsTotal).toBe(1);
    expect(tally.byContestant.get("c0")?.wins).toBe(1);
  });
});

describe("appearancesOf — 대결에 나온 횟수", () => {
  it("완주 판 1회: 1등은 5번 나와 5번 뽑히고, 1라운드 탈락자는 1번 나와 0번 뽑힌다", () => {
    const { runsTotal, byContestant } = tallyRuns(completeRun("u1", 1));

    const champion = byContestant.get("c0")!;
    expect(champion.picks).toBe(5);
    expect(appearancesOf(champion, runsTotal)).toBe(5);

    const eliminated = byContestant.get("c23")!;
    expect(eliminated.picks).toBe(1); // 1라운드 m23에서 뽑혀 2라운드에 갔다
    expect(appearancesOf(eliminated, runsTotal)).toBe(2);
  });

  it("정본 §4 계산 예시의 4,450을 재현한다", () => {
    // 1,000판 · 뽑힘 3,750 · 1등 300번 → 1000 + 3750 − 300 = 4450
    expect(
      appearancesOf({ placementPoints: 5150, wins: 300, picks: 3750 }, 1000),
    ).toBe(4450);
  });
});
