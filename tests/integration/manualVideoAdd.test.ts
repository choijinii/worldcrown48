/**
 * LAB-FIX-3 통합 — 칸의 [영상] 넣기 순서(runManualVideoAdd)와 병합(addManualVideo)을 이어 붙여,
 * 검사 콜러블 · 추출 콜러블이 몇 번 불리는지와 48칸 중 그 칸 하나만 바뀌는지 본다.
 * 콜러블은 검수기와 같은 모양의 가짜(바깥 사이트를 부르지 않는다).
 */
import { describe, expect, it } from "vitest";
import { addManualVideo, runManualVideoAdd } from "@/lib/lab/manualMedia";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import type { LinkVerdict } from "@/lib/embed/verdict";
import type { ExtractedContestant } from "@/lib/lab/pasteExtract";
import type { EntryUnit } from "@/lib/types/tournament";

const ID = "dQw4w9WgXcQ";
const URL = `https://youtu.be/${ID}`;
const empty = (): ContestantDraft => ({ name: "", nationality: "", affiliation: "", imageSearchKeyword: "" });

function fakes(opts: { status?: LinkVerdict["status"]; extractThrows?: boolean } = {}) {
  const calls = { validate: [] as string[][], extract: [] as { n: number; unit: EntryUnit }[] };
  const deps = {
    validate: async (ids: string[]) => {
      calls.validate.push(ids);
      const status = opts.status ?? "pass";
      const v: LinkVerdict = {
        videoId: ids[0], exists: true, embeddable: status !== "blocked", regionBlockedIn: [], regionAllowedOnly: [],
        ageRestricted: false, isLive: false, durationSec: 180, title: "IVE 'I AM' MV", channelTitle: "STARSHIP",
        thumbnailUrl: "", status, reasons: status === "blocked" ? ["not-embeddable"] : [],
      };
      return { verdicts: [v] };
    },
    extract: async (items: { videoId: string }[], unit: EntryUnit): Promise<ExtractedContestant[]> => {
      calls.extract.push({ n: items.length, unit });
      if (opts.extractThrows) throw new Error("boom");
      return [{ videoId: items[0].videoId, name: "아이브", affiliation: "STARSHIP", nationality: "KR", confident: true }];
    },
  };
  return { calls, deps };
}

describe("runManualVideoAdd → addManualVideo", () => {
  it("이름 빈 칸: 검사 1회(영상 1개) · 추출 1회(엔트리 단위 전달) · 그 칸만 바뀜", async () => {
    const { calls, deps } = fakes();
    const r = await runManualVideoAdd({ url: URL, nameEmpty: true, entryUnit: "group" }, deps);
    expect(calls.validate).toEqual([[ID]]);
    expect(calls.extract).toEqual([{ n: 1, unit: "group" }]);
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;

    const before = Array.from({ length: 48 }, (_, i) => (i === 9 ? empty() : { ...empty(), name: `e${i}` }));
    const after = addManualVideo(before, 9, r.verdict, r.startSec, URL, r.extraction, 48, empty);
    expect(after[9]).toMatchObject({ name: "아이브", affiliation: "STARSHIP", videoId: ID, manualVideo: true, manualVideoUrl: URL });
    expect(after.filter((c, i) => JSON.stringify(c) !== JSON.stringify(before[i]))).toHaveLength(1);
  });

  it("이름 있는 칸: 추출을 부르지 않는다", async () => {
    const { calls, deps } = fakes();
    const r = await runManualVideoAdd({ url: URL, nameEmpty: false, entryUnit: "individual" }, deps);
    expect(calls.validate).toHaveLength(1);
    expect(calls.extract).toHaveLength(0);
    expect(r).toMatchObject({ kind: "ok", extraction: null });
  });

  it("비유튜브 주소: 콜러블 0회", async () => {
    const { calls, deps } = fakes();
    const r = await runManualVideoAdd({ url: "https://vimeo.com/76979871", nameEmpty: true, entryUnit: "individual" }, deps);
    expect(r).toEqual({ kind: "parse-fail", reason: "only-youtube" });
    expect(calls.validate).toHaveLength(0);
    expect(calls.extract).toHaveLength(0);
  });

  it("차단 판정: 추출 0회 · blocked", async () => {
    const { calls, deps } = fakes({ status: "blocked" });
    const r = await runManualVideoAdd({ url: URL, nameEmpty: true, entryUnit: "individual" }, deps);
    expect(r.kind).toBe("blocked");
    expect(calls.extract).toHaveLength(0);
  });

  it("추출만 실패: 영상은 넣고 이름은 비운다(extractFailed)", async () => {
    const { deps } = fakes({ extractThrows: true });
    const r = await runManualVideoAdd({ url: URL, nameEmpty: true, entryUnit: "individual" }, deps);
    expect(r).toMatchObject({ kind: "ok", extraction: null, extractFailed: true });
  });
});
