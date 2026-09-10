/**
 * RUN-1 PR 3 · EVENT_SPEC v1.2 ⑩ — `first_vote` 의 "판당 정확히 1회" 판정.
 *
 * 핵심은 두 방향이다:
 *   · 새로고침·이어하기로 **다시 발화하지 않는다**
 *   · 새 판(회차 +1)에서는 **반드시 다시 발화한다** — 키에 회차가 빠지면 2판째가 통째로 침묵한다
 *
 * `markTournamentStart` 와 같은 `sessionStorage` 관례를 따르되 키에 회차를 넣는다.
 * node 환경이라 브라우저 전역을 흉내 내 검증한다.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  firstVoteKey,
  markFirstVote,
  markTournamentStart,
  readTournamentDurationSec,
  tournamentStartKey,
} from "@/lib/analytics/funnelEvents";

function installFakeSessionStorage(): void {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).window = {};
  (globalThis as Record<string, unknown>).sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
}

describe("firstVoteKey", () => {
  it("키에 Tournament 와 회차가 모두 들어간다", () => {
    const key = firstVoteKey("gen4_idol_48", 2);
    expect(key).toContain("gen4_idol_48");
    expect(key).toContain("2");
  });

  it("회차가 다르면 키가 다르다 — 이게 빠지면 2판째가 침묵한다", () => {
    expect(firstVoteKey("t", 1)).not.toBe(firstVoteKey("t", 2));
  });

  it("Tournament 가 다르면 키가 다르다", () => {
    expect(firstVoteKey("a", 1)).not.toBe(firstVoteKey("b", 1));
  });
});

describe("markFirstVote — 판당 1회", () => {
  beforeEach(() => {
    installFakeSessionStorage();
  });

  it("그 판의 첫 호출에만 true 를 준다", () => {
    expect(markFirstVote("t", 1)).toBe(true);
    expect(markFirstVote("t", 1)).toBe(false);
    expect(markFirstVote("t", 1)).toBe(false);
  });

  it("새 판(회차 +1)에서는 다시 true 를 준다", () => {
    expect(markFirstVote("t", 1)).toBe(true);
    expect(markFirstVote("t", 2)).toBe(true);
    expect(markFirstVote("t", 2)).toBe(false);
  });

  it("Tournament 별로 따로 센다", () => {
    expect(markFirstVote("a", 1)).toBe(true);
    expect(markFirstVote("b", 1)).toBe(true);
  });

  it("sessionStorage 를 못 쓰면 false — 조용히 건너뛴다", () => {
    // 프라이빗 모드 등. 중복 발화를 막을 수단이 없으면 아예 안 쏘는 쪽이 안전하다.
    (globalThis as Record<string, unknown>).sessionStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(markFirstVote("t", 1)).toBe(false);
  });
});

describe("tournamentStartKey / duration_sec — 회차별 시작 시각", () => {
  beforeEach(() => {
    installFakeSessionStorage();
  });

  it("키에 회차가 들어간다", () => {
    expect(tournamentStartKey("t", 1)).not.toBe(tournamentStartKey("t", 2));
  });

  it("새 판은 시작 시각을 새로 기록한다 — 1판째 시작을 물려받지 않는다", () => {
    markTournamentStart("t", 1);
    // 1판째 기록이 있어도 2판째는 아직 없다.
    expect(readTournamentDurationSec("t", 2)).toBeNull();
    markTournamentStart("t", 2);
    expect(readTournamentDurationSec("t", 2)).not.toBeNull();
  });

  it("같은 판에서 다시 부르면 시작 시각을 덮어쓰지 않는다 (새로고침 대비)", () => {
    markTournamentStart("t", 1);
    const first = readTournamentDurationSec("t", 1);
    markTournamentStart("t", 1);
    expect(readTournamentDurationSec("t", 1)).toBe(first);
  });
});
