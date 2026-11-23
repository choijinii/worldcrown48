/**
 * LAB-FIX-6 3-4 — "덧붙이는 정보" 목록(결정 H · 대표 2026-11-22 16:51) 서버 쪽.
 *
 * 화면은 목록 키(team · artist · actor · work · maker · channel · blank)를 보내고, 서버가 키를 정해진 뜻 문장으로
 * 바꿔 AI 에게 준다. 빈 글 = 엔트리 단위의 기본값(개인 = team · 팀 · 그 외 = blank) — 세 줄이 빈 개인 · 팀 대회는
 * 잠긴 옛 지시문 그대로(labFix4PromptLocks.test.ts). "비워 두기"면 AI 가 무엇을 적든 서버가 둘째 줄을 비운다
 * (잠긴 팀 지시문은 소속사를 채운다 — 지시문은 건드리지 않고 그물로).
 */
import { describe, expect, it, vi } from "vitest";
import {
  EXTRA_MEANING,
  EXTRA_OPTIONS,
  briefRuleLines,
  defaultExtraFor,
  extraIsBlank,
  parseAiBrief,
  usesBriefPrompt,
} from "../core/aiBrief";
import { aiFillCore, buildPrompt } from "../core/aiFillCore";
import { extractContestantsCore, buildTeamExtractPrompt, type ExtractItem } from "../core/extractContestantsCore";
import { buildSuggestBriefPrompt, parseSuggestedBrief } from "../core/aiSuggestBriefCore";

const EMPTY = { entry: "", extra: "", rules: "" };

function fillReply(n: number, affiliation: string): string {
  return JSON.stringify(
    Array.from({ length: n }, (_, i) => ({ name: `P${i + 1}`, nationality: "KR", affiliation, imageSearchKeyword: `p${i + 1} kpop` })),
  );
}

describe("목록 7개 → 뜻 문장", () => {
  it("키 7개 · 모두 뜻 문장이 있다", () => {
    expect(EXTRA_OPTIONS).toEqual(["team", "artist", "actor", "work", "maker", "channel", "blank"]);
    for (const o of EXTRA_OPTIONS) expect(EXTRA_MEANING[o].length).toBeGreaterThan(5);
  });
  it("소속 (팀) — 소속사(회사)는 적지 않는다", () => {
    expect(EXTRA_MEANING.team).toContain("소속사(회사)는 적지 않는다");
  });
  it("키를 고르면 맨 위 규칙 줄이 그 뜻 문장이 된다(키 글자 자체는 보내지 않는다)", () => {
    const text = briefRuleLines({ entry: "노래 제목", extra: "artist", rules: "" }, "other").join("\n");
    expect(text).toContain(`- 덧붙이는 정보(affiliation): ${EXTRA_MEANING.artist}`);
    expect(text).not.toMatch(/\bartist\b/);
  });
  it("빈 글이면 단위의 기본값 뜻(개인 = 소속 (팀) · 팀 · 그 외 = 비워 두기)", () => {
    expect(briefRuleLines({ ...EMPTY, rules: "x" }, "individual").join("\n")).toContain(EXTRA_MEANING.team);
    expect(briefRuleLines({ ...EMPTY, rules: "x" }, "group").join("\n")).toContain(EXTRA_MEANING.blank);
    expect(briefRuleLines(EMPTY, "other").join("\n")).toContain(EXTRA_MEANING.blank);
  });
  it("옛 자유 글은 지금처럼 그대로(백필 없음)", () => {
    expect(briefRuleLines({ entry: "배역", extra: "배우와 드라마 제목", rules: "" }, "other").join("\n")).toContain(
      "덧붙이는 정보(affiliation)는 배우와 드라마 제목이다",
    );
  });
});

describe("기본값은 옛 지시문을 바꾸지 않는다", () => {
  it("단위별 기본값", () => {
    expect(defaultExtraFor("individual")).toBe("team");
    expect(defaultExtraFor("group")).toBe("blank");
    expect(defaultExtraFor("other")).toBe("blank");
  });
  it("개인 + team · 팀 + blank 만 고른 대회 = 옛 지시문", () => {
    expect(usesBriefPrompt({ ...EMPTY, extra: "team" }, "individual")).toBe(false);
    expect(usesBriefPrompt({ ...EMPTY, extra: "blank" }, "group")).toBe(false);
    const opts = { title: "최고의 무대", category: "KPOP", count: 48 };
    expect(buildPrompt({ ...opts, aiBrief: { ...EMPTY, extra: "team" } })).toBe(buildPrompt(opts));
    expect(buildPrompt({ ...opts, entryUnit: "group", aiBrief: { ...EMPTY, extra: "blank" } })).toBe(
      buildPrompt({ ...opts, entryUnit: "group" }),
    );
  });
  it("기본값이 아닌 값을 고르면 새 지시문", () => {
    expect(usesBriefPrompt({ ...EMPTY, extra: "blank" }, "individual")).toBe(true);
    expect(usesBriefPrompt({ ...EMPTY, extra: "channel" }, "group")).toBe(true);
  });
  it("parseAiBrief 는 키를 그대로 받는다", () => {
    expect(parseAiBrief({ extra: " maker " })).toEqual({ ...EMPTY, extra: "maker" });
  });
});

