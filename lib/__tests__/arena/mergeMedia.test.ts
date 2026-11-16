/**
 * IMAGE-1 PR 3 (원장 D-77 "1분 안에") — 진행 중인 판의 엔트리 그림만 새로 갈아 끼운다.
 * 대진(엔트리 id · 순서)은 그대로라 판이 끊기지 않는다 — 내린 엔트리는 이니셜 칸으로 계속 나오고 고를 수 있다.
 */
import { describe, expect, it } from "vitest";
import { mergeMedia } from "@/lib/arena/takedownRefresh";
import type { Contestant } from "@/lib/types/tournament";

const c = (id: string, order: number, media?: Contestant["media"]) =>
  ({ id, order, name: id, tournamentId: "t", hostUid: "h", nationality: "KR", imageSearchKeyword: "", media }) as Contestant;

describe("mergeMedia", () => {
  const before = [c("a", 1, { type: "image", image: { url: "u", thumbUrl: "t", storagePath: "p", origin: "url", width: 1, height: 1, addedAt: 1 } }), c("b", 2)];
  it("내린 엔트리의 media 만 바꾸고 순서 · id · 나머지 칸은 그대로", () => {
    const after = mergeMedia(before, new Map([["a", { type: "image", takedown: { at: 5 } }]]));
    expect(after.map((x) => x.id)).toEqual(["a", "b"]);
    expect(after[0].media).toEqual({ type: "image", takedown: { at: 5 } });
    expect(after[0].name).toBe("a");
    expect(after[1]).toBe(before[1]);
  });
  it("바뀐 것이 없으면 같은 배열(다시 그리지 않음)", () => {
    expect(mergeMedia(before, new Map([["a", before[0].media]]))).toBe(before);
    expect(mergeMedia(before, new Map())).toBe(before);
  });
  it("새로 받은 목록에 없는 엔트리(지워짐)는 건드리지 않는다 · media 가 사라지면 없앤다", () => {
    const after = mergeMedia(before, new Map([["a", undefined]]));
    expect(after[0].media).toBeUndefined();
    expect(after[1]).toBe(before[1]);
  });
});
