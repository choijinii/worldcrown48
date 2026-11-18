/**
 * LAB-FIX-4 — "AI에게 알려 줄 내용" 묶음(원장 결정 A) — 화면 · 초안 · 대회 문서 쪽.
 * 서버 functions/src/core/aiBrief.ts 와 같은 한도(40 · 40 · 300) · 같은 정규화.
 */
import { describe, expect, it } from "vitest";
import {
  AI_BRIEF_LIMITS,
  EMPTY_AI_BRIEF,
  aiBriefForSave,
  isAiBriefEmpty,
  readAiBrief,
} from "@/lib/lab/aiBrief";
import { fromDraftDoc, isDraftBlank, toDraftFields, type DraftEditorState } from "@/lib/lab/tournamentDraft";
import { buildTournamentDoc } from "@/lib/lab/tournamentDoc";
import { ENTRY_UNITS } from "@/lib/types/tournament";
import { EMPTY_PICK } from "@/lib/thumbnail/pick";

const brief = { entry: "영상에서 춤춘 댄스 크루", extra: "", rules: "원곡 가수는 엔트리가 아니다." };

function state(overrides: Partial<DraftEditorState> = {}): DraftEditorState {
  return {
    step: 1,
    title: "올 한 해 가장 빛난 K-pop 댄스 크루는 누구일까?",
    category: "kpop",
    description: "",
    keywords: [],
    campaignSlug: "",
    deadlineMs: 1_900_000_000_000,
    contestants: [],
    thumbnailPair: EMPTY_PICK,
    entryUnit: "group",
    mediaKind: null,
    aiBrief: { ...EMPTY_AI_BRIEF },
    ...overrides,
  };
}

describe("aiBrief — 한도 · 정규화", () => {
  it("한도는 40 · 40 · 300", () => {
    expect(AI_BRIEF_LIMITS).toEqual({ entry: 40, extra: 40, rules: 300 });
  });
  it("읽기: 빠지거나 모양이 다르면 빈 묶음 · 한도를 넘는 글은 자른다(옛 문서도 깨지지 않게)", () => {
    expect(readAiBrief(undefined)).toEqual(EMPTY_AI_BRIEF);
    expect(readAiBrief({ entry: 3 })).toEqual(EMPTY_AI_BRIEF);
    expect(readAiBrief({ entry: "가".repeat(50) }).entry).toHaveLength(40);
  });
  it("공백뿐이면 빈 묶음 · 저장할 땐 앞뒤 공백을 지우고 비면 싣지 않는다", () => {
    expect(isAiBriefEmpty({ entry: " ", extra: "\n", rules: "" })).toBe(true);
    expect(aiBriefForSave({ entry: " ", extra: "", rules: "" })).toBeUndefined();
    expect(aiBriefForSave({ entry: " 노래 제목 ", extra: "", rules: "" })).toEqual({ entry: "노래 제목", extra: "", rules: "" });
  });
  it("엔트리 단위에 그 외(other)", () => {
    expect(ENTRY_UNITS).toEqual(["individual", "group", "other"]);
  });
});

describe("초안 왕복 — 새 필드와 그 외 단위", () => {
  it("묶음 · other 가 저장 → 불러오기 뒤 그대로", () => {
    const s = state({ entryUnit: "other", aiBrief: { entry: "노래 제목", extra: "가수", rules: "타이틀곡만" } });
    const fields = toDraftFields(s);
    expect(fields.entryUnit).toBe("other");
    expect(fields.aiBrief).toEqual({ entry: "노래 제목", extra: "가수", rules: "타이틀곡만" });
    expect(fromDraftDoc({ ...fields, hostUid: "u", updatedAt: null })).toEqual(s);
  });
  it("묶음이 비면 칸을 싣지 않는다(규칙 배포 전에도 옛 모양으로 저장)", () => {
    expect("aiBrief" in toDraftFields(state())).toBe(false);
  });
  it("옛 초안(새 필드 없음)은 빈 묶음으로 읽힌다", () => {
    const back = fromDraftDoc({ ...toDraftFields(state({ entryUnit: "individual" })), hostUid: "u", updatedAt: null });
    expect(back?.aiBrief).toEqual(EMPTY_AI_BRIEF);
    expect(back?.entryUnit).toBe("individual");
  });
  it("묶음에 글자를 친 것도 입력이다(빈 초안이 아니다)", () => {
    expect(isDraftBlank(state({ title: "", category: "", entryUnit: "individual" }))).toBe(true);
    expect(isDraftBlank(state({ title: "", category: "", entryUnit: "individual", aiBrief: brief }))).toBe(false);
    expect(isDraftBlank(state({ title: "", category: "", entryUnit: "other" }))).toBe(false);
  });
});

describe("대회 문서 — 묶음 · 그 외", () => {
  const input = {
    title: "올해의 노래",
    keywords: ["노래"],
    category: "KPOP",
    hostUid: "u",
    deadlineMs: Date.now() + 86_400_000,
    titleI18n: { ko: "올해의 노래", en: "", es: "" },
    description: { ko: "", en: "", es: "" },
  };
  it("묶음이 있으면 싣고, 비면 싣지 않는다 · other 단위를 받는다", () => {
    const doc = buildTournamentDoc({ ...input, entryUnit: "other", aiBrief: { entry: "노래 제목", extra: "가수", rules: "" } }, ["KPOP"], Date.now());
    expect(doc.entryUnit).toBe("other");
    expect(doc.aiBrief).toEqual({ entry: "노래 제목", extra: "가수", rules: "" });
    expect("aiBrief" in buildTournamentDoc({ ...input, aiBrief: { ...EMPTY_AI_BRIEF } }, ["KPOP"], Date.now())).toBe(false);
  });
});

describe("링크 제목 읽기 요청의 덧붙임 — 묶음 지시문을 쓸 때만", () => {
  it("묶음이 비고 개인·팀이면 아무것도 싣지 않는다(지금과 같은 요청)", async () => {
    const { extractRequestExtras } = await import("@/lib/lab/extractContestants");
    const extras = { aiBrief: { ...EMPTY_AI_BRIEF }, tournamentTitle: "t", tournamentDescription: "d" };
    expect(extractRequestExtras(extras, "group")).toEqual({});
    expect(extractRequestExtras(undefined, "individual")).toEqual({});
  });
  it("묶음이 있으면 묶음 · 제목 · 설명 · 그 외는 묶음이 비어도 제목 · 설명", async () => {
    const { extractRequestExtras } = await import("@/lib/lab/extractContestants");
    expect(extractRequestExtras({ aiBrief: brief, tournamentTitle: " t ", tournamentDescription: "" }, "group")).toEqual({
      aiBrief: { entry: brief.entry, extra: "", rules: brief.rules },
      tournamentTitle: "t",
    });
    expect(extractRequestExtras({ aiBrief: { ...EMPTY_AI_BRIEF }, tournamentTitle: "올해의 노래" }, "other")).toEqual({ tournamentTitle: "올해의 노래" });
  });
});
