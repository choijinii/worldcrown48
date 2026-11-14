/**
 * IMAGE-1 PR 2 — 이미지 검색 · 주소 여러 줄의 화면 쪽 순수 층.
 *   대상 칸(이름 있음 · 그림 없음 · blanks = 이번에 채운 칸) · 이미 쓴 그림 주소 · 6칸씩 나눠 부르기
 *   (한도 · 키 없음에서 멈추고 앞 결과 보존) · 결과 얹기(origin search · 허용 칸만) · 주소 줄 나누기 · 배정.
 */
import { describe, expect, it } from "vitest";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import {
  IMAGE_CHUNK,
  applyImageResults,
  assignImageLines,
  imageRefreshVisible,
  imageTargets,
  parseImageLines,
  runImageChunks,
  usedImageUrls,
  type AutoSourceImagesResponse,
  type SlotImageResult,
} from "@/lib/lab/imageSourcing";

const empty = (): ContestantDraft => ({ name: "", affiliation: "", nationality: "", imageSearchKeyword: "" }) as ContestantDraft;
const named = (name: string, extra: Partial<ContestantDraft> = {}): ContestantDraft => ({ ...empty(), name, ...extra });
const withImg = (name: string, origin: "upload" | "url" | "search", src = `https://src/${name}.jpg`): ContestantDraft =>
  named(name, {
    imageUrl: `https://store/${name}.jpg`,
    imageThumbUrl: `https://store/${name}_600.jpg`,
    imageStoragePath: `entry-images/drafts/u/d/${name}.jpg`,
    imageSource: { origin, sourceUrl: src, sourcePage: src },
  });

describe("imageTargets", () => {
  it("이름이 있고 그림이 없는 칸만 · 소속을 싣는다", () => {
    const drafts = [named("A", { affiliation: "X" }), empty(), withImg("B", "upload"), named("C")];
    expect(imageTargets(drafts)).toEqual([
      { slot: 0, name: "A", affiliation: "X" },
      { slot: 3, name: "C" },
    ]);
  });
  it("only 가 있으면 그 칸들 안에서만(빈칸 버튼 = 이번에 채운 칸)", () => {
    const drafts = [named("A"), named("B"), withImg("C", "search"), named("D")];
    expect(imageTargets(drafts, [1, 2]).map((t) => t.slot)).toEqual([1]);
  });
});

describe("usedImageUrls", () => {
  it("다른 칸이 쓴 그림의 원본 주소(sourceUrl) — 빼는 칸은 넣지 않는다", () => {
    const drafts = [withImg("A", "search"), withImg("B", "url"), named("C")];
    expect(usedImageUrls(drafts, [0])).toEqual(["https://src/B.jpg"]);
    expect(usedImageUrls(drafts, [])).toEqual(["https://src/A.jpg", "https://src/B.jpg"]);
  });
});

describe("imageRefreshVisible — [새 이미지 찾기]는 검색으로 들어온 칸에만", () => {
  it("이미지 대회 · origin search 만", () => {
    expect(imageRefreshVisible(withImg("A", "search"), "image")).toBe(true);
    expect(imageRefreshVisible(withImg("A", "upload"), "image")).toBe(false);
    expect(imageRefreshVisible(withImg("A", "url"), "image")).toBe(false);
    expect(imageRefreshVisible(named("A"), "image")).toBe(false);
    expect(imageRefreshVisible(withImg("A", "search"), "video")).toBe(false);
  });
});

const ok = (slot: number): SlotImageResult => ({
  slot,
  ok: true,
  url: `https://store/${slot}.jpg`,
  thumbUrl: `https://store/${slot}_600.jpg`,
  storagePath: `entry-images/drafts/u/d/${slot}.jpg`,
  width: 1000,
  height: 1500,
  addedAt: 7,
  sourceUrl: `https://img/${slot}.jpg`,
  sourcePage: `https://page/${slot}`,
});

