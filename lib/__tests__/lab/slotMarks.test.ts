/**
 * LAB-FIX-5 §3-2 · §3-8 — 칸 표시(조건 검사 · 영상/이미지 찾기 상태)를 초안에 저장하고 불러온다.
 * 조건 검사 표시는 그때의 이름과 함께 남는다 — 운영자가 이름을 고치면 그 칸 표시는 사라진다(파생 · reviewFlags 와 같은 생각).
 */
import { describe, expect, it } from "vitest";
import {
  activeRuleFlags,
  readImageNotFound,
  readRuleFlags,
  readSourcingStates,
  ruleFlagsFromReply,
  rulesCheckEntries,
  shouldCheckRules,
} from "@/lib/lab/slotMarks";
import { fromDraftDoc, toDraftFields, type DraftEditorState } from "@/lib/lab/tournamentDraft";
import { EMPTY_PICK } from "@/lib/thumbnail/pick";

const slot = (name: string) => ({ name, nationality: "", affiliation: "", imageSearchKeyword: "" });
const contestants = [slot("Lisa Eldridge"), slot("James Charles"), slot(""), slot("Nikkie de Jager")];

describe("shouldCheckRules — 고르는 조건이 있을 때만", () => {
  it.each([
    [{ entry: "", extra: "", rules: "여성만" }, true],
    [{ entry: "a", extra: "b", rules: "   " }, false],
    [{ entry: "", extra: "", rules: "" }, false],
  ])("%j → %s", (b, want) => expect(shouldCheckRules(b)).toBe(want));
});

describe("rulesCheckEntries — 이름 있는 칸만 · 칸 번호 그대로", () => {
  it("빈 칸은 뺀다", () => {
    expect(rulesCheckEntries(contestants)).toEqual([
      { slot: 0, name: "Lisa Eldridge", affiliation: "" },
      { slot: 1, name: "James Charles", affiliation: "" },
      { slot: 3, name: "Nikkie de Jager", affiliation: "" },
    ]);
  });
});

describe("ruleFlagsFromReply · activeRuleFlags", () => {
  const flags = ruleFlagsFromReply([{ slot: 1, reason: "남성" }, { slot: 3, reason: "같은 사람" }, { slot: 2, reason: "빈 칸" }], contestants);
  it("그때의 이름과 함께 · 빈 칸 표시는 버린다", () => {
    expect(flags).toEqual([
      { slot: 1, name: "James Charles", reason: "남성" },
      { slot: 3, name: "Nikkie de Jager", reason: "같은 사람" },
    ]);
  });
  it("이름을 고친 칸은 표시가 사라진다 · 그대로인 칸은 남는다", () => {
    const now = [...contestants];
    now[1] = slot("Jaclyn Hill");
    expect(activeRuleFlags(flags, now)).toEqual({ 3: { name: "Nikkie de Jager", reason: "같은 사람" } });
  });
});

describe("초안 읽기 — 모양이 다르면 버린다", () => {
  it("readRuleFlags", () => {
    expect(readRuleFlags([{ slot: 1, name: "a", reason: "r" }, { slot: 99, name: "b", reason: "" }, { slot: 2 }, "x"])).toEqual([
      { slot: 1, name: "a", reason: "r" },
    ]);
    expect(readRuleFlags(undefined)).toEqual([]);
  });
  it("readSourcingStates — 아는 상태만", () => {
    expect(readSourcingStates({ "0": { status: "suggested" }, "5": { status: "manual", reason: "no-results" }, "60": { status: "manual" }, "7": { status: "weird" } })).toEqual({
      0: { status: "suggested" },
      5: { status: "manual", reason: "no-results" },
    });
  });
  it("readImageNotFound", () => {
    expect(readImageNotFound([3, 3, 7, 50, "x"])).toEqual([3, 7]);
  });
});

describe("초안 왕복 — 저장 → 불러오기", () => {
  const base: DraftEditorState = {
    step: 2, title: "t", category: "C", description: "", keywords: [], campaignSlug: "", deadlineMs: 1,
    contestants, thumbnailPair: EMPTY_PICK, entryUnit: "individual", mediaKind: "image",
    aiBrief: { entry: "", extra: "", rules: "여성만" },
    ruleFlags: [{ slot: 1, name: "James Charles", reason: "남성" }],
    sourcing: { 0: { status: "suggested" } },
    imageNotFound: [3],
  };
  it("세 칸이 그대로 돌아온다", () => {
    const back = fromDraftDoc({ hostUid: "u", ...toDraftFields(base) })!;
    expect(back.ruleFlags).toEqual(base.ruleFlags);
    expect(back.sourcing).toEqual(base.sourcing);
    expect(back.imageNotFound).toEqual([3]);
  });
  it("비어 있으면 문서에 칸을 만들지 않는다(옛 초안과 같은 모양)", () => {
    const f = toDraftFields({ ...base, ruleFlags: [], sourcing: {}, imageNotFound: [] });
    expect(Object.keys(f)).not.toEqual(expect.arrayContaining(["ruleFlags"]));
    expect("sourcing" in f || "imageNotFound" in f || "ruleFlags" in f).toBe(false);
  });
  it("옛 초안(칸 없음)은 빈 값", () => {
    const back = fromDraftDoc({ hostUid: "u", ...toDraftFields(base), ruleFlags: undefined, sourcing: undefined, imageNotFound: undefined })!;
    expect([back.ruleFlags, back.sourcing, back.imageNotFound]).toEqual([undefined, undefined, undefined]);
  });
});
