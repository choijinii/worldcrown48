/**
 * THUMB-1 — 편집기에서 대표 매치 고르기 (킥 §3·§4-1).
 *
 * 그리드 칸을 누르면 A → 다른 칸 → B → 세 번째부터 A 부터 교체.
 * 게시 전에는 자동 대체가 없다: 고른 칸이 비면(영상이 빠지면) 그 쪽이 비고 다시 골라야 한다.
 */
import { describe, expect, it } from "vitest";
import {
  EMPTY_PICK,
  isPickComplete,
  pickSlot,
  prunePick,
  publishPair,
  setPickPos,
  type PairPick,
} from "@/lib/thumbnail/pick";

describe("pickSlot", () => {
  it("첫 칸 → A, 다른 칸 → B", () => {
    const p1 = pickSlot(EMPTY_PICK, 4);
    expect([p1.a, p1.b]).toEqual([4, null]);
    const p2 = pickSlot(p1, 9);
    expect([p2.a, p2.b]).toEqual([4, 9]);
  });

  it("세 번째 누르면 A 부터 교체, 네 번째는 B", () => {
    const p = [4, 9, 12, 20].reduce<PairPick>(pickSlot, EMPTY_PICK);
    expect([p.a, p.b]).toEqual([12, 20]);
  });

  it("교체된 쪽의 위치 값은 기본(null)으로 돌아간다", () => {
    let p = [4, 9].reduce<PairPick>(pickSlot, EMPTY_PICK);
    p = setPickPos(p, "a", 12);
    p = setPickPos(p, "b", 77);
    p = pickSlot(p, 30);
    expect(p.aPos).toBeNull();
    expect(p.bPos).toBe(77);
  });

  it("이미 고른 칸을 다시 누르면 아무것도 바뀌지 않는다(A·B 겹침 금지)", () => {
    const p = [4, 9].reduce<PairPick>(pickSlot, EMPTY_PICK);
    expect(pickSlot(p, 9)).toEqual(p);
    expect(pickSlot(p, 4)).toEqual(p);
  });
});

describe("setPickPos", () => {
  it("0~100 로 잘라 넣는다", () => {
    const p = setPickPos(pickSlot(EMPTY_PICK, 1), "a", 140);
    expect(p.aPos).toBe(100);
  });
});

describe("isPickComplete — 게시 잠금", () => {
  it("A·B 둘 다 있어야 열린다", () => {
    expect(isPickComplete(EMPTY_PICK)).toBe(false);
    expect(isPickComplete(pickSlot(EMPTY_PICK, 1))).toBe(false);
    expect(isPickComplete([1, 2].reduce<PairPick>(pickSlot, EMPTY_PICK))).toBe(true);
  });
});

describe("prunePick — 고른 칸이 못 쓰게 되면 그 쪽이 빈다(게시 전엔 자동 대체 없음)", () => {
  it("영상이 빠진 칸은 비우고 위치 값도 지운다", () => {
    let p = [4, 9].reduce<PairPick>(pickSlot, EMPTY_PICK);
    p = setPickPos(p, "b", 70);
    const pruned = prunePick(p, (slot) => slot !== 9);
    expect([pruned.a, pruned.b, pruned.bPos]).toEqual([4, null, null]);
  });

  it("빈 쪽이 다음 고르기 자리가 된다", () => {
    const p = [4, 9, 12].reduce<PairPick>(pickSlot, EMPTY_PICK); // a=12, b=9, 다음 = b
    const pruned = prunePick(p, (slot) => slot !== 12); // a 가 빔
    expect(pickSlot(pruned, 30).a).toBe(30);
  });

  it("바뀐 것이 없으면 같은 객체를 돌려준다(렌더 루프 방지)", () => {
    const p = [4, 9].reduce<PairPick>(pickSlot, EMPTY_PICK);
    expect(prunePick(p, () => true)).toBe(p);
  });
});

describe("publishPair — 게시할 때 실을 값", () => {
  it("다 고르지 않았으면 null", () => {
    expect(publishPair(pickSlot(EMPTY_PICK, 1), () => "landscape")).toBeNull();
  });

  it("위치를 안 움직였으면 그 칸 영상 방향의 기본값(가로 50 · 세로 40)", () => {
    const p = [4, 9].reduce<PairPick>(pickSlot, EMPTY_PICK);
    const orient = (slot: number) => (slot === 9 ? "portrait" : "landscape");
    expect(publishPair(p, orient)).toEqual({ a: 4, b: 9, aPos: 50, bPos: 40 });
  });

  it("움직인 위치는 그대로", () => {
    const p = setPickPos([4, 9].reduce<PairPick>(pickSlot, EMPTY_PICK), "b", 12);
    expect(publishPair(p, () => "portrait")).toEqual({ a: 4, b: 9, aPos: 40, bPos: 12 });
  });
});
