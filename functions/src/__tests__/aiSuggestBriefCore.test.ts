/** LAB-FIX-4 — [AI에게 제안 받기]: 제목 · 설명 · 카테고리 → 엔트리 단위 + 세 줄 **제안**(확정하지 않는다). */
import { describe, expect, it, vi } from "vitest";
import { aiSuggestBriefCore, buildSuggestBriefPrompt, parseSuggestedBrief, SuggestBriefError } from "../core/aiSuggestBriefCore";

describe("buildSuggestBriefPrompt", () => {
  it("제목 · 카테고리 · 설명과 세 줄의 뜻 · 글자 한도를 싣는다", () => {
    const p = buildSuggestBriefPrompt("올해의 노래", "KPOP", "2026 발매곡");
    for (const s of ["올해의 노래", "KPOP", "2026 발매곡", "individual", "group", "other", "40자"]) expect(p).toContain(s);
  });
  // LAB-FIX-7 — 제안이 "엔트리 조건" 칸을 채우지 않는다(대표 2026-11-25). 지시문에 rules 줄도 · 출력 형식의 rules 도 없다.
  it("LAB-FIX-7 지시문에 rules(엔트리 조건) 줄이 없다", () => {
    const p = buildSuggestBriefPrompt("올해의 노래", "KPOP", "2026년에 발매한 곡만");
    expect(p).not.toMatch(/^- rules:/m);
    expect(p).not.toContain("엔트리 조건");
    expect(p).not.toContain('"rules"');
    expect(p).not.toContain("300자");
  });
});

describe("parseSuggestedBrief", () => {
  it("JSON 을 읽고 한도로 자른다 · 모르는 단위는 individual", () => {
    const r = parseSuggestedBrief('머리말 {"entryUnit":"song","entry":"' + "가".repeat(50) + '","extra":"artist","rules":"' + "다".repeat(400) + '"}');
    expect(r.entryUnit).toBe("individual");
    expect(r.entry).toHaveLength(40);
    expect(r.extra).toBe("artist"); // LAB-FIX-6 — 목록 키만(목록 밖은 labFix6ExtraInfo.test.ts)
    expect(r.rules).toBe(""); // LAB-FIX-7 — 모델 답에 rules 가 섞여 와도 버린다
  });
  it("읽을 수 없으면 던진다", () => {
    expect(() => parseSuggestedBrief("모르겠어요")).toThrow(SuggestBriefError);
  });
});

describe("aiSuggestBriefCore", () => {
  it("제목이 없으면 모델을 부르지 않는다", async () => {
    const createMessage = vi.fn(async () => "{}");
    await expect(aiSuggestBriefCore({ uid: "u", title: "", category: "KPOP" }, { createMessage })).rejects.toMatchObject({ reason: "invalid-argument" });
    expect(createMessage).not.toHaveBeenCalled();
  });
  it("모델 응답을 제안으로 돌려준다", async () => {
    const createMessage = vi.fn(async () => '{"entryUnit":"group","entry":"영상에서 춤춘 댄스 크루","extra":"","rules":"원곡 가수는 엔트리가 아니다."}');
    const r = await aiSuggestBriefCore({ uid: "u", title: "올해의 댄스 크루", category: "KPOP", description: "" }, { createMessage });
    expect(r).toEqual({ entryUnit: "group", entry: "영상에서 춤춘 댄스 크루", extra: "", rules: "" });
  });
  it("LAB-FIX-7 모델 답에 rules 가 들어 있어도 결과 rules 는 빈 값", async () => {
    const createMessage = vi.fn(async () => '{"entryUnit":"other","entry":"노래 제목","extra":"artist","rules":"2026년에 발매한 곡만"}');
    const r = await aiSuggestBriefCore({ uid: "u", title: "올해의 노래", category: "KPOP", description: "2026년에 발매한 곡만" }, { createMessage });
    expect(r.rules).toBe("");
    expect(r).toMatchObject({ entryUnit: "other", entry: "노래 제목", extra: "artist" });
  });
});