describe('"비워 두기" 서버 그물', () => {
  it("extraIsBlank — 빈 글 + 팀/그 외, 또는 blank", () => {
    expect(extraIsBlank(EMPTY, "group")).toBe(true);
    expect(extraIsBlank(EMPTY, "other")).toBe(true);
    expect(extraIsBlank(EMPTY, "individual")).toBe(false);
    expect(extraIsBlank({ ...EMPTY, extra: "blank" }, "individual")).toBe(true);
    expect(extraIsBlank({ ...EMPTY, extra: "artist" }, "other")).toBe(false);
    expect(extraIsBlank({ ...EMPTY, extra: "배우와 드라마 제목" }, "other")).toBe(false);
  });
  it("명단 채우기 — 잠긴 팀 지시문이 소속사를 채워도 48칸 모두 빈칸", async () => {
    const createMessage = vi.fn(async () => fillReply(51, "HYBE"));
    const out = await aiFillCore({ uid: "u", title: "최고의 그룹", category: "KPOP", entryUnit: "group" }, { createMessage });
    expect(createMessage.mock.calls[0][0]).toBe(buildPrompt({ title: "최고의 그룹", category: "KPOP", count: 48, entryUnit: "group", aiBrief: EMPTY, description: "", keywords: [], existing: [] }));
    expect(out).toHaveLength(48);
    expect(out.every((c) => (c.affiliation ?? "") === "")).toBe(true);
  });
  it("명단 채우기 — 개인 기본값(소속 (팀))은 그대로 둔다", async () => {
    const out = await aiFillCore({ uid: "u", title: "t", category: "KPOP" }, { createMessage: async () => fillReply(51, "aespa") });
    expect(out.every((c) => c.affiliation === "aespa")).toBe(true);
  });
  it("명단 채우기 — 가수를 고르면 그대로 둔다", async () => {
    const out = await aiFillCore(
      { uid: "u", title: "t", category: "KPOP", entryUnit: "other", aiBrief: { entry: "노래 제목", extra: "artist", rules: "" } },
      { createMessage: async () => fillReply(51, "IU") },
    );
    expect(out.every((c) => c.affiliation === "IU")).toBe(true);
  });
  it("링크 제목 읽기 — 비워 두기면 둘째 줄을 비운다 · 지시문은 옛것 그대로", async () => {
    const items: ExtractItem[] = [{ videoId: "aaaaaaaaaaa", title: "BTS 'Dynamite' MV", channelTitle: "HYBE LABELS" }];
    const reply = JSON.stringify({ extractions: [{ id: "aaaaaaaaaaa", name: "BTS", affiliation: "HYBE", nationality: "KR", confident: true }] });
    const createMessage = vi.fn(async () => reply);
    const out = await extractContestantsCore({ uid: "u", items, entryUnit: "group" }, { createMessage });
    expect(createMessage.mock.calls[0][0]).toBe(buildTeamExtractPrompt(items));
    expect(out[0]).toMatchObject({ name: "BTS", affiliation: "" });
  });
});

describe("[AI에게 제안 받기] — 덧붙이는 정보는 목록 값 하나만", () => {
  it("지시문이 7개 키와 뜻을 보인다", () => {
    const p = buildSuggestBriefPrompt("올해의 라면", "FOOD", "");
    for (const o of EXTRA_OPTIONS) expect(p).toContain(`"${o}"`);
  });
  it("목록 키는 그대로 받는다", () => {
    expect(parseSuggestedBrief('{"entryUnit":"other","entry":"라면","extra":"maker","rules":""}').extra).toBe("maker");
  });
  it("목록 밖 값이면 버린다(빈 글 = 단위의 기본값)", () => {
    expect(parseSuggestedBrief('{"entryUnit":"other","entry":"라면","extra":"제조사","rules":""}').extra).toBe("");
    expect(parseSuggestedBrief('{"entryUnit":"group","entry":"","extra":123,"rules":""}').extra).toBe("");
  });
});
