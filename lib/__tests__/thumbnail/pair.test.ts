/**
 * THUMB-1 — 대표 매치(썸네일) 순수 규칙 (원장 D-35 · 킥 §4·§5).
 *
 * 게시된 대회의 `thumbnailPair` 를 화면에 보일 두 칸으로 푼다.
 *   · 고른 엔트리가 살아 있으면 그대로(위치 값도 그대로)
 *   · 지워졌거나 그림이 깨졌으면(㉣) 살아 있는 엔트리 중 **앞 번호**로 대체, 위치는 기본값
 *   · A·B 는 겹치지 않는다 · 빈 칸 없음
 *   · 필드가 없는 옛 대회 = 1번·2번 + 기본 위치(백필 없음)
 */
import { describe, expect, it } from "vitest";
import {
  clampPos,
  coverObjectPosition,
  defaultPos,
  resolveThumbnailPair,
  type PairEntry,
} from "@/lib/thumbnail/pair";

function entry(order: number, over: Partial<PairEntry> = {}): PairEntry {
  return { id: `c${order}`, order, orientation: "landscape", usable: true, ...over };
}
const six = [1, 2, 3, 4, 5, 6].map((n) => entry(n));

describe("defaultPos — 매치 무대 규칙(D-11·D-15)", () => {
  it("가로 영상 = 가운데 50 · 세로 = 위 40", () => {
    expect(defaultPos("landscape")).toBe(50);
    expect(defaultPos("portrait")).toBe(40);
  });
});

describe("clampPos", () => {
  it("0~100 밖 값은 잘라낸다", () => {
    expect(clampPos(-5, "landscape")).toBe(0);
    expect(clampPos(130, "portrait")).toBe(100);
    expect(clampPos(33, "portrait")).toBe(33);
  });

  it("숫자가 아니면 그 방향의 기본값", () => {
    expect(clampPos(undefined, "landscape")).toBe(50);
    expect(clampPos(Number.NaN, "portrait")).toBe(40);
    expect(clampPos(null, "portrait")).toBe(40);
  });
});

describe("coverObjectPosition — 반쪽 칸에서 한 방향으로만", () => {
  it("가로 영상은 좌우만 움직인다(세로 50 고정)", () => {
    expect(coverObjectPosition("landscape", 20)).toBe("20% 50%");
  });

  it("세로 사진은 위아래만 움직인다(가로 50 고정)", () => {
    expect(coverObjectPosition("portrait", 70)).toBe("50% 70%");
  });

  it("범위 밖 값도 잘라서 쓴다", () => {
    expect(coverObjectPosition("landscape", 150)).toBe("100% 50%");
  });
});

describe("resolveThumbnailPair", () => {
  it("필드 없는 옛 대회 = 1번·2번 + 기본 위치", () => {
    const r = resolveThumbnailPair(undefined, [entry(2), entry(1, { orientation: "portrait" })]);
    expect(r.a?.entry.id).toBe("c1");
    expect(r.a?.pos).toBe(40);
    expect(r.b?.entry.id).toBe("c2");
    expect(r.b?.pos).toBe(50);
  });

  it("고른 엔트리가 살아 있으면 그대로 · 위치도 그대로", () => {
    const r = resolveThumbnailPair({ a: "c5", b: "c3", aPos: 10, bPos: 90 }, six);
    expect([r.a?.entry.id, r.a?.pos, r.b?.entry.id, r.b?.pos]).toEqual(["c5", 10, "c3", 90]);
    expect(r.replaced).toBe(false);
  });

  it("A만 지워짐 → 앞 번호(1번) · 위치는 기본값", () => {
    const alive = six.filter((e) => e.id !== "c5");
    const r = resolveThumbnailPair({ a: "c5", b: "c3", aPos: 10, bPos: 90 }, alive);
    expect(r.a?.entry.id).toBe("c1");
    expect(r.a?.pos).toBe(50);
    expect(r.b?.entry.id).toBe("c3");
    expect(r.b?.pos).toBe(90);
    expect(r.replaced).toBe(true);
  });

  it("1번이 지워진 상태면 그다음 번호", () => {
    const alive = six.filter((e) => e.id !== "c1" && e.id !== "c5");
    const r = resolveThumbnailPair({ a: "c5", b: "c3", aPos: 10, bPos: 90 }, alive);
    expect(r.a?.entry.id).toBe("c2");
  });

  it("대체가 다른 쪽과 겹치지 않는다 (B=1번일 때 A 대체는 2번)", () => {
    const alive = six.filter((e) => e.id !== "c5");
    const r = resolveThumbnailPair({ a: "c5", b: "c1", aPos: 0, bPos: 0 }, alive);
    expect(r.a?.entry.id).toBe("c2");
    expect(r.b?.entry.id).toBe("c1");
  });

  it("둘 다 지워짐 → 1번·2번", () => {
    const r = resolveThumbnailPair({ a: "x", b: "y", aPos: 0, bPos: 0 }, six);
    expect([r.a?.entry.id, r.b?.entry.id]).toEqual(["c1", "c2"]);
  });

  it("그림이 깨진 엔트리(㉣)는 지워진 것으로 본다 · 대체 후보에서도 뺀다", () => {
    const entries = six.map((e) =>
      e.id === "c5" || e.id === "c1" ? { ...e, usable: false } : e,
    );
    const r = resolveThumbnailPair({ a: "c5", b: "c3", aPos: 10, bPos: 90 }, entries);
    expect(r.a?.entry.id).toBe("c2");
    expect(r.replaced).toBe(true);
  });

  it("A·B 가 같은 값으로 저장돼 있어도 겹치지 않는다", () => {
    const r = resolveThumbnailPair({ a: "c3", b: "c3", aPos: 0, bPos: 0 }, six);
    expect(r.a?.entry.id).toBe("c3");
    expect(r.b?.entry.id).toBe("c1");
  });

  it("살아 있는 엔트리가 둘 이상이면 빈 칸은 없다", () => {
    const r = resolveThumbnailPair({ a: "x", b: "y", aPos: 0, bPos: 0 }, [entry(7), entry(9)]);
    expect(r.a).not.toBeNull();
    expect(r.b).not.toBeNull();
  });

  it("살아 있는 엔트리가 하나뿐이면 그 하나만", () => {
    const r = resolveThumbnailPair(undefined, [entry(4)]);
    expect(r.a?.entry.id).toBe("c4");
    expect(r.b).toBeNull();
  });

  it("저장된 위치 값이 범위 밖이면 잘라서 쓴다", () => {
    const r = resolveThumbnailPair({ a: "c1", b: "c2", aPos: 400, bPos: -1 }, six);
    expect([r.a?.pos, r.b?.pos]).toEqual([100, 0]);
  });
});
