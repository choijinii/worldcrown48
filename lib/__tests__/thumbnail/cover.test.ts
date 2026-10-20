/**
 * THUMB-1 PR 2 — 피치 카드 커버 = 대표 매치 VS 장면 (원장 D-35 · 킥 §4 ㉣).
 *
 * contestants 문서 → 대체 규칙(`resolveThumbnailPair`) → VSThumb 두 칸.
 *   · 영상이 없는 엔트리는 커버에 쓸 수 없다(그림이 유튜브 포스터뿐이다)
 *   · 화면에서 그림이 깨진 엔트리(㉣)는 지워진 것으로 보고 앞 번호로 대체
 *   · 고른 두 개만 먼저 읽고, 대체가 필요할 때만 대회의 엔트리 전체를 읽는다
 */
import { describe, expect, it } from "vitest";
import {
  coverEntry,
  coverSides,
  needsFullList,
  probePoster,
  type CoverContestant,
} from "@/lib/thumbnail/cover";

const VIDS = ["9bZkp7q19f0", "dQw4w9WgXcQ", "kJQP7kiw5Fk", "aaaaaaaaaaa"];

function c(order: number, over: Partial<CoverContestant> = {}): CoverContestant {
  return {
    id: `c${order}`,
    order,
    media: { embed: { videoId: VIDS[(order - 1) % VIDS.length] } },
    ...over,
  };
}
const four = [1, 2, 3, 4].map((n) => c(n));
const NONE = new Set<string>();

describe("coverEntry — contestants 문서 한 개", () => {
  it("영상이 있으면 쓸 수 있다 · 비율 없으면 가로", () => {
    expect(coverEntry(c(1), NONE)).toEqual({
      entry: { id: "c1", order: 1, orientation: "landscape", usable: true },
      videoId: VIDS[0],
    });
  });
  it("세로 영상은 세로", () => {
    const e = coverEntry(c(2, { media: { embed: { videoId: VIDS[1], orientation: "portrait" } } }), NONE);
    expect(e.entry.orientation).toBe("portrait");
  });
  it("영상이 없거나 id 가 틀리면 쓸 수 없다", () => {
    expect(coverEntry(c(3, { media: undefined }), NONE).entry.usable).toBe(false);
    expect(coverEntry(c(3, { media: { embed: { videoId: "bad" } } }), NONE).entry.usable).toBe(false);
  });
  it("그림이 깨진 엔트리(㉣)는 쓸 수 없다", () => {
    expect(coverEntry(c(1), new Set(["c1"])).entry.usable).toBe(false);
  });
});

describe("coverSides — VSThumb 두 칸", () => {
  const pair = { a: "c3", b: "c2", aPos: 22, bPos: 78 };

  it("고른 두 엔트리 + 위치 값 그대로", () => {
    const s = coverSides(pair, four, NONE);
    expect(s.aId).toBe("c3");
    expect(s.bId).toBe("c2");
    expect(s.a).toEqual({ videoId: VIDS[2], orientation: "landscape", pos: 22 });
    expect(s.b).toEqual({ videoId: VIDS[1], orientation: "landscape", pos: 78 });
    expect(s.replaced).toBe(false);
  });

  it("A 그림이 깨지면(㉣) 살아 있는 엔트리 중 앞 번호 · 위치 기본값 · B 와 겹치지 않음", () => {
    const s = coverSides(pair, four, new Set(["c3"]));
    expect(s.aId).toBe("c1");
    expect(s.a?.pos).toBe(50);
    expect(s.bId).toBe("c2");
    expect(s.b?.pos).toBe(78);
    expect(s.replaced).toBe(true);
  });

  it("고른 엔트리 문서가 없어도(지워짐) 앞 번호로 대체", () => {
    const s = coverSides(pair, four.filter((x) => x.id !== "c2"), NONE);
    expect(s.bId).toBe("c1");
    expect(s.replaced).toBe(true);
  });

  it("필드 없는 옛 대회 = 1번·2번 + 기본 위치 · 대체 아님", () => {
    const s = coverSides(undefined, four, NONE);
    expect([s.aId, s.bId]).toEqual(["c1", "c2"]);
    expect(s.a?.pos).toBe(50);
    expect(s.replaced).toBe(false);
  });

  it("옛 대회의 1번이 영상이 없으면 그다음 번호", () => {
    const s = coverSides(undefined, [c(1, { media: undefined }), c(2), c(3)], NONE);
    expect([s.aId, s.bId]).toEqual(["c2", "c3"]);
  });

  it("영상 있는 엔트리가 하나도 없으면 두 칸 다 빈 칸(null)", () => {
    const s = coverSides(undefined, [c(1, { media: undefined }), c(2, { media: undefined })], NONE);
    expect(s.a).toBeNull();
    expect(s.b).toBeNull();
  });
});

describe("needsFullList — 엔트리 전체를 읽을 때", () => {
  const pair = { a: "c3", b: "c2", aPos: 22, bPos: 78 };
  it("옛 대회(필드 없음)는 전체가 있어야 1·2번을 안다", () => {
    expect(needsFullList(undefined, coverSides(undefined, [], NONE))).toBe(true);
  });
  it("고른 두 개가 다 살아 있으면 두 개만으로 충분", () => {
    const two = four.filter((x) => x.id === "c3" || x.id === "c2");
    expect(needsFullList(pair, coverSides(pair, two, NONE))).toBe(false);
  });
  it("하나라도 대체가 필요하면 전체", () => {
    const two = four.filter((x) => x.id === "c3" || x.id === "c2");
    expect(needsFullList(pair, coverSides(pair, two, new Set(["c2"])))).toBe(true);
  });
});

describe("probePoster — 관리자 화면의 그림 깨짐 확인(㉣)", () => {
  const SRC = ["https://i.ytimg.com/vi/x/hq720.jpg", "https://i.ytimg.com/vi/x/hqdefault.jpg"];

  it("첫 주소가 뜨면 ok", async () => {
    const tried: string[] = [];
    const r = await probePoster(SRC, async (src) => (tried.push(src), { loadedWidth: 1280 }));
    expect(r).toBe("ok");
    expect(tried).toEqual([SRC[0]]);
  });
  it("첫 주소 실패 → 둘째가 뜨면 ok", async () => {
    const r = await probePoster(SRC, async (src) => (src === SRC[0] ? "error" : { loadedWidth: 480 }));
    expect(r).toBe("ok");
  });
  it("둘 다 실패하거나 유튜브 회색 자리 그림(120px)이면 broken", async () => {
    expect(await probePoster(SRC, async () => "error")).toBe("broken");
    expect(await probePoster(SRC, async () => ({ loadedWidth: 120 }))).toBe("broken");
  });
});