describe("runImageChunks", () => {
  const targets = Array.from({ length: 14 }, (_, i) => ({ slot: i, name: `N${i}` }));

  it(`${IMAGE_CHUNK}칸씩 나눠 부르고 묶음마다 얹는다 · 진행 표시`, async () => {
    const calls: number[][] = [];
    const chunks: number[] = [];
    const progress: [number, number][] = [];
    const out = await runImageChunks(targets, [], {
      call: async (slots, exclude) => {
        calls.push(slots.map((s) => s.slot));
        expect(Array.isArray(exclude)).toBe(true);
        return { ok: true, results: slots.map((s) => (s.slot === 5 ? { slot: 5, ok: false, reason: "not-found" } : ok(s.slot))) };
      },
      onChunk: (r) => chunks.push(r.length),
      onProgress: (d, t) => progress.push([d, t]),
    });
    expect(calls).toEqual([[0, 1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11], [12, 13]]);
    expect(chunks).toEqual([6, 6, 2]);
    expect(progress[0]).toEqual([0, 14]);
    expect(progress.at(-1)).toEqual([14, 14]);
    expect(out).toMatchObject({ found: 13, notFound: [5], stopped: null, remaining: 0 });
  });

  it("앞 묶음이 고른 그림 주소는 뒤 묶음의 excludeUrls 에 들어간다", async () => {
    const seen: string[][] = [];
    await runImageChunks(targets.slice(0, 8), ["https://x"], {
      call: async (slots, exclude) => {
        seen.push(exclude);
        return { ok: true, results: slots.map((s) => ok(s.slot)) };
      },
    });
    expect(seen[0]).toEqual(["https://x"]);
    expect(seen[1]).toEqual(expect.arrayContaining(["https://x", "https://img/0.jpg", "https://img/5.jpg"]));
  });

  it("한도(limit)면 그 묶음 결과는 얹고 뒤 묶음은 부르지 않는다", async () => {
    let n = 0;
    const out = await runImageChunks(targets, [], {
      call: async (slots): Promise<AutoSourceImagesResponse> => {
        n++;
        return { ok: true, results: [ok(slots[0].slot)], code: "limit" };
      },
    });
    expect(n).toBe(1);
    expect(out).toMatchObject({ found: 1, stopped: "limit", remaining: 13 });
  });

  it("키가 없으면(no-key) 바로 멈춘다", async () => {
    const out = await runImageChunks(targets, [], { call: async () => ({ ok: false, code: "no-key" }) });
    expect(out).toMatchObject({ found: 0, stopped: "no-key", remaining: 14 });
  });

  it("호출이 던지면 error 로 멈추고 앞 결과는 남는다", async () => {
    let n = 0;
    const got: number[] = [];
    const out = await runImageChunks(targets, [], {
      call: async (slots) => {
        if (n++ === 1) throw new Error("boom");
        return { ok: true, results: slots.map((s) => ok(s.slot)) };
      },
      onChunk: (r) => got.push(...r.map((x) => x.slot)),
    });
    expect(got).toEqual([0, 1, 2, 3, 4, 5]);
    expect(out.stopped).toBe("error");
    expect(out.remaining).toBe(8);
  });
});

describe("applyImageResults", () => {
  it("찾은 칸에 origin search 로 얹는다 — 출처는 sourceUrl · sourcePage 두 개뿐", () => {
    const drafts = [named("A"), named("B")];
    const next = applyImageResults(drafts, [ok(0), { slot: 1, ok: false, reason: "not-found" }]);
    expect(next[0]).toMatchObject({
      name: "A",
      imageUrl: "https://store/0.jpg",
      imageThumbUrl: "https://store/0_600.jpg",
      imageStoragePath: "entry-images/drafts/u/d/0.jpg",
      imageWidth: 1000,
      imageHeight: 1500,
      imageAddedAt: 7,
    });
    expect(next[0].imageSource).toEqual({ origin: "search", sourceUrl: "https://img/0.jpg", sourcePage: "https://page/0" });
    expect(next[1]).toBe(drafts[1]);
  });
  it("그 사이 손으로 그림을 넣은 칸은 덮지 않는다 · replace 면 덮는다([새 이미지 찾기])", () => {
    const drafts = [withImg("A", "upload")];
    expect(applyImageResults(drafts, [ok(0)])[0].imageSource?.origin).toBe("upload");
    expect(applyImageResults([withImg("A", "search")], [ok(0)], { replace: true })[0].imageUrl).toBe("https://store/0.jpg");
  });
});

describe("parseImageLines", () => {
  it("빈 줄은 무시하고 줄 번호(눈에 보이는 줄)를 지킨다", () => {
    expect(parseImageLines("  https://a/1.jpg \n\n https://a/2.jpg\r\n   \nhttps://a/3.jpg")).toEqual([
      { line: 1, url: "https://a/1.jpg" },
      { line: 3, url: "https://a/2.jpg" },
      { line: 5, url: "https://a/3.jpg" },
    ]);
  });
  it("48줄까지만 받는다", () => {
    const text = Array.from({ length: 60 }, (_, i) => `https://a/${i}.jpg`).join("\n");
    const lines = parseImageLines(text);
    expect(lines).toHaveLength(48);
    expect(lines.at(-1)).toEqual({ line: 48, url: "https://a/47.jpg" });
  });
});

describe("assignImageLines — 그림이 없는 칸부터 칸 순서대로", () => {
  it("그림이 있는 칸은 건너뛰고, 칸이 모자라면 남는 줄은 배정하지 않는다", () => {
    const drafts = [withImg("A", "upload"), named("B"), empty(), withImg("D", "search")];
    const lines = [
      { line: 1, url: "u1" },
      { line: 2, url: "u2" },
    ];
    expect(assignImageLines(drafts, lines, 4)).toEqual([
      { line: 1, url: "u1", slot: 1 },
      { line: 2, url: "u2", slot: 2 },
    ]);
    expect(assignImageLines(drafts, [...lines, { line: 3, url: "u3" }], 4)).toHaveLength(2);
  });
});
