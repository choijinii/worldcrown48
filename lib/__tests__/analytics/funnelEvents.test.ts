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

const UID = "uidAAA";
const OTHER_UID = "uidBBB";

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
    const key = firstVoteKey(UID, "gen4_idol_48", 2);
    expect(key).toContain("gen4_idol_48");
    expect(key).toContain("2");
  });

  it("회차가 다르면 키가 다르다 — 이게 빠지면 2판째가 침묵한다", () => {
    expect(firstVoteKey(UID, "t", 1)).not.toBe(firstVoteKey(UID, "t", 2));
  });

  it("Tournament 가 다르면 키가 다르다", () => {
    expect(firstVoteKey(UID, "a", 1)).not.toBe(firstVoteKey(UID, "b", 1));
  });
});

describe("markFirstVote — 판당 1회", () => {
  beforeEach(() => {
    installFakeSessionStorage();
  });

  it("그 판의 첫 호출에만 true 를 준다", () => {
    expect(markFirstVote(UID, "t", 1)).toBe(true);
    expect(markFirstVote(UID, "t", 1)).toBe(false);
    expect(markFirstVote(UID, "t", 1)).toBe(false);
  });

  it("새 판(회차 +1)에서는 다시 true 를 준다", () => {
    expect(markFirstVote(UID, "t", 1)).toBe(true);
    expect(markFirstVote(UID, "t", 2)).toBe(true);
    expect(markFirstVote(UID, "t", 2)).toBe(false);
  });

  it("Tournament 별로 따로 센다", () => {
    expect(markFirstVote(UID, "a", 1)).toBe(true);
    expect(markFirstVote(UID, "b", 1)).toBe(true);
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
    expect(markFirstVote(UID, "t", 1)).toBe(false);
  });
});

describe("tournamentStartKey / duration_sec — 회차별 시작 시각", () => {
  beforeEach(() => {
    installFakeSessionStorage();
  });

  it("키에 회차가 들어간다", () => {
    expect(tournamentStartKey(UID, "t", 1)).not.toBe(tournamentStartKey(UID, "t", 2));
  });

  it("새 판은 시작 시각을 새로 기록한다 — 1판째 시작을 물려받지 않는다", () => {
    markTournamentStart(UID, "t", 1);
    // 1판째 기록이 있어도 2판째는 아직 없다.
    expect(readTournamentDurationSec(UID, "t", 2)).toBeNull();
    markTournamentStart(UID, "t", 2);
    expect(readTournamentDurationSec(UID, "t", 2)).not.toBeNull();
  });

  it("같은 판에서 다시 부르면 시작 시각을 덮어쓰지 않는다 (새로고침 대비)", () => {
    markTournamentStart(UID, "t", 1);
    const first = readTournamentDurationSec(UID, "t", 1);
    markTournamentStart(UID, "t", 1);
    expect(readTournamentDurationSec(UID, "t", 1)).toBe(first);
  });
});

/**
 * 🔴 2026-09-11 프로덕션 검증에서 실측된 결함의 회귀 테스트.
 *
 * 마커 키에 uid가 없어서, **같은 탭에서 계정이 바뀌면**(로그아웃→게스트, 게스트→로그인)
 * 회차 번호가 겹치는 순간 새 판의 `first_vote` 가 조용히 눌렸다. sessionStorage는 탭 단위라
 * 계정이 바뀌어도 남는다.
 *
 * 실제로 관측된 것: 게스트 2판째 `first_vote` 미발화 · `champion_confirmed.duration_sec` 이
 * 3901초(직전 계정의 시작 시각을 물려받음). 하필 **게스트→로그인**이 v2.1의 주 전환 경로라,
 * 이 PR이 만든 지표가 가장 중요한 퍼널에서 손상된다.
 */
describe("계정이 바뀌어도 판이 섞이지 않는다 (uid 포함 키)", () => {
  beforeEach(() => {
    installFakeSessionStorage();
  });

  it("uid가 다르면 first_vote 키가 다르다", () => {
    expect(firstVoteKey(UID, "t", 1)).not.toBe(firstVoteKey(OTHER_UID, "t", 1));
  });

  it("uid가 다르면 시작 시각 키가 다르다", () => {
    expect(tournamentStartKey(UID, "t", 1)).not.toBe(
      tournamentStartKey(OTHER_UID, "t", 1),
    );
  });

  it("같은 탭에서 계정이 바뀌면 새 계정의 1회차도 발화한다", () => {
    // 로그아웃 → 게스트 전환. 앞 계정이 1회차 마커를 남겼어도 게스트는 자기 판을 쏴야 한다.
    expect(markFirstVote(UID, "t", 1)).toBe(true);
    expect(markFirstVote(OTHER_UID, "t", 1)).toBe(true);
    // 각자 한 번씩만.
    expect(markFirstVote(UID, "t", 1)).toBe(false);
    expect(markFirstVote(OTHER_UID, "t", 1)).toBe(false);
  });

  it("계정이 바뀌면 시작 시각을 물려받지 않는다 (duration_sec 오염 차단)", () => {
    markTournamentStart(UID, "t", 1);
    expect(readTournamentDurationSec(OTHER_UID, "t", 1)).toBeNull();
    markTournamentStart(OTHER_UID, "t", 1);
    expect(readTournamentDurationSec(OTHER_UID, "t", 1)).not.toBeNull();
  });
});
