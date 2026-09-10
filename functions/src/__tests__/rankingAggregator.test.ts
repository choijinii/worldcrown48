/**
 * rankingAggregator — votes → counts → tallies (handoff §3 / trap #2).
 */
import { describe, expect, it } from "vitest";
import {
  buildTallies,
  tallyVotes,
  type ContestantMeta,
} from "../core/rankingAggregator";

const meta = (id: string, name = id, videoId = ""): ContestantMeta => ({
  id,
  name,
  videoId,
});

describe("tallyVotes", () => {
  it("groups votes by contestantId", () => {
    const counts = tallyVotes([
      { contestantId: "a" },
      { contestantId: "b" },
      { contestantId: "a" },
      { contestantId: "a" },
    ]);
    expect(counts.get("a")).toBe(3);
    expect(counts.get("b")).toBe(1);
  });

  it("empty votes → empty map", () => {
    expect(tallyVotes([]).size).toBe(0);
  });

  it("ignores votes with a blank contestantId (defensive)", () => {
    const counts = tallyVotes([{ contestantId: "" }, { contestantId: "a" }]);
    expect(counts.size).toBe(1);
    expect(counts.get("a")).toBe(1);
  });
});

describe("buildTallies", () => {
  it("joins counts onto contestants, 0-vote included", () => {
    const counts = tallyVotes([{ contestantId: "a" }, { contestantId: "a" }]);
    const tallies = buildTallies(counts, [meta("a", "Alpha"), meta("b", "Bravo")]);
    expect(tallies).toEqual([
      { contestantId: "a", name: "Alpha", videoId: null, voteCount: 2 },
      { contestantId: "b", name: "Bravo", videoId: null, voteCount: 0 },
    ]);
  });

  it("normalizes empty videoId to null, keeps a real one (LAB-UX-1 PR-2)", () => {
    const tallies = buildTallies(new Map(), [
      meta("a", "Alpha", ""),
      meta("b", "Bravo", "9bZkp7q19f0"),
    ]);
    expect(tallies[0].videoId).toBeNull();
    expect(tallies[1].videoId).toBe("9bZkp7q19f0");
  });
});

/**
 * RUN-1 PR 3 · AC 10 (참가 규칙 v2.1 §16-5) — **게스트의 선택은 랭킹에 실리지 않는다.**
 *
 * 게스트 uid는 브라우저 창마다 새로 생겨 사람 단위 상한이 없다(§9 함정 4). 한도를 조이는
 * 대신 집계에서 빼 조작 동기 자체를 없앤 것이 v2.1의 결정이다.
 *
 * ⚠️ **소급 없음 (2026-09-07 대표 확정)** — `isGuest` 필드가 **없는** 옛 기록은 `undefined`
 * 라서 그대로 집계된다. 이 세 분기가 흔들리면 소급 제외가 됐다는 뜻이다. Firestore
 * `where("isGuest","!=",true)` 를 쓰면 정확히 그 사고가 난다(필드 없는 문서가 통째로 빠진다)
 * — 그래서 필터는 반드시 여기, 메모리다.
 */
describe("tallyVotes — 게스트 제외 (AC 10 · v2.1)", () => {
  it("isGuest === true 인 기록은 집계에서 빠진다", () => {
    const counts = tallyVotes([
      { contestantId: "a", isGuest: true },
      { contestantId: "a", isGuest: false },
    ]);
    expect(counts.get("a")).toBe(1);
  });

  it("isGuest === false 인 기록은 집계된다", () => {
    const counts = tallyVotes([
      { contestantId: "a", isGuest: false },
      { contestantId: "a", isGuest: false },
    ]);
    expect(counts.get("a")).toBe(2);
  });

  it("isGuest 필드가 없는 옛 기록은 그대로 집계된다 (소급 없음)", () => {
    const counts = tallyVotes([{ contestantId: "a" }, { contestantId: "a" }]);
    expect(counts.get("a")).toBe(2);
  });

  it("게스트 기록만 있으면 그 Contestant는 집계에 아예 안 남는다", () => {
    const counts = tallyVotes([
      { contestantId: "a", isGuest: true },
      { contestantId: "b", isGuest: false },
    ]);
    expect(counts.has("a")).toBe(false);
    expect(counts.get("b")).toBe(1);
  });
});
