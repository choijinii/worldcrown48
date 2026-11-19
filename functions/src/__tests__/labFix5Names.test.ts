/**
 * LAB-FIX-5 §3-1 — 결정 F: 한글 이름은 한국 인물 · 팀에만. 외국 인물 · 팀은 원래 공식 표기(한글로 옮겨 적지 않는다).
 *
 * 세 줄이 있을 때 쓰는 새 지시문 셋(명단 채우기 · 링크 제목 읽기 · 이름 3언어)에 같은 문장이 들어간다.
 * 세 줄이 빈 옛 지시문은 labFix4PromptLocks · extractContestantsCore 의 sha256 잠금 그대로(TEST1 = 로마자 · 이미 F 와 같다).
 */
import { describe, expect, it, vi } from "vitest";
import { NAME_SCRIPT_RULE } from "../core/aiBrief";
import { buildPrompt } from "../core/aiFillCore";
import { buildBriefExtractPrompt, type ExtractItem } from "../core/extractContestantsCore";
import { buildBriefNamesPrompt, translateContestantNamesCore } from "../core/translateContestantNamesCore";
import { buildImageQuery } from "../core/imageSearchCore";
import { normalizeNameKey } from "../core/parseContestants";

const beautyBrief = {
  entry: "여성 뷰티 크리에이터 (활동명)",
  extra: "",
  rules: "2026년에 활동한 여성만. 한 사람은 한 번만 넣는다(본명과 활동명을 따로 넣지 않는다). 실제로 확인되는 인물만.",
};
const fill = (aiBrief = beautyBrief) =>
  buildPrompt({ title: "TEST2-2026년 세계적인 여성 뷰티크리에이터", category: "CREATOR", count: 48, entryUnit: "individual", aiBrief });
const items: ExtractItem[] = [{ videoId: "aaaaaaaaaaa", title: "Lisa Eldridge 리사 엘드리지 makeup", channelTitle: "Lisa Eldridge" }];

describe("결정 F 문장", () => {
  it("한국 인물 · 팀 = 한글 · 외국 인물 · 팀 = 원래 공식 표기 · 한글로 옮겨 적지 않음", () => {
    expect(NAME_SCRIPT_RULE).toContain("한국 인물 · 팀");
    expect(NAME_SCRIPT_RULE).toContain("원래 공식 표기");
    expect(NAME_SCRIPT_RULE).toContain("한글로 발음을 옮겨 적지 않는다");
  });
});

describe("새 지시문 셋에 결정 F", () => {
  it("명단 채우기(세 줄) — F 문장이 있고 '사람·팀이면 한글 이름' 은 없다", () => {
    const p = fill();
    expect(p).toContain(NAME_SCRIPT_RULE);
    expect(p).not.toContain("사람·팀이면 **한글 이름**");
  });
  it("명단 채우기(그 외 단위 · 세 줄 빔)도 새 지시문이라 F 문장", () => {
    expect(buildPrompt({ title: "t", category: "C", count: 48, entryUnit: "other" })).toContain(NAME_SCRIPT_RULE);
  });
  it("링크 제목 읽기(세 줄) — F 문장 · '둘 다 있으면 한글' 고정 규칙 없음", () => {
    const p = buildBriefExtractPrompt(items, { tournamentTitle: "t", brief: beautyBrief, entryUnit: "individual" });
    expect(p).toContain(NAME_SCRIPT_RULE);
    expect(p).not.toContain("둘 다 있으면 **한글 표기**를 쓴다");
    expect(p).not.toContain("둘 다 있으면 한글 표기 하나만");
  });
  it("이름 3언어(세 줄) — F 문장", () => {
    expect(buildBriefNamesPrompt([{ name: "이사배" }], "CREATOR", beautyBrief, "individual")).toContain(NAME_SCRIPT_RULE);
  });
});

describe("이름 3언어 — 외국 이름은 ko · en · es 모두 원래 표기(AI 를 부르지 않는다)", () => {
  it.each(["Lisa Eldridge", "Mariand Castrejón Castro", "W-Unit", "NikkieTutorials"])("%s", async (name) => {
    const createMessage = vi.fn(async () => "{}");
    const r = await translateContestantNamesCore(
      { entries: [{ name }], category: "CREATOR", entryUnit: "individual", aiBrief: beautyBrief },
      { createMessage },
    );
    expect(r.nameI18n[0]).toEqual({ ko: name, en: name, es: name });
    expect(createMessage).not.toHaveBeenCalled();
  });
});

describe("이미지 검색어 = 칸의 이름(원래 표기) 그대로", () => {
  it("외국 이름이 원래 표기로 앞에 선다 — 한글로 옮긴 이름이 끼지 않는다", () => {
    const q = buildImageQuery("Lisa Eldridge", "", ["뷰티"]);
    expect(q.startsWith("Lisa Eldridge")).toBe(true);
    expect(q).not.toMatch(/리사|엘드리지/);
  });
});

describe("같은 이름 판정 — 로마자 대소문자 · 띄어쓰기 차이는 같은 이름", () => {
  it.each([
    ["Jenn Im", "jenn im"],
    ["Lisa Eldridge", "LisaEldridge"],
    ["NikkieTutorials", "Nikkie Tutorials"],
    ["Pony", "PONY"],
  ])("%s = %s", (a, b) => {
    expect(normalizeNameKey(a)).toBe(normalizeNameKey(b));
  });
});
